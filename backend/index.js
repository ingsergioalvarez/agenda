const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./db');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';

function authRequired(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  const token = auth.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

app.post('/auth/register', async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
  const existing = await db.query('SELECT id FROM users WHERE email = ?', [email]);
  if (existing.length) return res.status(400).json({ error: 'Email exists' });
  const hash = await bcrypt.hash(password, 10);
  const result = await db.query('INSERT INTO users (name,email,password,role) VALUES (?,?,?,?)', [name || '', email, hash, role || 'user']);
  res.json({ id: result.insertId, email });
});

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const rows = await db.query('SELECT id,name,email,password,role FROM users WHERE email = ?', [email]);
  if (!rows.length) return res.status(400).json({ error: 'Invalid credentials' });
  const user = rows[0];
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(400).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '12h' });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
});

// List events for user
app.get('/events', authRequired, async (req, res) => {
  const userId = req.user.id;
  // Fetch events where user is a participant
  const events = await db.query(
    `SELECT e.* FROM events e
     JOIN event_participants p ON p.event_id = e.id
     WHERE p.user_id = ?`,
    [userId]
  );
  res.json(events);
});

// Create event: checks conflicts for participants (internal users only)
app.post('/events', authRequired, async (req, res) => {
  const { title, start_time, end_time, participants = [], description = '', anonymous = 0 } = req.body;
  const ownerId = req.user.id;
  if (!title || !start_time || !end_time) return res.status(400).json({ error: 'Missing fields' });

  if (new Date(start_time) >= new Date(end_time)) {
    return res.status(400).json({ error: 'La hora de fin debe ser posterior a la de inicio' });
  }

  // Filter internal users for conflict check
  // participants is now an array of objects: { type: 'user'|'guest'|'new', id?, email?, name? }
  const internalUserIds = [ownerId];
  const guestsToProcess = [];

  for (const p of participants) {
    if (p.type === 'user') {
      internalUserIds.push(p.id);
    } else {
      guestsToProcess.push(p);
    }
  }

  // Conflict check for internal users
  const uniqueInternalIds = [...new Set(internalUserIds)];
  for (const uid of uniqueInternalIds) {
    const conflicts = await db.query(
      `SELECT e.id FROM events e
       JOIN event_participants p ON p.event_id = e.id
       WHERE p.user_id = ? AND NOT (e.end_time <= ? OR e.start_time >= ?)`,
      [uid, start_time, end_time]
    );
    if (conflicts.length) return res.status(409).json({ error: `Conflict for user ID ${uid}` });
  }

  const result = await db.query('INSERT INTO events (title,start_time,end_time,owner_id,description,anonymous) VALUES (?,?,?,?,?,?)', [title, start_time, end_time, ownerId, description, anonymous ? 1 : 0]);
  const eventId = result.insertId;

  // Add owner
  await db.query('INSERT INTO event_participants (event_id,user_id,role) VALUES (?,?,?)', [eventId, ownerId, 'owner']);

  // Add internal participants
  for (const p of participants) {
    if (p.type === 'user') {
      // Avoid adding owner twice if they selected themselves (unlikely but possible)
      if (p.id !== ownerId) {
        await db.query('INSERT INTO event_participants (event_id,user_id,role) VALUES (?,?,?)', [eventId, p.id, 'participant']);
      }
    }
  }

  // Process guests (external or new)
  for (const g of guestsToProcess) {
    let guestId = g.id;
    if (g.type === 'new') {
      // Check if exists in external_guests
      const existing = await db.query('SELECT id FROM external_guests WHERE email = ?', [g.email]);
      if (existing.length) {
        guestId = existing[0].id;
      } else {
        // Create new guest
        const newGuest = await db.query('INSERT INTO external_guests (email, name) VALUES (?,?)', [g.email, g.name || g.email]);
        guestId = newGuest.insertId;
      }
    }
    // Link to event
    if (guestId) {
      await db.query('INSERT INTO event_guests (event_id, guest_id) VALUES (?,?)', [eventId, guestId]);
    }
  }

  res.json({ id: eventId });
});

