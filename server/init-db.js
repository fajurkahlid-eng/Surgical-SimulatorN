import Database from 'better-sqlite3';
import { config } from './config.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function init() {
  const dbPath = join(__dirname, config.sqlite.path);
  const db = new Database(dbPath);
  
  console.log(`Initializing database at ${dbPath}`);
  
  const sql = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
  
  // SQLite exec يمكنه تنفيذ عدة أوامر مرة واحدة
  db.exec(sql);
  
  // التأكد من تفعيل المفاتيح الأجنبية
  db.pragma('foreign_keys = ON');
  
  db.close();
  console.log('Database initialized.');
}

init().catch(console.error);
