/**
 * 部署データの整合性チェックツール
 * ユーザーの部署名とマスター部署名の不一致を検出・修正
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:vtinagoya@localhost:5432/shinsei_shonin'
});

async function checkDepartmentConsistency() {
  console.log('=== 部署データ整合性チェック ===\n');

  try {
    // 1. 全部署を取得
    const { rows: departments } = await pool.query(`
      SELECT id, code, name FROM departments ORDER BY name
    `);

    console.log(`✓ マスター部署: ${departments.length}件\n`);

    // 2. ユーザーのユニークな部署名を取得
    const { rows: userDepts } = await pool.query(`
      SELECT DISTINCT department, COUNT(*) as user_count
      FROM users
      WHERE department IS NOT NULL AND department != ''
      GROUP BY department
      ORDER BY department
    `);

    console.log(`✓ ユーザーの部署: ${userDepts.length}種類\n`);

    // 3. 不一致をチェック
    const inconsistencies = [];
    const deptNames = departments.map(d => d.name);

    for (const userDept of userDepts) {
      const exactMatch = deptNames.includes(userDept.department);

      if (!exactMatch) {
        // 類似名を検索（スペース・大文字小文字無視）
        const fuzzyMatch = deptNames.find(deptName =>
          deptName.toLowerCase().replace(/\s+/g, '') ===
          userDept.department.toLowerCase().replace(/\s+/g, '')
        );

        inconsistencies.push({
          userDeptName: userDept.department,
          userCount: userDept.user_count,
          suggestedFix: fuzzyMatch || '❌ No match found',
          matchType: fuzzyMatch ? 'fuzzy' : 'none'
        });
      }
    }

    // 4. 結果表示
    if (inconsistencies.length === 0) {
      console.log('✅ データ整合性OK: すべてのユーザー部署がマスター部署と一致しています\n');
    } else {
      console.log(`⚠️  データ不整合を検出: ${inconsistencies.length}件\n`);
      console.log('┌─────────────────────────────────────────────────────────────┐');
      console.log('│ ユーザーの部署名          → 正しい部署名            人数    │');
      console.log('├─────────────────────────────────────────────────────────────┤');

      for (const item of inconsistencies) {
        const arrow = item.matchType === 'fuzzy' ? '→' : '✗';
        console.log(`│ "${item.userDeptName.padEnd(25)}" ${arrow} "${item.suggestedFix.padEnd(25)}" (${item.userCount}人) │`);
      }
      console.log('└─────────────────────────────────────────────────────────────┘\n');

      // 5. 修正オプション
      console.log('修正するには以下のコマンドを実行:');
      console.log('node backend/fix-department-inconsistencies.js\n');
    }

    // 6. マスターにない部署を持つユーザーを表示
    const orphanedUsers = inconsistencies.filter(i => i.matchType === 'none');
    if (orphanedUsers.length > 0) {
      console.log('❌ マスター部署に存在しない部署を持つユーザー:');
      for (const item of orphanedUsers) {
        const { rows: users } = await pool.query(
          `SELECT employee_id, name FROM users WHERE department = $1`,
          [item.userDeptName]
        );
        console.log(`  "${item.userDeptName}":`);
        users.forEach(u => console.log(`    - ${u.employee_id} (${u.name})`));
      }
      console.log();
    }

  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await pool.end();
  }
}

// 実行
checkDepartmentConsistency();
