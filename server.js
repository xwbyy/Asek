require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

// Middleware
app.use(limiter);
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// File upload setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, 'public', 'assets');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

const databasePath = path.join(__dirname, 'public', 'database.json');

// Initialize database if it doesn't exist
if (!fs.existsSync(databasePath)) {
  fs.writeFileSync(databasePath, JSON.stringify({ 
    users: [], 
    notes: [],
    comments: [],
    likes: [],
    bookmarks: [],
    views: [],
    notifications: [],
    admin: {
      id: "admin123",
      email: "admin@mynotes.com",
      password: bcrypt.hashSync("admin123", 10)
    }
  }, null, 2));
}

// Helper functions
function readDatabase() {
  try {
    const data = fs.readFileSync(databasePath, 'utf8').trim();
    return data ? JSON.parse(data) : initializeEmptyDB();
  } catch (err) {
    console.error('Failed to read database:', err.message);
    return initializeEmptyDB();
  }
}

function initializeEmptyDB() {
  return { 
    users: [], 
    notes: [],
    comments: [],
    likes: [],
    bookmarks: [],
    views: [],
    notifications: [],
    admin: {
      id: "admin123",
      email: "admin@mynotes.com",
      password: bcrypt.hashSync("admin123", 10)
    }
  };
}

function writeDatabase(data) {
  fs.writeFileSync(databasePath, JSON.stringify(data, null, 2));
}

// Auth Middleware
function authenticateUser(req, res, next) {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const db = readDatabase();
  const user = db.users.find(u => u.token === token);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  req.user = user;
  next();
}

// Routes

// Auth Routes
app.post('/api/register', (req, res) => {
  const { name, email, password, bio } = req.body;
  
  // Validation
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  const db = readDatabase();
  
  // Check if email exists
  if (db.users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ error: 'Email already registered' });
  }

  // Create user
  const newUser = {
    id: Date.now().toString(),
    name,
    email: email.toLowerCase(),
    password: bcrypt.hashSync(password, 10),
    bio: bio || '',
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=4a6fa5&color=fff`,
    createdAt: new Date().toISOString(),
    token: generateToken(),
    isSuspended: false
  };

  db.users.push(newUser);
  writeDatabase(db);

  // Don't return password
  const { password: _, ...userWithoutPassword } = newUser;
  res.status(201).json(userWithoutPassword);
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const db = readDatabase();
  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  if (user.isSuspended) {
    return res.status(403).json({ error: 'Account suspended' });
  }

  // Generate new token on login
  user.token = generateToken();
  writeDatabase(db);

  const { password: _, ...userWithoutPassword } = user;
  res.json(userWithoutPassword);
});

// User Routes
app.get('/api/users', (req, res) => {
  const db = readDatabase();
  res.json(db.users.map(user => ({
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    bio: user.bio,
    createdAt: user.createdAt
  })));
});

app.get('/api/users/:id', (req, res) => {
  const db = readDatabase();
  const user = db.users.find(u => u.id === req.params.id);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  const { password, token, ...userData } = user;
  res.json(userData);
});

app.put('/api/users/:id', authenticateUser, upload.single('avatar'), (req, res) => {
  const { id } = req.params;
  const { name, bio, removeAvatar } = req.body;
  const avatar = req.file;

  const db = readDatabase();
  const userIndex = db.users.findIndex(u => u.id === id);

  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Only allow users to edit their own profile
  if (req.user.id !== id) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const updatedUser = {
    ...db.users[userIndex],
    name: name || db.users[userIndex].name,
    bio: bio !== undefined ? bio : db.users[userIndex].bio,
    avatar: avatar ? `/assets/${avatar.filename}` : 
           removeAvatar === 'true' ? `https://ui-avatars.com/api/?name=${encodeURIComponent(name || db.users[userIndex].name)}&background=4a6fa5&color=fff` : 
           db.users[userIndex].avatar
  };

  db.users[userIndex] = updatedUser;
  writeDatabase(db);

  const { password: _, ...userWithoutPassword } = updatedUser;
  res.json(userWithoutPassword);
});

// Note Routes
app.get('/api/notes/public', (req, res) => {
  const db = readDatabase();
  const publicNotes = db.notes.filter(note => note.isPublic && !db.users.find(u => u.id === note.userId)?.isSuspended);
  
  const notesWithStats = publicNotes.map(note => ({
    ...note,
    views: db.views.filter(v => v.noteId === note.id).length,
    likes: db.likes.filter(l => l.noteId === note.id).length,
    comments: db.comments.filter(c => c.noteId === note.id).length
  }));
  
  res.json(notesWithStats);
});

app.get('/api/notes/user/:userId', (req, res) => {
  const db = readDatabase();
  const userNotes = db.notes.filter(note => note.userId === req.params.userId);
  
  const notesWithStats = userNotes.map(note => ({
    ...note,
    views: db.views.filter(v => v.noteId === note.id).length,
    likes: db.likes.filter(l => l.noteId === note.id).length,
    comments: db.comments.filter(c => c.noteId === note.id).length
  }));
  
  res.json(notesWithStats);
});

app.post('/api/notes', authenticateUser, upload.single('image'), (req, res) => {
  const { title, content, isPublic } = req.body;
  
  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required' });
  }

  const db = readDatabase();
  const newNote = {
    id: Date.now().toString(),
    title,
    content,
    userId: req.user.id,
    isPublic: !!isPublic,
    image: req.file ? `/assets/${req.file.filename}` : null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.notes.push(newNote);
  writeDatabase(db);

  res.status(201).json(newNote);
});

// Other routes (likes, comments, bookmarks, etc.) remain similar to original
// ... (implement the rest of your routes here)

// Admin Routes
app.post('/api/admin/login', (req, res) => {
  const { email, password } = req.body;
  const db = readDatabase();
  
  if (email === db.admin.email && bcrypt.compareSync(password, db.admin.password)) {
    const token = generateToken();
    db.admin.token = token;
    writeDatabase(db);
    
    res.json({ 
      success: true,
      token,
      admin: {
        id: db.admin.id,
        email: db.admin.email
      }
    });
  } else {
    res.status(403).json({ error: 'Unauthorized' });
  }
});

// Helper function to generate tokens
function generateToken() {
  return require('crypto').randomBytes(32).toString('hex');
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});