import Database from 'better-sqlite3';
import { config } from './config.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function run() {
  const dbPath = join(__dirname, config.sqlite.path);
  const db = new Database(dbPath);
  
  db.pragma('foreign_keys = ON');

  const migrations = ['001-add-profile-role.sql', '002-seed-instructor.sql', '003-add-session-difficulty.sql', '004-add-unity-unreal-experience.sql'];
  
  for (const name of migrations) {
    try {
      const migration = readFileSync(join(__dirname, 'migrations', name), 'utf8');
      // SQLite exec يقبل الأوامر المتعددة المنفصلة بـ ;
      db.exec(migration);
      console.log('OK:', name);
    } catch (err) {
      // تجاهل الأخطاء المتعلقة بالوجود المسبق
      if (err.message.includes('duplicate column name') || err.message.includes('already exists')) {
        console.log('Skip (exists):', name);
      } else {
        console.error('Error in', name, err.message);
      }
    }
  }
  
  db.close();
  console.log('Migrations done.');
}

run().catch(console.error);
