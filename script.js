const socket = io();
let currentUser = null;
let currentStoryId = null;
let storyWords = [];
let replayIndex = 0;
let isReplaying = false;

document.getElementById('signup').addEventListener('click', async () => {
  const username = document.getElementById('username').value;
  const pin = document.getElementById('pin').value;
  const res = await fetch('/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, pin })
  });
  const data = await res.json();
  document.getElementById('authMessage').textContent = data.error || 'Signed up successfully';
  if (data.success) {
    currentUser = username;
    showScreen('menu');
    document.getElementById('user').textContent = username;
  }
});

document.getElementById('loginBtn').addEventListener('click', async () => {
  const username = document.getElementById('username').value;
  const pin = document.getElementById('pin').value;
  const res = await fetch('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, pin })
  });
  const data = await res.json();
  document.getElementById('authMessage').textContent = data.error || 'Logged in successfully';
  if (data.success) {
    currentUser = username;
    showScreen('menu');
    document.getElementById('user').textContent = username;
  }
});

document.getElementById('createStory').addEventListener('click', async () => {
  const title = document.getElementById('storyTitle').value;
  if (!title) return;
  const res = await fetch('/stories/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, username: currentUser })
  });
  const data = await res.json();
  if (data.storyId) {
    currentStoryId = data.storyId;
    joinStory();
  } else {
    document.getElementById('menuMessage').textContent = data.error;
  }
});

document.getElementById('joinStory').addEventListener('click', async () => {
  const storyId = document.getElementById('storyId').value;
  if (!storyId) return;
  const res = await fetch('/stories/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ storyId, username: currentUser })
  });
  const data = await res.json();
  if (data.success) {
    currentStoryId = storyId;
    joinStory();
  } else {
    document.getElementById('menuMessage').textContent = data.error;
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
  const data = await res.json();
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