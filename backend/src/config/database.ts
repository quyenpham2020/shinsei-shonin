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

export async function getOne<T = any>(sql: string, params?: any[]): Promise<T | undefined> {
  const result = await query(sql, params);
  return result.rows[0];
}

export async function getAll<T = any>(sql: string, params?: any[]): Promise<T[]> {
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
      code VARCHAR(50) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      default_approver_id INTEGER,
      requires_amount BOOLEAN DEFAULT false,
      requires_attachment BOOLEAN DEFAULT false,
      approval_levels INTEGER DEFAULT 1,
      display_order INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (default_approver_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  // Add missing columns to application_types if they don't exist
  const appTypeAlterQueries = [
    `ALTER TABLE application_types ADD COLUMN IF NOT EXISTS code VARCHAR(50) UNIQUE`,
    `ALTER TABLE application_types ADD COLUMN IF NOT EXISTS requires_attachment BOOLEAN DEFAULT false`,
    `ALTER TABLE application_types ADD COLUMN IF NOT EXISTS approval_levels INTEGER DEFAULT 1`,
    `ALTER TABLE application_types ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0`
  ];

  for (const alterQuery of appTypeAlterQueries) {
    try {
      await db.query(alterQuery);
    } catch (e: any) {
      // Column may already exist, skip
      if (!e.message?.includes('already exists')) {
        console.log(`Skipping ALTER TABLE application_types: ${e.message}`);
      }
    }
  }

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
      admin_response TEXT,
      responded_at TIMESTAMP,
      responded_by INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (responded_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  // Add missing columns to feedback table if they don't exist (using conditional ALTER)
  const alterQueries = [
    `ALTER TABLE feedback ADD COLUMN IF NOT EXISTS admin_response TEXT`,
    `ALTER TABLE feedback ADD COLUMN IF NOT EXISTS responded_at TIMESTAMP`,
    `ALTER TABLE feedback ADD COLUMN IF NOT EXISTS responded_by INTEGER REFERENCES users(id) ON DELETE SET NULL`,
    `ALTER TABLE feedback ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
  ];

  for (const alterQuery of alterQueries) {
    try {
      await db.query(alterQuery);
    } catch (e: any) {
      // Column may already exist or syntax not supported, skip
      if (!e.message?.includes('already exists')) {
        console.log(`Skipping ALTER TABLE: ${e.message}`);
      }
    }
  }

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

  // Create systems table
  await db.query(`
    CREATE TABLE IF NOT EXISTS systems (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Seed systems data
  await db.query(`
    INSERT INTO systems (id, name, description, is_active)
    VALUES
      ('shinsei-shonin', '申請承認管理システム', '各種申請の作成、承認フローの管理を行います', true),
      ('weekly-report', '週間報告管理システム', '週次報告の作成、閲覧、部門管理を行います', true),
      ('newsfeed', 'ニュースフィード', '社内の情報、ノウハウ、ヒントを共有します', true),
      ('master-management', 'マスタ管理', '部署、ユーザー、承認者などのマスタデータを管理します', true)
    ON CONFLICT (id) DO NOTHING
  `);

  // Create user_system_access table
  await db.query(`
    CREATE TABLE IF NOT EXISTS user_system_access (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      system_id VARCHAR(50) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (system_id) REFERENCES systems(id) ON DELETE CASCADE,
      UNIQUE(user_id, system_id)
    )
  `);

  // Create system_access table (for page-level permissions)
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

  // Create login_logs table
  await db.query(`
    CREATE TABLE IF NOT EXISTS login_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      employee_id VARCHAR(50) NOT NULL,
      username VARCHAR(255) NOT NULL,
      ip_address VARCHAR(45),
      user_agent TEXT,
      browser VARCHAR(100),
      os VARCHAR(100),
      device VARCHAR(100),
      country VARCHAR(100),
      region VARCHAR(100),
      city VARCHAR(100),
      timezone VARCHAR(100),
      login_status VARCHAR(20) NOT NULL,
      failure_reason TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Create audit_logs table (for user actions)
  await db.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      employee_id VARCHAR(50) NOT NULL,
      username VARCHAR(255) NOT NULL,
      action VARCHAR(100) NOT NULL,
      resource_type VARCHAR(100),
      resource_id VARCHAR(100),
      description TEXT,
      ip_address VARCHAR(45),
      user_agent TEXT,
      old_values JSONB,
      new_values JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Create password_change_logs table
  await db.query(`
    CREATE TABLE IF NOT EXISTS password_change_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      employee_id VARCHAR(50) NOT NULL,
      username VARCHAR(255) NOT NULL,
      change_type VARCHAR(50) NOT NULL,
      changed_by INTEGER,
      changed_by_name VARCHAR(255),
      ip_address VARCHAR(45),
      user_agent TEXT,
      is_forced BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  // Create newsfeed_categories table
  await db.query(`
    CREATE TABLE IF NOT EXISTS newsfeed_categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      name_en VARCHAR(100),
      icon VARCHAR(50),
      color VARCHAR(20),
      display_order INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      created_by INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  // Create newsfeed_posts table
  await db.query(`
    CREATE TABLE IF NOT EXISTS newsfeed_posts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      post_type VARCHAR(50) DEFAULT 'general',
      category VARCHAR(100),
      category_id INTEGER,
      is_anonymous BOOLEAN DEFAULT false,
      image_url VARCHAR(500),
      likes_count INTEGER DEFAULT 0,
      comments_count INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES newsfeed_categories(id) ON DELETE SET NULL
    )
  `);

  // Create newsfeed_comments table
  await db.query(`
    CREATE TABLE IF NOT EXISTS newsfeed_comments (
      id SERIAL PRIMARY KEY,
      post_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      parent_comment_id INTEGER,
      content TEXT NOT NULL,
      is_anonymous BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES newsfeed_posts(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_comment_id) REFERENCES newsfeed_comments(id) ON DELETE CASCADE
    )
  `);

  // Create newsfeed_likes table (renamed to newsfeed_reactions for multiple reaction types)
  await db.query(`
    CREATE TABLE IF NOT EXISTS newsfeed_reactions (
      id SERIAL PRIMARY KEY,
      post_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      reaction_type VARCHAR(20) NOT NULL DEFAULT 'like',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES newsfeed_posts(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(post_id, user_id)
    )
  `);

  // Migrate old newsfeed_likes to newsfeed_reactions if exists
  await db.query(`
    INSERT INTO newsfeed_reactions (post_id, user_id, reaction_type, created_at)
    SELECT post_id, user_id, 'like', created_at
    FROM newsfeed_likes
    WHERE NOT EXISTS (
      SELECT 1 FROM newsfeed_reactions nr
      WHERE nr.post_id = newsfeed_likes.post_id
      AND nr.user_id = newsfeed_likes.user_id
    )
    ON CONFLICT (post_id, user_id) DO NOTHING
  `);

  // Create newsfeed_attachments table
  await db.query(`
    CREATE TABLE IF NOT EXISTS newsfeed_attachments (
      id SERIAL PRIMARY KEY,
      post_id INTEGER,
      comment_id INTEGER,
      original_name VARCHAR(500) NOT NULL,
      stored_name VARCHAR(500) NOT NULL,
      mime_type VARCHAR(100) NOT NULL,
      file_type VARCHAR(20) NOT NULL,
      size INTEGER NOT NULL,
      uploaded_by INTEGER NOT NULL,
      storage_type VARCHAR(20) DEFAULT 'local',
      storage_path TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES newsfeed_posts(id) ON DELETE CASCADE,
      FOREIGN KEY (comment_id) REFERENCES newsfeed_comments(id) ON DELETE CASCADE,
      FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE,
      CHECK ((post_id IS NOT NULL AND comment_id IS NULL) OR (post_id IS NULL AND comment_id IS NOT NULL))
    )
  `);

  // Create newsfeed_anonymous_mapping table
  await db.query(`
    CREATE TABLE IF NOT EXISTS newsfeed_anonymous_mapping (
      id SERIAL PRIMARY KEY,
      post_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      anonymous_index INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES newsfeed_posts(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(post_id, user_id),
      UNIQUE(post_id, anonymous_index)
    )
  `);

  console.log('Database schema initialized successfully');
}

// Export the pool as default db
export default getDatabase;
