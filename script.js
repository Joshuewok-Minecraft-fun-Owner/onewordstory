const API_BASE = ''; // Set this to your backend URL if the API is hosted separately.
const socket = io(API_BASE || window.location.origin);
let currentUser = null;
let currentStoryId = null;
let storyWords = [];
let replayIndex = 0;
let isReplaying = false;

function apiUrl(path) {
  return `${API_BASE || ''}${path}`;
}

socket.on('connect', () => {
  console.log('Connected to backend');
});

socket.on('connect_error', (error) => {
  console.error('Socket connection failed:', error);
  showMessage('authMessage', 'Backend connection failed. You need a running API server.');
});

socket.on('disconnect', () => {
  console.warn('Socket disconnected');
});

function showMessage(id, message) {
  document.getElementById(id).textContent = message || '';
}

async function fetchJson(url, options) {
  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || res.statusText || 'Request failed');
    }
    return await res.json();
  } catch (error) {
    throw new Error(error.message || 'Network error');
  }
}

document.getElementById('signup').addEventListener('click', async () => {
  showMessage('authMessage', '');
  const username = document.getElementById('username').value.trim();
  const pin = document.getElementById('pin').value.trim();
  if (!username || !pin) {
    return showMessage('authMessage', 'Username and PIN are required');
  }

  try {
    const data = await fetchJson(apiUrl('/signup'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, pin })
    });
    showMessage('authMessage', 'Signed up successfully');
    currentUser = username;
    showScreen('menu');
    document.getElementById('user').textContent = username;
  } catch (error) {
    showMessage('authMessage', error.message);
  }
});

document.getElementById('loginBtn').addEventListener('click', async () => {
  showMessage('authMessage', '');
  const username = document.getElementById('username').value.trim();
  const pin = document.getElementById('pin').value.trim();
  if (!username || !pin) {
    return showMessage('authMessage', 'Username and PIN are required');
  }

  try {
    const data = await fetchJson(apiUrl('/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, pin })
    });
    showMessage('authMessage', 'Logged in successfully');
    currentUser = username;
    showScreen('menu');
    document.getElementById('user').textContent = username;
  } catch (error) {
    showMessage('authMessage', error.message);
  }
});

document.getElementById('createStory').addEventListener('click', async () => {
  showMessage('menuMessage', '');
  const title = document.getElementById('storyTitle').value.trim();
  if (!title) return showMessage('menuMessage', 'Story title is required');
  if (!currentUser) return showMessage('menuMessage', 'Please log in first');

  try {
    const data = await fetchJson(apiUrl('/stories/create'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, username: currentUser })
    });
    currentStoryId = data.storyId;
    joinStory();
  } catch (error) {
    showMessage('menuMessage', error.message);
  }
});

document.getElementById('joinStory').addEventListener('click', async () => {
  showMessage('menuMessage', '');
  const storyId = document.getElementById('storyId').value.trim();
  if (!storyId) return showMessage('menuMessage', 'Story ID is required');
  if (!currentUser) return showMessage('menuMessage', 'Please log in first');

  try {
    const data = await fetchJson(apiUrl('/stories/join'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storyId, username: currentUser })
    });
    currentStoryId = storyId;
    joinStory();
  } catch (error) {
    showMessage('menuMessage', error.message);
  }
});

function joinStory() {
  socket.emit('joinStory', { storyId: currentStoryId, username: currentUser });
  showScreen('game');
  document.getElementById('storyTitleDisplay').textContent = 'Loading...';
}

document.getElementById('sendWord').addEventListener('click', () => {
  const word = document.getElementById('wordInput').value.trim();
  if (!word) return;
  if (!currentStoryId || !currentUser) {
    return showMessage('gameMessage', 'Join a story first');
  }
  socket.emit('sendWord', { storyId: currentStoryId, word, username: currentUser });
  document.getElementById('wordInput').value = '';
});

document.getElementById('replay').addEventListener('click', () => {
  if (isReplaying) {
    isReplaying = false;
    updateStoryDisplay();
    document.getElementById('replay').textContent = 'Replay';
  } else {
    isReplaying = true;
    replayIndex = 0;
    updateReplay();
    document.getElementById('replay').textContent = 'Stop Replay';
  }
});

document.getElementById('export').addEventListener('click', async () => {
  const res = await fetch(`/export/${currentStoryId}`);
  const data = await res.json();  const API_BASE = 'https://onewordstory.pages.dev/';
  if (data.story) {
    const blob = new Blob([data.story], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'story.txt';
    a.click();
  }
});

document.getElementById('stats').addEventListener('click', async () => {
  const res = await fetch(`/stats/${currentStoryId}`);
  const data = await res.json();
  alert(`Title: ${data.title}\nParticipants: ${data.participants}\nWords: ${data.words}\nCurrent Turn: ${data.currentTurn}`);
});

document.getElementById('backToMenu').addEventListener('click', () => {
  showScreen('menu');
  currentStoryId = null;
  storyWords = [];
  isReplaying = false;
});

socket.on('storyUpdate', (data) => {
  storyWords = data.words;
  if (!isReplaying) {
    updateStoryDisplay();
  }
  document.getElementById('turnIndicator').textContent = `Current turn: ${data.currentTurn}`;
  // Fetch title if not set
  if (document.getElementById('storyTitleDisplay').textContent === 'Loading...') {
    fetch(`/stats/${currentStoryId}`).then(res => res.json()).then(stats => {
      document.getElementById('storyTitleDisplay').textContent = stats.title;
    });
  }
});

function updateStoryDisplay() {
  document.getElementById('storyDisplay').textContent = storyWords.join(' ');
}

function updateReplay() {
  if (!isReplaying || replayIndex >= storyWords.length) {
    isReplaying = false;
    document.getElementById('replay').textContent = 'Replay';
    updateStoryDisplay();
    return;
  }
  document.getElementById('storyDisplay').textContent = storyWords.slice(0, replayIndex + 1).join(' ');
  replayIndex++;
  setTimeout(updateReplay, 1000);
}

function showScreen(screen) {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  document.getElementById(screen).classList.remove('hidden');
}