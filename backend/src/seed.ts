import bcrypt from 'bcryptjs';
import { initDatabase, runQuery, saveDatabase } from './config/database';

async function seed() {
  console.log('Initializing database...');
  await initDatabase();

  console.log('Seeding database...');

  // Create users
  const users = [
    { employeeId: 'EMP001', name: '山田 太郎', email: 'yamada@example.com', password: 'password123', department: '営業部', role: 'user' },
    { employeeId: 'EMP002', name: '佐藤 花子', email: 'sato@example.com', password: 'password123', department: '経理部', role: 'approver' },
    { employeeId: 'EMP003', name: '鈴木 一郎', email: 'suzuki@example.com', password: 'password123', department: '人事部', role: 'admin' },
    { employeeId: 'EMP004', name: '田中 美咲', email: 'tanaka@example.com', password: 'password123', department: '開発部', role: 'user' },
    { employeeId: 'EMP005', name: '高橋 健太', email: 'takahashi@example.com', password: 'password123', department: '総務部', role: 'approver' },
  ];

  for (const user of users) {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    runQuery(`
      INSERT OR REPLACE INTO users (employee_id, name, email, password, department, role)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [user.employeeId, user.name, user.email, hashedPassword, user.department, user.role]);
  }

  console.log('Users created');

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
