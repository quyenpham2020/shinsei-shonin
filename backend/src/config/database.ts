import { Pool, QueryResult } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// PostgreSQL connection pool
let pool: Pool;

// Initialize PostgreSQL connection
export function initDatabase(): Pool {
  if (!pool) {
    const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/shinsei_shonin';
    const isProduction = process.env.NODE_ENV === 'production' || databaseUrl.includes('render.com');

    pool = new Pool({
      connectionString: databaseUrl,
      ssl: isProduction ? { rejectUnauthorized: false } : false,
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
      process.exit(-1);
    });

    console.log('PostgreSQL connection pool initialized');
  }

  return pool;
}

// Get database instance
export function getDatabase(): Pool {
  if (!pool) {
    return initDatabase();
  }
  return pool;
}

// Helper functions for database operations
export async function query(text: string, params?: any[]): Promise<QueryResult> {
  const db = getDatabase();
  return db.query(text, params);
}

export async function getOne(sql: string, params?: any[]): Promise<any> {
  const result = await query(sql, params);
  return result.rows[0];
}

export async function getAll(sql: string, params?: any[]): Promise<any[]> {
  const result = await query(sql, params);
  return result.rows;
}

export async function runQuery(sql: string, params?: any[]): Promise<QueryResult> {
  return query(sql, params);
}

// Initialize database schema
export async function initializeSchema(): Promise<void> {
  const db = getDatabase();

  // Create users table
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      employee_id VARCHAR(50) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      department VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'user',
      must_change_password BOOLEAN NOT NULL DEFAULT false,
      password_changed_at TIMESTAMP,
      password_reset_token VARCHAR(255),
      password_reset_expires TIMESTAMP,
      team_id INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create departments table
  await db.query(`
    CREATE TABLE IF NOT EXISTS departments (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      manager_id INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  // Create application_types table
  await db.query(`
    CREATE TABLE IF NOT EXISTS application_types (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      default_approver_id INTEGER,
      requires_amount BOOLEAN DEFAULT false,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (default_approver_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  // Create applications table
  await db.query(`
    CREATE TABLE IF NOT EXISTS applications (
      id SERIAL PRIMARY KEY,
      application_number VARCHAR(50) UNIQUE,
      title VARCHAR(500) NOT NULL,
      type VARCHAR(255) NOT NULL,
      description TEXT,
      amount DECIMAL(15, 2),
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      applicant_id INTEGER NOT NULL,
      approver_id INTEGER,
      department_id INTEGER,
      preferred_date DATE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      approved_at TIMESTAMP,
      rejection_reason TEXT,
      FOREIGN KEY (applicant_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (approver_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
    )
  `);

  // Create approvers table
  await db.query(`
    CREATE TABLE IF NOT EXISTS approvers (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      department_id INTEGER,
      application_type VARCHAR(255),
      can_approve_amount DECIMAL(15, 2),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
    )
  `);

  // Create comments table
  await db.query(`
    CREATE TABLE IF NOT EXISTS comments (
      id SERIAL PRIMARY KEY,
      application_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      comment TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Create attachments table
  await db.query(`
    CREATE TABLE IF NOT EXISTS attachments (
      id SERIAL PRIMARY KEY,
      application_id INTEGER NOT NULL,
      filename VARCHAR(255) NOT NULL,
      original_filename VARCHAR(255) NOT NULL,
      filepath VARCHAR(500) NOT NULL,
      mimetype VARCHAR(100),
      size INTEGER,
      uploaded_by INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
      FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Create favorites table
  await db.query(`
    CREATE TABLE IF NOT EXISTS favorites (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      application_id INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
      UNIQUE(user_id, application_id)
    )
  `);

  // Create page_favorites table
  await db.query(`
    CREATE TABLE IF NOT EXISTS page_favorites (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      page_path VARCHAR(255) NOT NULL,
      page_name VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, page_path)
    )
  `);

  // Create teams table
  await db.query(`
    CREATE TABLE IF NOT EXISTS teams (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      leader_id INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (leader_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  // Create team_members table
  await db.query(`
    CREATE TABLE IF NOT EXISTS team_members (
      id SERIAL PRIMARY KEY,
      team_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(team_id, user_id)
    )
  `);

  // Create customers table
  await db.query(`
    CREATE TABLE IF NOT EXISTS customers (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      code VARCHAR(50) UNIQUE,
      contact_person VARCHAR(255),
      email VARCHAR(255),
      phone VARCHAR(50),
      address TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create customer_teams table
  await db.query(`
    CREATE TABLE IF NOT EXISTS customer_teams (
      id SERIAL PRIMARY KEY,
      customer_id INTEGER NOT NULL,
      team_id INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
      UNIQUE(customer_id, team_id)
    )
  `);

  // Create revenue table
  await db.query(`
    CREATE TABLE IF NOT EXISTS revenue (
      id SERIAL PRIMARY KEY,
      customer_id INTEGER NOT NULL,
      team_id INTEGER NOT NULL,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      mm_onsite DECIMAL(10, 2) DEFAULT 0,
      mm_offshore DECIMAL(10, 2) DEFAULT 0,
      unit_price_onsite DECIMAL(15, 2) DEFAULT 0,
      unit_price_offshore DECIMAL(15, 2) DEFAULT 0,
      unit_price DECIMAL(15, 2) DEFAULT 0,
      total_amount DECIMAL(15, 2) DEFAULT 0,
      forecast_amount DECIMAL(15, 2),
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
    )
  `);

  // Create feedback table
  await db.query(`
    CREATE TABLE IF NOT EXISTS feedback (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      category VARCHAR(100),
      subject VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      status VARCHAR(50) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Create system_settings table
  await db.query(`
    CREATE TABLE IF NOT EXISTS system_settings (
      id SERIAL PRIMARY KEY,
      setting_key VARCHAR(255) UNIQUE NOT NULL,
      setting_value TEXT,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create weekly_reports table
  await db.query(`
    CREATE TABLE IF NOT EXISTS weekly_reports (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      week_start_date DATE NOT NULL,
      week_end_date DATE NOT NULL,
      content TEXT,
      achievements TEXT,
      challenges TEXT,
      next_week_plan TEXT,
      overview TEXT,
      status VARCHAR(50) DEFAULT 'draft',
      submitted_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, week_start_date)
    )
  `);

  // Create reminder_logs table
  await db.query(`
    CREATE TABLE IF NOT EXISTS reminder_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      reminder_type VARCHAR(50) NOT NULL,
      week_start_date DATE NOT NULL,
      sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Create system_access table
  await db.query(`
    CREATE TABLE IF NOT EXISTS system_access (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      page_path VARCHAR(255) NOT NULL,
      can_view BOOLEAN DEFAULT false,
      can_create BOOLEAN DEFAULT false,
      can_edit BOOLEAN DEFAULT false,
      can_delete BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, page_path)
    )
  `);

  console.log('Database schema initialized successfully');
}

// Export the pool as default db
export default getDatabase;
