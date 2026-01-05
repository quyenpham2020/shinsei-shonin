import bcrypt from 'bcryptjs';
import { initDatabase, getDatabase, initializeSchema } from './config/database';

async function seedAdmin() {
  try {
    console.log('Initializing database connection...');
    const db = initDatabase();

    console.log('Creating schema...');
    await initializeSchema();

    console.log('Creating admin user (admin/admin)...');

    // Hash the password
    const hashedPassword = await bcrypt.hash('admin', 10);

    // Create admin user
    await db.query(`
      INSERT INTO users (employee_id, name, email, password, department, role, must_change_password)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (email)
      DO UPDATE SET
        password = EXCLUDED.password,
        role = EXCLUDED.role,
        must_change_password = EXCLUDED.must_change_password
    `, ['ADMIN', 'System Admin', 'admin', hashedPassword, 'IT', 'admin', false]);

    console.log('✅ Admin user created successfully!');
    console.log('   Email: admin');
    console.log('   Password: admin');
    console.log('   Role: admin');

    // Create some sample departments
    console.log('\nCreating departments...');
    const departments = [
      ['IT', 'IT部門', 'システム開発・運用'],
      ['SALES', '営業部', '営業活動全般'],
      ['HR', '人事部', '人事・採用'],
    ];

    for (const [code, name, desc] of departments) {
      try {
        await db.query(`
          INSERT INTO departments (name, description)
          VALUES ($1, $2)
        `, [name, desc]);
      } catch (error: any) {
        // Ignore if already exists
        if (!error.message.includes('duplicate key')) {
          throw error;
        }
      }
    }
    console.log('✅ Departments created');

    // Create system settings
    console.log('\nCreating system settings...');
    try {
      await db.query(`
        INSERT INTO system_settings (key, value, description)
        VALUES
          ('approval_required', 'true', 'Require approval for applications'),
          ('email_notifications', 'false', 'Enable email notifications')
        ON CONFLICT (key) DO NOTHING
      `);
      console.log('✅ System settings created');
    } catch (error: any) {
      // Ignore if already exists
      console.log('⚠️  System settings may already exist');
    }

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\nYou can now login with:');
    console.log('   Email/Username: admin');
    console.log('   Password: admin');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seedAdmin();
