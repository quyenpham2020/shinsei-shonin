import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../config/database';

const router = Router();

// Seed endpoint - ONLY use this once to initialize production database
router.post('/seed', async (req: Request, res: Response) => {
  try {
    console.log('Starting database seed...');

    // Hash password for users
    const hashedPassword = await bcrypt.hash('password123', 10);
    const hashedAdminPassword = await bcrypt.hash('admin123', 10);

    // Create admin user
    await query(`
      INSERT INTO users (employee_id, name, email, password, department, role, must_change_password)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (email) DO NOTHING
    `, ['ADMIN', 'System Admin', 'admin@example.com', hashedAdminPassword, 'IT', 'admin', false]);

    // Create sample users
    const users = [
      { employeeId: 'EMP001', name: '山田 太郎', email: 'yamada@example.com', department: '営業部', role: 'user' },
      { employeeId: 'EMP002', name: '佐藤 花子', email: 'sato@example.com', department: '経理部', role: 'approver' },
      { employeeId: 'EMP003', name: '鈴木 一郎', email: 'suzuki@example.com', department: '人事部', role: 'admin' },
      { employeeId: 'quyen', name: 'Quyen Pham', email: 'quyen@example.com', department: 'IT', role: 'admin' },
    ];

    for (const user of users) {
      await query(`
        INSERT INTO users (employee_id, name, email, password, department, role, must_change_password)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (email) DO NOTHING
      `, [user.employeeId, user.name, user.email, hashedPassword, user.department, user.role, false]);
    }

    // Create departments
    const departments = [
      { name: '営業部', description: '営業活動全般を担当' },
      { name: '経理部', description: '経理・財務業務を担当' },
      { name: '人事部', description: '人事・採用・労務管理を担当' },
      { name: '開発部', description: 'システム開発・保守を担当' },
      { name: '総務部', description: '総務・庶務業務を担当' },
      { name: 'IT', description: 'IT・システム管理を担当' },
    ];

    for (const dept of departments) {
      await query(`
        INSERT INTO departments (name, description)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `, [dept.name, dept.description]);
    }

    // Create application types
    const applicationTypes = [
      { name: '出張申請', description: '出張に関する申請', requires_amount: true, is_active: true },
      { name: '経費精算', description: '経費の精算申請', requires_amount: true, is_active: true },
      { name: '休暇申請', description: '有給休暇・特別休暇の申請', requires_amount: false, is_active: true },
      { name: '備品購入', description: '備品・消耗品の購入申請', requires_amount: true, is_active: true },
      { name: 'その他', description: 'その他の申請', requires_amount: false, is_active: true },
    ];

    for (const appType of applicationTypes) {
      await query(`
        INSERT INTO application_types (name, description, requires_amount, is_active)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT DO NOTHING
      `, [appType.name, appType.description, appType.requires_amount, appType.is_active]);
    }

    // Insert system settings
    const settings = [
      { key: 'email_host', value: '', description: 'SMTP host for sending emails' },
      { key: 'email_port', value: '587', description: 'SMTP port' },
      { key: 'email_secure', value: 'false', description: 'Use secure connection' },
      { key: 'email_user', value: '', description: 'SMTP username' },
      { key: 'email_password', value: '', description: 'SMTP password' },
      { key: 'email_from', value: '', description: 'From email address' },
      { key: 'enable_sunday_escalation', value: 'true', description: 'Enable Sunday escalation to GM/BOD' },
      { key: 'escalation_emails', value: '', description: 'GM/BOD email addresses (comma-separated)' },
    ];

    for (const setting of settings) {
      await query(`
        INSERT INTO system_settings (setting_key, setting_value, description)
        VALUES ($1, $2, $3)
        ON CONFLICT (setting_key) DO NOTHING
      `, [setting.key, setting.value, setting.description]);
    }

    console.log('Database seeded successfully');

    res.json({
      success: true,
      message: 'Database seeded successfully',
      data: {
        users: users.length + 1, // +1 for admin
        departments: departments.length,
        applicationTypes: applicationTypes.length,
        settings: settings.length,
      },
    });
  } catch (error: any) {
    console.error('Seed error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to seed database',
      error: error.message,
    });
  }
});

export default router;
