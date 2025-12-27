import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import fs from 'fs';
import path from 'path';

const dbPath = path.join(__dirname, '../../data/database.sqlite');
const dataDir = path.dirname(dbPath);

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let db: SqlJsDatabase;

export async function initDatabase(): Promise<SqlJsDatabase> {
  const SQL = await initSqlJs();

  // Load existing database or create new one
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Initialize tables
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      department TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      must_change_password INTEGER NOT NULL DEFAULT 0,
      password_changed_at DATETIME,
      password_reset_token TEXT,
      password_reset_expires DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Add new columns if they don't exist (for existing databases)
  try {
    db.run(`ALTER TABLE users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0`);
  } catch (e) { /* Column may already exist */ }
  try {
    db.run(`ALTER TABLE users ADD COLUMN password_changed_at DATETIME`);
  } catch (e) { /* Column may already exist */ }
  try {
    db.run(`ALTER TABLE users ADD COLUMN password_reset_token TEXT`);
  } catch (e) { /* Column may already exist */ }
  try {
    db.run(`ALTER TABLE users ADD COLUMN password_reset_expires DATETIME`);
  } catch (e) { /* Column may already exist */ }

  db.run(`
    CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_number TEXT UNIQUE,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT,
      amount REAL,
      status TEXT NOT NULL DEFAULT 'pending',
      applicant_id INTEGER NOT NULL,
      approver_id INTEGER,
      department_id INTEGER,
      preferred_date DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      approved_at DATETIME,
      rejection_reason TEXT,
      FOREIGN KEY (applicant_id) REFERENCES users(id),
      FOREIGN KEY (approver_id) REFERENCES users(id),
      FOREIGN KEY (department_id) REFERENCES departments(id)
    )
  `);

  // Helper function to safely add column if it doesn't exist
  const addColumnIfNotExists = (table: string, column: string, type: string) => {
    try {
      const tableInfo = db.exec(`PRAGMA table_info(${table})`);
      const columns = tableInfo[0]?.values?.map((row: any) => row[1]) || [];
      if (!columns.includes(column)) {
        db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
        console.log(`Added column ${column} to ${table}`);
      }
    } catch (e) {
      console.error(`Error adding column ${column} to ${table}:`, e);
    }
  };

  // Add new columns to applications if they don't exist
  addColumnIfNotExists('applications', 'application_number', 'TEXT');
  addColumnIfNotExists('applications', 'department_id', 'INTEGER');
  addColumnIfNotExists('applications', 'preferred_date', 'DATE');

  db.run(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (application_id) REFERENCES applications(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Add is_active column to departments if it doesn't exist
  try {
    db.run(`ALTER TABLE departments ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1`);
  } catch (e) { /* Column may already exist */ }

  db.run(`
    CREATE TABLE IF NOT EXISTS approvers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      department_id INTEGER NOT NULL,
      approval_level INTEGER NOT NULL DEFAULT 1,
      max_amount REAL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (department_id) REFERENCES departments(id),
      UNIQUE(user_id, department_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS application_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      requires_amount INTEGER NOT NULL DEFAULT 0,
      requires_attachment INTEGER NOT NULL DEFAULT 0,
      approval_levels INTEGER NOT NULL DEFAULT 1,
      display_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id INTEGER NOT NULL,
      original_name TEXT NOT NULL,
      stored_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      uploaded_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
      FOREIGN KEY (uploaded_by) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      link TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      read_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

    // Weekly Reports table
  db.run(`
    CREATE TABLE IF NOT EXISTS weekly_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      week_start DATE NOT NULL,
      week_end DATE NOT NULL,
      content TEXT NOT NULL,
      achievements TEXT,
      challenges TEXT,
      next_week_plan TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, week_start)
    )
  `);

  // Favorites table (for applications)
  db.run(`
    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      application_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
      UNIQUE(user_id, application_id)
    )
  `);

  // Page Favorites table (for bookmarking any page/URL)
  db.run(`
    CREATE TABLE IF NOT EXISTS page_favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      url TEXT NOT NULL,
      title TEXT NOT NULL,
      icon TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, url)
    )
  `);

  // User System Access table (for managing which users can access which systems)
  db.run(`
    CREATE TABLE IF NOT EXISTS user_system_access (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      system_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, system_id)
    )
  `);

  // Teams table (small teams within departments, led by onsite leaders)
  db.run(`
    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      department_id INTEGER NOT NULL,
      leader_id INTEGER,
      description TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
      FOREIGN KEY (leader_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  // Add team_id column to users table for team membership
  addColumnIfNotExists('users', 'team_id', 'INTEGER');

  // Add department_id column to users table for proper foreign key relationship
  addColumnIfNotExists('users', 'department_id', 'INTEGER');

  // Add weekly_report_exempt column (user doesn't need to submit weekly reports)
  addColumnIfNotExists('users', 'weekly_report_exempt', 'INTEGER DEFAULT 0');

  // System settings table for feature toggles
  db.run(`
    CREATE TABLE IF NOT EXISTS system_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      setting_key TEXT UNIQUE NOT NULL,
      setting_value TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Feedback submissions table
  db.run(`
    CREATE TABLE IF NOT EXISTS feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      category TEXT NOT NULL,
      subject TEXT NOT NULL,
      content TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      admin_response TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      responded_at DATETIME,
      responded_by INTEGER,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (responded_by) REFERENCES users(id)
    )
  `);

  // Insert default system settings if they don't exist
  const feedbackSettingExists = db.exec(`SELECT 1 FROM system_settings WHERE setting_key = 'feedback_enabled'`);
  if (!feedbackSettingExists || feedbackSettingExists.length === 0) {
    db.run(`INSERT INTO system_settings (setting_key, setting_value, description) VALUES ('feedback_enabled', '1', 'Enable/disable feedback system')`);
  }

  // Customers table for revenue management
  db.run(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Customer-Team mapping for access control
  db.run(`
    CREATE TABLE IF NOT EXISTS customer_teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      team_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
      UNIQUE(customer_id, team_id)
    )
  `);

  // Revenue records table - monthly revenue data
  db.run(`
    CREATE TABLE IF NOT EXISTS revenue_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      mm_onsite REAL NOT NULL DEFAULT 0,
      mm_offshore REAL NOT NULL DEFAULT 0,
      unit_price REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_by INTEGER,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id),
      UNIQUE(customer_id, year, month)
    )
  `);

saveDatabase();
  return db;
}

export function getDatabase(): SqlJsDatabase {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

export function saveDatabase(): void {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

// Helper functions to match better-sqlite3 API style
export function runQuery(sql: string, params: (string | number | null)[] = []): { lastInsertRowid: number; changes: number } {
  const database = getDatabase();
  database.run(sql, params);
  const result = database.exec('SELECT last_insert_rowid() as id, changes() as changes');
  saveDatabase();
  return {
    lastInsertRowid: result[0]?.values[0]?.[0] as number || 0,
    changes: result[0]?.values[0]?.[1] as number || 0,
  };
}

export function getOne<T>(sql: string, params: (string | number | null)[] = []): T | undefined {
  const database = getDatabase();
  const stmt = database.prepare(sql);
  stmt.bind(params);

  if (stmt.step()) {
    const columns = stmt.getColumnNames();
    const values = stmt.get();
    const row: Record<string, unknown> = {};
    columns.forEach((col, idx) => {
      row[col] = values[idx];
    });
    stmt.free();
    return row as T;
  }
  stmt.free();
  return undefined;
}

export function getAll<T>(sql: string, params: (string | number | null)[] = []): T[] {
  const database = getDatabase();
  const stmt = database.prepare(sql);
  stmt.bind(params);

  const results: T[] = [];
  const columns = stmt.getColumnNames();

  while (stmt.step()) {
    const values = stmt.get();
    const row: Record<string, unknown> = {};
    columns.forEach((col, idx) => {
      row[col] = values[idx];
    });
    results.push(row as T);
  }
  stmt.free();
  return results;
}
