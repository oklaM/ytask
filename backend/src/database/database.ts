import sqlite3 from 'sqlite3';
import { open, Database as SqliteDatabase } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db: SqliteDatabase | null = null;

export async function initializeDatabase(): Promise<SqliteDatabase> {
  if (db) return db;

  const databasePath = path.join(__dirname, '../../data/tasks.db');
  
  // 确保目录存在
  const fs = await import('fs');
  const dir = path.dirname(databasePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = await open({
    filename: databasePath,
    driver: sqlite3.Database
  });

  // 创建表结构
  await db!.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      type TEXT NOT NULL CHECK(type IN ('http', 'command', 'script')),
      config TEXT NOT NULL,
      trigger_type TEXT NOT NULL CHECK(trigger_type IN ('cron', 'interval', 'date', 'visual', 'lunar', 'countdown', 'conditional')),
      trigger_config TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('active', 'paused', 'completed')),
      category TEXT,
      tags TEXT,
      max_retries INTEGER DEFAULT 3,
      retry_interval INTEGER DEFAULT 5000,
      timeout INTEGER DEFAULT 30000,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      next_execution_time TEXT,
      last_execution_time TEXT
    )
  `);

  await db!.run(`
    CREATE TABLE IF NOT EXISTS execution_logs (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('success', 'failed', 'running')),
      started_at TEXT NOT NULL,
      finished_at TEXT,
      duration INTEGER,
      result TEXT,
      error TEXT,
      retry_count INTEGER DEFAULT 0,
      FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE
    )
  `);

  await db!.run(`
    CREATE TABLE IF NOT EXISTS task_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      color TEXT DEFAULT '#1890ff'
    )
  `);

  // 创建索引
  await db!.run('CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)');
  await db!.run('CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category)');
  await db!.run('CREATE INDEX IF NOT EXISTS idx_logs_task_id ON execution_logs(task_id)');
  await db!.run('CREATE INDEX IF NOT EXISTS idx_logs_started_at ON execution_logs(started_at)');

  return db!;
}

export function getDatabase(): SqliteDatabase {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}