import mysql from 'mysql2/promise';
import { config } from './config.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function init() {
  const { host, user, password, database } = config.mysql;
  const conn = await mysql.createConnection({ host, user, password });
  const sql = readFileSync(join(__dirname, 'schema.sql'), 'utf8');

  // Create database first
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${database}\``);
  await conn.query(`USE \`${database}\``);

  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => {
      if (!s || s.startsWith('--')) return false;
      if (s.toUpperCase().startsWith('CREATE DATABASE') || s.toUpperCase().startsWith('USE ')) return false;
      return true;
    });

  for (const stmt of statements) {
    try {
      await conn.query(stmt);
      console.log('OK:', stmt.slice(0, 60) + (stmt.length > 60 ? '...' : ''));
    } catch (err) {
      if (err.code === 'ER_TABLE_EXISTS' || err.code === 'ER_DUP_KEYNAME' || err.code === 'ER_DUP_FIELDNAME' || err.code === 'ER_DUP_ENTRY') {
        console.log('Skip (exists):', stmt.slice(0, 50) + '...');
      } else {
        console.error('Error:', err.message);
      }
    }
  }
  await conn.end();
  console.log('Database initialized.');
}

init().catch(console.error);