// Invite a user to event; can mark invite as anonymous (recipient sees limited info)
app.post('/events/:id/invite', authRequired, async (req, res) => {
  const from = req.user.id;
  const eventId = req.params.id;
  const { to_user_id, anonymous = 0 } = req.body;
  // simple permission: only event owner can invite
  const owners = await db.query('SELECT owner_id FROM events WHERE id = ?', [eventId]);
  if (!owners.length) return res.status(404).json({ error: 'Event not found' });
  if (owners[0].owner_id !== from && req.user.role !== 'admin') return res.status(403).json({ error: 'Not allowed' });
  // check conflict
  const ev = await db.query('SELECT start_time,end_time FROM events WHERE id = ?', [eventId]);
  const { start_time, end_time } = ev[0];
  const conflicts = await db.query(
    `SELECT e.id FROM events e JOIN event_participants p ON p.event_id = e.id
     WHERE p.user_id = ? AND NOT (e.end_time <= ? OR e.start_time >= ?)`,
    [to_user_id, start_time, end_time]
  );
  if (conflicts.length) return res.status(409).json({ error: 'User has a conflict' });
  await db.query('INSERT INTO invites (event_id,from_user,to_user,anonymous,status) VALUES (?,?,?,?,?)', [eventId, from, to_user_id, anonymous ? 1 : 0, 'pending']);
  res.json({ ok: true });
});

// Get invites for current user (if anonymous, limit event info)
app.get('/invites', authRequired, async (req, res) => {
  const userId = req.user.id;
  const invites = await db.query('SELECT i.*, e.title, e.start_time, e.end_time, e.anonymous FROM invites i JOIN events e ON e.id = i.event_id WHERE i.to_user = ?', [userId]);
  const sanitized = invites.map(i => {
    if (i.anonymous) return { id: i.id, event_id: i.event_id, status: i.status, from_user: i.from_user, note: 'Evento privado' };
    return i;
  });
  res.json(sanitized);
});

// Respond to invite
app.post('/invites/:id/response', authRequired, async (req, res) => {
  const inviteId = req.params.id;
  const { status } = req.body;
  const userId = req.user.id;
  if (!['accepted', 'rejected'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  const invites = await db.query('SELECT event_id FROM invites WHERE id = ? AND to_user = ?', [inviteId, userId]);
  if (!invites.length) return res.status(404).json({ error: 'Invite not found' });
  if (status === 'accepted') {
    const eventId = invites[0].event_id;
    await db.query('INSERT INTO event_participants (event_id,user_id,role) VALUES (?,?,?)', [eventId, userId, 'participant']);
  }
  await db.query('UPDATE invites SET status = ? WHERE id = ?', [status, inviteId]);
  res.json({ ok: true });
});

// Admin: List users
app.get('/admin/users', authRequired, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Not admin' });
  const users = await db.query('SELECT id,name,email,role,is_active FROM users');
  res.json(users);
});

// Admin: Create user
app.post('/admin/users', authRequired, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Not admin' });
  const { name, email, password, role } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });

  const existing = await db.query('SELECT id FROM users WHERE email = ?', [email]);
  if (existing.length) return res.status(400).json({ error: 'Email exists' });

  const hash = await bcrypt.hash(password, 10);
  await db.query('INSERT INTO users (name,email,password,role,is_active) VALUES (?,?,?,?, 1)', [name || '', email, hash, role || 'user']);
  res.json({ ok: true });
});

// Search users for autocomplete (includes external guests)
app.get('/users/search', authRequired, async (req, res) => {
  const q = req.query.q;
  if (!q || q.length < 2) return res.json([]);

  // Search internal users
  const users = await db.query(
    'SELECT id, name, email FROM users WHERE (name LIKE ? OR email LIKE ?) AND id != ? LIMIT 20',
    [`%${q}%`, `%${q}%`, req.user.id]
  );

  // Search external guests
  const guests = await db.query(
    'SELECT id, name, email FROM external_guests WHERE (name LIKE ? OR email LIKE ?) LIMIT 20',
    [`%${q}%`, `%${q}%`]
  );

  // Combine and map
  const results = [
    ...users.map(u => ({ ...u, type: 'user' })),
    ...guests.map(g => ({ ...g, type: 'guest' }))
  ];

  res.json(results);
});

// Admin: Update user role
app.put('/admin/users/:id/role', authRequired, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Not admin' });
  const { role } = req.body;
  if (!['user', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  await db.query('UPDATE users SET role = ? WHERE id = ?', [role, req.params.id]);
  res.json({ ok: true });
});

// Admin: Toggle user active status
app.put('/admin/users/:id/status', authRequired, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Not admin' });
  const { is_active } = req.body; // Expect boolean (true/false) or 1/0
  await db.query('UPDATE users SET is_active = ? WHERE id = ?', [is_active ? 1 : 0, req.params.id]);
  res.json({ ok: true });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log('Backend listening on', PORT));
