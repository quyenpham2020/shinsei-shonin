const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:vtinagoya@localhost:5432/shinsei_shonin',
  ssl: false,
});

async function seedApplicationTypes() {
  try {
    console.log('Seeding application types...');

    // Clear existing data
    await pool.query('DELETE FROM application_types');
    console.log('✓ Cleared existing application types');

    // Insert standard application types
    const types = [
      {
        code: 'VACATION',
        name: '休暇申請',
        description: '有給休暇、特別休暇などの休暇申請',
        requires_amount: false,
        is_active: true
      },
      {
        code: 'OVERTIME',
        name: '残業申請',
        description: '時間外労働の申請',
        requires_amount: true,
        is_active: true
      },
      {
        code: 'EXPENSE',
        name: '経費精算',
        description: '業務に関する経費の精算申請',
        requires_amount: true,
        is_active: true
      },
      {
        code: 'PURCHASE',
        name: '購買申請',
        description: '備品や機材の購入申請',
        requires_amount: true,
        is_active: true
      },
      {
        code: 'BUSINESS_TRIP',
        name: '出張申請',
        description: '国内・海外出張の申請',
        requires_amount: true,
        is_active: true
      }
    ];

    for (const type of types) {
      await pool.query(`
        INSERT INTO application_types (code, name, description, requires_amount, is_active)
        VALUES ($1, $2, $3, $4, $5)
      `, [type.code, type.name, type.description, type.requires_amount, type.is_active]);
      console.log(`✓ Created: ${type.name}`);
    }

    // Verify
    const result = await pool.query('SELECT * FROM application_types ORDER BY code');
    console.log(`\n✅ Total application types: ${result.rows.length}`);
    console.log('\nApplication Types:');
    result.rows.forEach(row => {
      console.log(`  - [${row.code}] ${row.name} (active: ${row.is_active})`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

seedApplicationTypes();
