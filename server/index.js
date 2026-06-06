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

// =========================================================================
// AUTHENTICATION ENDPOINTS
// =========================================================================

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
      'INSERT INTO TRAINEES (Name, Email, Password, Progress, Specialty, PriorSimulationExperience, UnityUnrealExperience, Role) VALUES (?, ?, ?, 0, ?, ?, ?, ?)',
      [name.trim(), email.trim(), hashed, specialty?.trim() || null, priorSimulationExperience || null, unityUnrealExperience || null, 'trainee']
    );
    
    const [row] = await query(
      'SELECT TraineeID, Name, Email, Specialty, PriorSimulationExperience, UnityUnrealExperience, Role FROM TRAINEES WHERE Email = ?',
      [email.trim()]
    );
    const token = signToken({
      traineeId: row.TraineeID,
      role: row.Role ?? 'trainee',
      email: row.Email,
    });
    res.json({ token, ...publicUserRow(row) });
  } catch (err) {
    console.error('[register]', err);
    res.status(500).json({ error: 'Registration failed: ' + err.message }); 
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
      'SELECT TraineeID, Name, Email, Password, Specialty, PriorSimulationExperience, UnityUnrealExperience, Role FROM TRAINEES WHERE Email = ?',
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
    
    if (needsRehash(row.Password)) {
      const hashed = await hashPassword(password);
      await query('UPDATE TRAINEES SET Password = ? WHERE TraineeID = ?', [hashed, row.TraineeID]);
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

// Current user (JWT)
app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const rows = await query(
      'SELECT TraineeID, Name, Email, Specialty, PriorSimulationExperience, UnityUnrealExperience, Role FROM TRAINEES WHERE TraineeID = ?',
      [req.auth.traineeId]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }
    res.json(publicUserRow(rows[0]));
  } catch (err) {
    console.error('[me]', err);
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

// Check email exists
app.get('/api/auth/check-email', async (req, res) => {
  try {
    const { email } = req.query;
    const rows = await query('SELECT TraineeID FROM TRAINEES WHERE Email = ?', [email]);
    res.json({ exists: rows.length > 0 });
  } catch (err) {
    console.error('[check-email]', err);
    res.status(500).json({ error: 'Check failed' });
  }
});

// =========================================================================
// SESSIONS & REPORTS ENDPOINTS
// =========================================================================

// Create session
app.post('/api/sessions', requireAuth, async (req, res) => {
  try {
    const traineeId = req.auth.traineeId;
    const { courseId, difficulty } = req.body;
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date().toTimeString().slice(0, 8);
    const diff = ['beginner', 'intermediate', 'advanced'].includes(difficulty) ? difficulty : 'intermediate';
    await query(
      'INSERT INTO SESSIONS (TraineeID, CourseID, Difficulty, Date, StartTime) VALUES (?, ?, ?, ?, ?)',
      [traineeId, courseId ?? 1, diff, today, now]
    );
    const [row] = await query('SELECT SessionID FROM SESSIONS ORDER BY SessionID DESC LIMIT 1');
    res.json({ sessionId: row.SessionID });
  } catch (err) {
    console.error('[sessions create]', err);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// End session
app.patch('/api/sessions/:id/end', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const sessionId = Number(id);
    const [s] = await query('SELECT TraineeID FROM SESSIONS WHERE SessionID = ?', [sessionId]);
    if (!s) {
      return res.status(404).json({ error: 'Session not found' });
    }
    if (s.TraineeID !== req.auth.traineeId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const now = new Date().toTimeString().slice(0, 8);
    await query('UPDATE SESSIONS SET EndTime = ? WHERE SessionID = ?', [now, sessionId]);
    res.json({ ok: true });
  } catch (err) {
    console.error('[sessions end]', err);
    res.status(500).json({ error: 'Failed to end session' });
  }
});

// Create report
app.post('/api/reports', requireAuth, async (req, res) => {
  try {
    const {
      sessionId,
      totalScore,
      accuracyScore,
      speedScore,
      stepsCompleted,
      totalSteps,
      durationSeconds,
      comments,
    } = req.body;
    const sid = Number(sessionId);
    const [s] = await query('SELECT TraineeID FROM SESSIONS WHERE SessionID = ?', [sid]);
    if (!s) {
      return res.status(404).json({ error: 'Session not found' });
    }
    if (s.TraineeID !== req.auth.traineeId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await query(
      `INSERT INTO REPORTS (SessionID, TotalScore, AccuracyScore, SpeedScore, StepsCompleted, TotalSteps, DurationSeconds, Comments)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sid,
        totalScore ?? accuracyScore ?? null,
        accuracyScore ?? null,
        speedScore ?? null,
        stepsCompleted ?? 0,
        totalSteps ?? 14,
        durationSeconds ?? null,
        comments ?? null,
      ]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[reports create]', err);
    res.status(500).json({ error: 'Failed to create report' });
  }
});

// Dashboard stats
app.get('/api/stats/:traineeId', requireAuth, async (req, res) => {
  try {
    const targetId = Number(req.params.traineeId);
    if (req.auth.role !== 'instructor' && req.auth.traineeId !== targetId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const sessions = await query('SELECT COUNT(*) as c FROM SESSIONS WHERE TraineeID = ?', [targetId]);
    const reports = await query(
      `SELECT r.AccuracyScore, r.DurationSeconds, s.Date
       FROM REPORTS r
       JOIN SESSIONS s ON r.SessionID = s.SessionID
       WHERE s.TraineeID = ?
       ORDER BY s.Date DESC, r.ReportID DESC`,
      [targetId]
    );
    const count = sessions[0]?.c ?? 0;
    const accSum = reports.reduce((a, r) => a + (r.AccuracyScore ?? 0), 0);
    const avgAccuracy = reports.length ? Math.round((accSum / reports.length) * 100) / 100 : 0;
    const lastSession = reports[0]
      ? { date: reports[0].Date, accuracy: reports[0].AccuracyScore, duration: reports[0].DurationSeconds }
      : null;
    const chartData = reports.slice(0, 10);
    res.json({ sessions: count, avgAccuracy, lastSession, chartData });
  } catch (err) {
    console.error('[stats]', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// List reports for a specific trainee
app.get('/api/reports/:traineeId', requireAuth, async (req, res) => {
  try {
    const targetId = Number(req.params.traineeId);
    if (req.auth.role !== 'instructor' && req.auth.traineeId !== targetId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const rows = await query(
      `SELECT r.ReportID, r.SessionID, r.TotalScore, r.AccuracyScore, r.SpeedScore, r.StepsCompleted, r.TotalSteps, r.DurationSeconds, r.Comments, s.Date, s.StartTime, c.CourseName, c.Type
       FROM REPORTS r
       JOIN SESSIONS s ON r.SessionID = s.SessionID
       JOIN COURSES c ON s.CourseID = c.CourseID
       WHERE s.TraineeID = ?
       ORDER BY s.Date DESC, s.StartTime DESC`,
      [targetId]
    );
    res.json(rows);
  } catch (err) {
    console.error('[reports list]', err);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// =========================================================================
// ADMIN & INSTRUCTOR ENDPOINTS
// =========================================================================

// Admin: list all trainees (instructor only)
app.get('/api/admin/trainees', requireAuth, requireInstructor, async (req, res) => {
  try {
    const rows = await query(
      'SELECT TraineeID, Name, Email, Specialty, PriorSimulationExperience, UnityUnrealExperience, Progress FROM TRAINEES WHERE Role = ?',
      ['trainee']
    );
    res.json(rows);
  } catch (err) {
    console.error('[admin trainees]', err);
    res.status(500).json({ error: 'Failed to fetch trainees' });
  }
});

// Admin: list all reports (instructor only)
app.get('/api/admin/reports', requireAuth, requireInstructor, async (req, res) => {
  try {
    const rows = await query(
      `SELECT r.ReportID, r.SessionID, r.TotalScore, r.AccuracyScore, r.SpeedScore, r.StepsCompleted, r.TotalSteps, r.DurationSeconds, r.Comments, s.Date, s.StartTime, s.TraineeID, t.Name as TraineeName, t.Email as TraineeEmail, c.CourseName, c.Type
       FROM REPORTS r
       JOIN SESSIONS s ON r.SessionID = s.SessionID
       JOIN TRAINEES t ON s.TraineeID = t.TraineeID
       JOIN COURSES c ON s.CourseID = c.CourseID
       ORDER BY s.Date DESC, s.StartTime DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error('[admin reports]', err);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

// التعديل الشامل لدالة تهيئة الجداول
async function ensureTables() {
  try {
    console.log("جاري التأكد من هيكلية الجداول كاملة...");

    // 1. إنشاء جدول الدورات (COURSES)
    await query(`
      CREATE TABLE IF NOT EXISTS COURSES (
        CourseID INT AUTO_INCREMENT PRIMARY KEY,
        CourseName VARCHAR(255) NOT NULL,
        Type VARCHAR(50) DEFAULT 'VR'
      )
    `);

    // إدراج دورة افتراضية إذا كان الجدول فارغاً لتفادي مشاكل الربط
    const courses = await query('SELECT COUNT(*) as c FROM COURSES');
    if (courses[0].c === 0) {
      await query(`INSERT INTO COURSES (CourseName, Type) VALUES ('Orientation & Bedside', 'VR')`);
    }

    // 2. إنشاء جدول المتدربين (TRAINEES)
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

    // 3. إنشاء جدول الجلسات (SESSIONS)
    await query(`
      CREATE TABLE IF NOT EXISTS SESSIONS (
        SessionID INT AUTO_INCREMENT PRIMARY KEY,
        TraineeID INT,
        CourseID INT,
        Difficulty VARCHAR(50),
        Date DATE,
        StartTime TIME,
        EndTime TIME,
        FOREIGN KEY (TraineeID) REFERENCES TRAINEES(TraineeID) ON DELETE CASCADE,
        FOREIGN KEY (CourseID) REFERENCES COURSES(CourseID) ON DELETE SET NULL
      )
    `);

    // 4. إنشاء جدول التقارير (REPORTS)
    await query(`
      CREATE TABLE IF NOT EXISTS REPORTS (
        ReportID INT AUTO_INCREMENT PRIMARY KEY,
        SessionID INT,
        TotalScore FLOAT,
        AccuracyScore FLOAT,
        SpeedScore FLOAT,
        StepsCompleted INT,
        TotalSteps INT,
        DurationSeconds INT,
        Comments TEXT,
        FOREIGN KEY (SessionID) REFERENCES SESSIONS(SessionID) ON DELETE CASCADE
      )
    `);

    // 5. فحص وإضافة الأعمدة الجديدة لجدول TRAINEES إن لم تكن موجودة
    const columns = await query('SHOW COLUMNS FROM TRAINEES');
    const columnNames = columns.map(c => c.Field || c.field);

    if (!columnNames.includes('PriorSimulationExperience')) {
      await query(`ALTER TABLE TRAINEES ADD COLUMN PriorSimulationExperience VARCHAR(255)`);
      console.log("تم إضافة عمود PriorSimulationExperience.");
    }
    if (!columnNames.includes('UnityUnrealExperience')) {
      await query(`ALTER TABLE TRAINEES ADD COLUMN UnityUnrealExperience VARCHAR(255)`);
      console.log("تم إضافة عمود UnityUnrealExperience.");
    }

    console.log("تم تحديث وجاهزية هيكلية الجداول بالكامل بنجاح.");
  } catch (err) {
    console.error("خطأ في تحديث الجداول:", err);
  }
}

// تشغيل الفحص ثم إقلاع السيرفر
ensureTables().then(() => {
  app.listen(config.port, () => {
    console.log(`Surgical Training API running on port ${config.port}`);
    if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
      console.warn('[auth] Set JWT_SECRET in production — refusing default dev secret is recommended.');
    }
  });
});
