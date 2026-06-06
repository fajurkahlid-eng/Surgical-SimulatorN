import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { query } from './db.js';
import {
  hashPassword,
  verifyPassword,
  needsRehash,
  signToken,
  requireAuth,
  requireInstructor,
} from './auth.js';

const app = express();
app.use(cors());
app.use(express.json());

function publicUserRow(row) {
  if (!row) return null;
  const { Password: _p, ...rest } = row;
  return rest;
}

// Auth: Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, specialty, priorSimulationExperience, unityUnrealExperience } = req.body;
    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ error: 'Name, email and password required' });
    }
    const existing = await query('SELECT TraineeID FROM TRAINEES WHERE Email = ?', [email.trim()]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    const hashed = await hashPassword(password);
    await query(
      'INSERT INTO TRAINEES (Name, Email, Password, Progress, Specialty, Role) VALUES (?, ?, ?, 0, ?, ?)',
      [name.trim(), email.trim(), hashed, specialty?.trim() || null, 'trainee']
    );
    const [row] = await query(
      'SELECT TraineeID, Name, Email, Specialty, Role FROM TRAINEES WHERE Email = ?',
      [email.trim()]
    );
    const token = signToken({
      traineeId: row.TraineeID,
      role: row.Role ?? 'trainee',
      email: row.Email,
    });
    res.json({ token, ...publicUserRow(row) });
  }
  
catch (err) {
  console.error('[register]', err);
  res.status(500).json({ error: 'Registration failed: ' + err.message }); // أضفنا err.message هنا
}

  
});

// Auth: Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email?.trim() || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    const rows = await query(
      'SELECT TraineeID, Name, Email, Password, Specialty, Role FROM TRAINEES WHERE Email = ?',
      [email.trim()]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const row = rows[0];
    const ok = await verifyPassword(password, row.Password);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = signToken({
      traineeId: row.TraineeID,
      role: row.Role ?? 'trainee',
      email: row.Email,
    });
    res.json({ token, ...publicUserRow(row) });
  } catch (err) {
    console.error('[login]', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

// دالة بناء الجداول
async function ensureTables() {
  try {
    console.log("جاري التأكد من وجود الجداول...");
    await query(`
      CREATE TABLE IF NOT EXISTS TRAINEES (
        TraineeID INT AUTO_INCREMENT PRIMARY KEY,
        Name VARCHAR(255) NOT NULL,
        Email VARCHAR(255) UNIQUE NOT NULL,
        Password VARCHAR(255) NOT NULL,
        Progress FLOAT DEFAULT 0,
        Specialty VARCHAR(255),
        Role VARCHAR(50) DEFAULT 'trainee'
      )
    `);
    console.log("تم التأكد من وجود الجداول بنجاح.");
  } catch (err) {
    console.error("خطأ في إنشاء الجداول:", err);
  }
}

// تشغيل السيرفر
ensureTables().then(() => {
  app.listen(config.port, () => {
    console.log(`Surgical Training API running on port ${config.port}`);
  });
});
