import { Pool } from 'pg';

// PostgreSQL database configuration for production
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export const query = async (text: string, params?: any[]): Promise<any[]> => {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result.rows;
  } finally {
    client.release();
  }
};

export const runQuery = async (text: string, params?: any[]): Promise<void> => {
  await query(text, params);
};

export const getOne = async <T>(text: string, params?: any[]): Promise<T | undefined> => {
  const rows = await query(text, params);
  return rows[0] as T | undefined;
};

export const getAll = <T>(text: string, params?: any[]): T[] => {
  // For sync compatibility, we need to handle this differently
  // In production, this should be called with await
  throw new Error('Use async query() instead of getAll() for PostgreSQL');
};

export const saveDatabase = async (): Promise<void> => {
  // No-op for PostgreSQL (auto-commits)
};

// Initialize database schema
export const initDatabase = async (): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        employee_id VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        department VARCHAR(255),
        team_id INTEGER,
        role VARCHAR(50) DEFAULT 'user',
        weekly_report_exempt INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Teams table
    await client.query(`
      CREATE TABLE IF NOT EXISTS teams (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        leader_id INTEGER,
        webhook_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (leader_id) REFERENCES users(id)
      )
    `);

    // Customers table
    await client.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Customer Teams (many-to-many)
    await client.query(`
      CREATE TABLE IF NOT EXISTS customer_teams (
        customer_id INTEGER NOT NULL,
        team_id INTEGER NOT NULL,
        PRIMARY KEY (customer_id, team_id),
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
      )
    `);

    // Application Types
    await client.query(`
      CREATE TABLE IF NOT EXISTS application_types (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        is_active INTEGER DEFAULT 1,
        approval_required INTEGER DEFAULT 1,
        default_approver_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (default_approver_id) REFERENCES users(id)
      )
    `);

    // Applications
    await client.query(`
      CREATE TABLE IF NOT EXISTS applications (
        id SERIAL PRIMARY KEY,
        applicant_id INTEGER NOT NULL,
        application_type_id INTEGER NOT NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        approver_id INTEGER,
        approved_at TIMESTAMP,
        rejection_reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (applicant_id) REFERENCES users(id),
        FOREIGN KEY (application_type_id) REFERENCES application_types(id),
        FOREIGN KEY (approver_id) REFERENCES users(id)
      )
    `);

    // Attachments
    await client.query(`
      CREATE TABLE IF NOT EXISTS attachments (
        id SERIAL PRIMARY KEY,
        application_id INTEGER NOT NULL,
        filename VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_size INTEGER,
        mime_type VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
      )
    `);

    // Favorites
    await client.query(`
      CREATE TABLE IF NOT EXISTS favorites (
        user_id INTEGER NOT NULL,
        application_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, application_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
      )
    `);

    // Weekly Reports
    await client.query(`
      CREATE TABLE IF NOT EXISTS weekly_reports (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        week_start_date DATE NOT NULL,
        content TEXT,
        status VARCHAR(50) DEFAULT 'draft',
        submitted_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (user_id, week_start_date),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Revenue
    await client.query(`
      CREATE TABLE IF NOT EXISTS revenue (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER NOT NULL,
        year INTEGER NOT NULL,
        month INTEGER NOT NULL,
        mm_onsite DECIMAL(10,2) DEFAULT 0,
        mm_offshore DECIMAL(10,2) DEFAULT 0,
        unit_price DECIMAL(15,2) DEFAULT 0,
        unit_price_onsite DECIMAL(15,2) DEFAULT 0,
        unit_price_offshore DECIMAL(15,2) DEFAULT 0,
        total_amount DECIMAL(15,2) DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (customer_id, year, month),
        FOREIGN KEY (customer_id) REFERENCES customers(id)
      )
    `);

    // Feedback
    await client.query(`
      CREATE TABLE IF NOT EXISTS feedback (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        category VARCHAR(100),
        subject VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'open',
        priority VARCHAR(50) DEFAULT 'medium',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // System Settings
    await client.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        key VARCHAR(255) PRIMARY KEY,
        value TEXT,
        description TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // User System Access
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_system_access (
        user_id INTEGER NOT NULL,
        system_id VARCHAR(100) NOT NULL,
        PRIMARY KEY (user_id, system_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Approvers
    await client.query(`
      CREATE TABLE IF NOT EXISTS approvers (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        application_type_id INTEGER,
        is_active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (application_type_id) REFERENCES application_types(id)
      )
    `);

    // Departments (if needed as separate table)
    await client.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query('COMMIT');
    console.log('PostgreSQL database schema initialized successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error initializing PostgreSQL database:', error);
    throw error;
  } finally {
    client.release();
  }
};

export default pool;
