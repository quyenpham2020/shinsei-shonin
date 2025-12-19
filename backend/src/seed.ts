import bcrypt from 'bcryptjs';
import { initDatabase, runQuery, saveDatabase } from './config/database';

async function seed() {
  console.log('Initializing database...');
  await initDatabase();

  console.log('Seeding database...');

  // Create departments
  const departments = [
    { code: 'SALES', name: '営業部', description: '営業活動全般を担当' },
    { code: 'ACCOUNTING', name: '経理部', description: '経理・財務業務を担当' },
    { code: 'HR', name: '人事部', description: '人事・採用・労務管理を担当' },
    { code: 'DEV', name: '開発部', description: 'システム開発・保守を担当' },
    { code: 'GA', name: '総務部', description: '総務・庶務業務を担当' },
  ];

  for (const dept of departments) {
    runQuery(`
      INSERT OR REPLACE INTO departments (code, name, description)
      VALUES (?, ?, ?)
    `, [dept.code, dept.name, dept.description]);
  }

  console.log('Departments created');

  // Create application types (申請種別マスタ)
  const applicationTypes = [
    { code: 'travel', name: '出張申請', description: '出張に関する申請', requiresAmount: 1, requiresAttachment: 0, approvalLevels: 2, displayOrder: 1 },
    { code: 'expense', name: '経費精算', description: '経費の精算申請', requiresAmount: 1, requiresAttachment: 1, approvalLevels: 1, displayOrder: 2 },
    { code: 'leave', name: '休暇申請', description: '有給休暇・特別休暇の申請', requiresAmount: 0, requiresAttachment: 0, approvalLevels: 1, displayOrder: 3 },
    { code: 'purchase', name: '備品購入', description: '備品・消耗品の購入申請', requiresAmount: 1, requiresAttachment: 0, approvalLevels: 2, displayOrder: 4 },
    { code: 'other', name: 'その他', description: 'その他の申請', requiresAmount: 0, requiresAttachment: 0, approvalLevels: 1, displayOrder: 99 },
  ];

  for (const appType of applicationTypes) {
    runQuery(`
      INSERT OR REPLACE INTO application_types (code, name, description, requires_amount, requires_attachment, approval_levels, display_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [appType.code, appType.name, appType.description, appType.requiresAmount, appType.requiresAttachment, appType.approvalLevels, appType.displayOrder]);
  }

  console.log('Application types created');

  // Create users
  const users = [
    { employeeId: 'EMP001', name: '山田 太郎', email: 'yamada@example.com', password: 'password123', department: '営業部', role: 'user', mustChangePassword: 0 },
    { employeeId: 'EMP002', name: '佐藤 花子', email: 'sato@example.com', password: 'password123', department: '経理部', role: 'approver', mustChangePassword: 0 },
    { employeeId: 'EMP003', name: '鈴木 一郎', email: 'suzuki@example.com', password: 'password123', department: '人事部', role: 'admin', mustChangePassword: 0 },
    { employeeId: 'EMP004', name: '田中 美咲', email: 'tanaka@example.com', password: 'password123', department: '開発部', role: 'user', mustChangePassword: 0 },
    { employeeId: 'EMP005', name: '高橋 健太', email: 'takahashi@example.com', password: 'password123', department: '総務部', role: 'approver', mustChangePassword: 0 },
    { employeeId: 'EMP006', name: '新入 社員', email: 'newuser@example.com', password: 'password123', department: '営業部', role: 'user', mustChangePassword: 1 },
  ];

  for (const user of users) {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    runQuery(`
      INSERT OR REPLACE INTO users (employee_id, name, email, password, department, role, must_change_password)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [user.employeeId, user.name, user.email, hashedPassword, user.department, user.role, user.mustChangePassword]);
  }

  console.log('Users created');

  // Create approvers (承認者の部署割り当て)
  // 佐藤花子(user_id=2): 営業部(dept_id=1)と開発部(dept_id=4)の承認者
  // 高橋健太(user_id=5): 総務部(dept_id=5)と人事部(dept_id=3)の承認者
  // 鈴木一郎(user_id=3): 全部署の承認者（管理者）
  const approvers = [
    { userId: 2, departmentId: 1, approvalLevel: 1, maxAmount: 100000 },  // 佐藤 → 営業部
    { userId: 2, departmentId: 4, approvalLevel: 1, maxAmount: 100000 },  // 佐藤 → 開発部
    { userId: 5, departmentId: 5, approvalLevel: 1, maxAmount: 50000 },   // 高橋 → 総務部
    { userId: 5, departmentId: 3, approvalLevel: 1, maxAmount: 50000 },   // 高橋 → 人事部
    { userId: 3, departmentId: 1, approvalLevel: 2, maxAmount: null },    // 鈴木(管理者) → 営業部
    { userId: 3, departmentId: 2, approvalLevel: 2, maxAmount: null },    // 鈴木(管理者) → 経理部
    { userId: 3, departmentId: 3, approvalLevel: 2, maxAmount: null },    // 鈴木(管理者) → 人事部
    { userId: 3, departmentId: 4, approvalLevel: 2, maxAmount: null },    // 鈴木(管理者) → 開発部
    { userId: 3, departmentId: 5, approvalLevel: 2, maxAmount: null },    // 鈴木(管理者) → 総務部
  ];

  for (const approver of approvers) {
    runQuery(`
      INSERT OR REPLACE INTO approvers (user_id, department_id, approval_level, max_amount)
      VALUES (?, ?, ?, ?)
    `, [approver.userId, approver.departmentId, approver.approvalLevel, approver.maxAmount]);
  }

  console.log('Approvers created');

  // Create sample applications
  const applications = [
    { title: '出張申請 - 大阪営業所訪問', type: 'travel', description: '大阪営業所への出張（2泊3日）', amount: 50000, applicantId: 1, status: 'pending' },
    { title: '経費精算 - 接待費', type: 'expense', description: '顧客との会食費用', amount: 25000, applicantId: 1, status: 'approved' },
    { title: '休暇申請 - 夏季休暇', type: 'leave', description: '8月10日〜8月15日', amount: null, applicantId: 4, status: 'pending' },
    { title: '備品購入申請 - ノートPC', type: 'purchase', description: '開発用ノートPC購入', amount: 150000, applicantId: 4, status: 'rejected' },
    { title: '経費精算 - 交通費', type: 'expense', description: '客先訪問時の交通費', amount: 8500, applicantId: 1, status: 'pending' },
  ];

  for (const app of applications) {
    runQuery(`
      INSERT INTO applications (title, type, description, amount, applicant_id, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [app.title, app.type, app.description, app.amount, app.applicantId, app.status]);
  }

  // Update approved/rejected applications
  runQuery(`UPDATE applications SET approver_id = 2, approved_at = datetime('now') WHERE status = 'approved'`, []);
  runQuery(`UPDATE applications SET approver_id = 2, rejection_reason = '予算超過のため却下' WHERE status = 'rejected'`, []);

  console.log('Applications created');

  // Add sample comments
  const comments = [
    { applicationId: 1, userId: 2, content: '出張日程を確認しました。承認検討中です。' },
    { applicationId: 4, userId: 2, content: '予算が超過しているため、別の機種を検討してください。' },
    { applicationId: 4, userId: 4, content: '承知しました。別の機種で再申請します。' },
  ];

  for (const comment of comments) {
    runQuery(`
      INSERT INTO comments (application_id, user_id, content)
      VALUES (?, ?, ?)
    `, [comment.applicationId, comment.userId, comment.content]);
  }

  console.log('Comments created');
  saveDatabase();
  console.log('Seeding completed!');
}

seed().catch(console.error);
