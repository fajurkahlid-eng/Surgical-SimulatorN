import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from './config.js';

const SALT_ROUNDS = 12;

/** bcrypt hashes start with $2a$, $2b$, etc. */
function isBcryptHash(stored) {
  return typeof stored === 'string' && stored.startsWith('$2');
}

export async function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

/**
 * Verifies password. Supports legacy plain-text rows: on match, caller should rehash.
 */
export async function verifyPassword(plain, stored) {
  if (stored == null || stored === '') return false;
  if (isBcryptHash(stored)) {
    return bcrypt.compare(plain, stored);
  }
  return plain === stored;
}

export function needsRehash(stored) {
  return stored != null && stored !== '' && !isBcryptHash(stored);
}

export function signToken({ traineeId, role, email }) {
  return jwt.sign(
    { sub: traineeId, role: role ?? 'trainee', email: email ?? '' },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, config.jwt.secret);
}

export function requireAuth(req, res, next) {
  const h = req.headers.authorization;
  if (!h || !h.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  const token = h.slice(7).trim();
  if (!token) {
    return res.status(401).json({ error: 'Missing token' });
  }
  try {
    const decoded = verifyToken(token);
    const traineeId = Number(decoded.sub);
    if (!Number.isFinite(traineeId)) {
      return res.status(401).json({ error: 'Invalid token payload' });
    }
    req.auth = {
      traineeId,
      role: decoded.role === 'instructor' ? 'instructor' : 'trainee',
      email: decoded.email ?? '',
    };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireInstructor(req, res, next) {
  if (req.auth?.role !== 'instructor') {
    return res.status(403).json({ error: 'Instructor access required' });
  }
  next();
}
