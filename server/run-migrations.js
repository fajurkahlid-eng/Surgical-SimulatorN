import mysql from 'mysql2/promise';
import { config } from './config.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function run() {
  const { host, user, password, database } = config.mysql;
  const conn = await mysql.createConnection({ host, user, password });
  await conn.query(`USE \`${database}\``);
  const migrations = ['001-add-profile-role.sql', '002-seed-instructor.sql', '003-add-session-difficulty.sql', '004-add-unity-unreal-experience.sql'];
  for (const name of migrations) {
    const migration = readFileSync(join(__dirname, 'migrations', name), 'utf8');
    const statements = migration.split(';').map((s) => s.trim()).filter((s) => s && !s.startsWith('--'));
    for (const stmt of statements) {
      try {
        await conn.query(stmt);
        console.log('OK:', stmt.slice(0, 50) + '...');
      } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME' || err.code === 'ER_DUP_ENTRY') console.log('Skip (exists)');
        else console.error('Error:', err.message);
      }
    }
  }
  await conn.end();
  console.log('Migrations done.');
}

run().catch(console.error);
