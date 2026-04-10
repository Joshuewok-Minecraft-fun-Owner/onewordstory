const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const path = require('path');

const adapter = new JSONFile('db.json');
const db = new Low(adapter);

async function initDB() {
  await db.read();
  db.data ||= { users: [], stories: [] };
  await db.write();
}

initDB();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Routes

app.post('/signup', async (req, res) => {
  const { username, pin } = req.body;
  if (!username || !pin) return res.status(400).json({ error: 'Username and PIN required' });
  const user = db.data.users.find(u => u.username === username);
  if (user) return res.status(400).json({ error: 'Username already exists' });
  const pinHash = await bcrypt.hash(pin, 10);
  db.data.users.push({ username, pinHash });
  await db.write();
  res.json({ success: true });
});

app.post('/login', async (req, res) => {
  const { username, pin } = req.body;
  if (!username || !pin) return res.status(400).json({ error: 'Username and PIN required' });
  const user = db.data.users.find(u => u.username === username);
  if (!user || !(await bcrypt.compare(pin, user.pinHash))) return res.status(401).json({ error: 'Invalid credentials' });
  res.json({ success: true, username });
});

app.post('/stories/create', async (req, res) => {
  const { title, username } = req.body;
  if (!title || !username) return res.status(400).json({ error: 'Title and username required' });
  const user = db.data.users.find(u => u.username === username);
  if (!user) return res.status(401).json({ error: 'User not found' });
  const id = Date.now().toString();
  const story = { id, title, participants: [username], words: [], currentTurn: 0, status: 'active' };
  db.data.stories.push(story);
  await db.write();
  res.json({ storyId: id });
});

app.post('/stories/join', async (req, res) => {
  const { storyId, username } = req.body;
  if (!storyId || !username) return res.status(400).json({ error: 'Story ID and username required' });
  const user = db.data.users.find(u => u.username === username);
  if (!user) return res.status(401).json({ error: 'User not found' });
  const story = db.data.stories.find(s => s.id === storyId);
  if (!story) return res.status(404).json({ error: 'Story not found' });
  if (story.participants.includes(username)) return res.json({ success: true });
  if (story.participants.length >= 10) return res.status(400).json({ error: 'Story full' });
  story.participants.push(username);
  await db.write();
  res.json({ success: true });
});

app.get('/export/:id', (req, res) => {
  const story = db.data.stories.find(s => s.id === req.params.id);
  if (!story) return res.status(404).json({ error: 'Story not found' });
  const text = story.words.join(' ');
  res.json({ story: text });
});

app.get('/stats/:id', (req, res) => {
  const story = db.data.stories.find(s => s.id === req.params.id);
  if (!story) return res.status(404).json({ error: 'Story not found' });
  res.json({
    title: story.title,
    participants: story.participants.length,
    words: story.words.length,
    currentTurn: story.participants[story.currentTurn]
  });
});

// Socket.IO

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('joinStory', ({ storyId, username }) => {
    const story = db.data.stories.find(s => s.id === storyId);
    if (!story || !story.participants.includes(username)) return;
    socket.join(storyId);
    socket.emit('storyUpdate', { words: story.words, currentTurn: story.participants[story.currentTurn] });
  });

  socket.on('sendWord', async ({ storyId, word, username }) => {
    const story = db.data.stories.find(s => s.id === storyId);
    if (!story || story.participants[story.currentTurn] !== username) return;
    story.words.push(word);
    story.currentTurn = (story.currentTurn + 1) % story.participants.length;
    await db.write();
    io.to(storyId).emit('storyUpdate', { words: story.words, currentTurn: story.participants[story.currentTurn] });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});