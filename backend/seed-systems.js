const { runQuery } = require('./dist/config/database');

(async () => {
  try {
    // Insert sample systems (matching frontend config)
    const systems = [
      { id: 'shinsei-shonin', name: '申請承認管理システム', description: 'Application & Approval System' },
      { id: 'weekly-report', name: '週間報告管理システム', description: 'Weekly Report System' },
      { id: 'master-management', name: 'マスタ管理', description: 'Master Management' }
    ];

    for (const system of systems) {
      await runQuery(`
        INSERT INTO systems (id, name, description)
        VALUES ($1, $2, $3)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description
      `, [system.id, system.name, system.description]);
    }

    console.log('Sample systems created successfully:');
    console.log(systems.map(s => `- ${s.id}: ${s.name}`).join('\n'));

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
