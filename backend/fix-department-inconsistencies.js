/**
 * 部署データの不整合を自動修正
 * check-department-consistency.js で検出された問題を修正
 */

const { Pool } = require('pg');
const readline = require('readline');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:vtinagoya@localhost:5432/shinsei_shonin'
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise(resolve => rl.question(prompt, resolve));
}

async function fixDepartmentInconsistencies() {
  console.log('=== 部署データ不整合の自動修正 ===\n');

  try {
    // 1. 不整合を検出
    const { rows: departments } = await pool.query(`
      SELECT id, code, name FROM departments ORDER BY name
    `);

    const { rows: userDepts } = await pool.query(`
      SELECT DISTINCT department, COUNT(*) as user_count
      FROM users
      WHERE department IS NOT NULL AND department != ''
      GROUP BY department
      ORDER BY department
    `);

    const deptNames = departments.map(d => d.name);
    const fixes = [];

    for (const userDept of userDepts) {
      const exactMatch = deptNames.includes(userDept.department);

      if (!exactMatch) {
        // 類似名を検索
        const fuzzyMatch = deptNames.find(deptName =>
          deptName.toLowerCase().replace(/\s+/g, '') ===
          userDept.department.toLowerCase().replace(/\s+/g, '')
        );

        if (fuzzyMatch) {
          fixes.push({
            oldName: userDept.department,
            newName: fuzzyMatch,
            userCount: userDept.user_count
          });
        }
      }
    }

    if (fixes.length === 0) {
      console.log('✅ 修正が必要な不整合はありません\n');
      await pool.end();
      rl.close();
      return;
    }

    // 2. 修正内容を表示
    console.log(`修正対象: ${fixes.length}件\n`);
    console.log('以下の修正を実行します:');
    console.log('┌─────────────────────────────────────────────────────────────┐');
    for (const fix of fixes) {
      console.log(`│ "${fix.oldName}" → "${fix.newName}" (${fix.userCount}人) │`);
    }
    console.log('└─────────────────────────────────────────────────────────────┘\n');

    // 3. 確認
    const answer = await question('修正を実行しますか？ (yes/no): ');

    if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
      console.log('キャンセルしました');
      await pool.end();
      rl.close();
      return;
    }

    // 4. 修正実行
    console.log('\n修正を実行中...\n');

    for (const fix of fixes) {
      const result = await pool.query(
        `UPDATE users SET department = $1
         WHERE TRIM(LOWER(department)) = TRIM(LOWER($2))`,
        [fix.newName, fix.oldName]
      );

      console.log(`✓ "${fix.oldName}" → "${fix.newName}": ${result.rowCount}人更新`);
    }

    console.log('\n✅ すべての修正が完了しました\n');

    // 5. 最終確認
    const { rows: remainingIssues } = await pool.query(`
      SELECT DISTINCT u.department, COUNT(*) as user_count
      FROM users u
      LEFT JOIN departments d ON u.department = d.name
      WHERE u.department IS NOT NULL
        AND u.department != ''
        AND d.id IS NULL
      GROUP BY u.department
    `);

    if (remainingIssues.length > 0) {
      console.log('⚠️  まだ不整合が残っています:');
      for (const issue of remainingIssues) {
        console.log(`  - "${issue.department}" (${issue.user_count}人)`);
      }
      console.log('\nこれらはマスター部署に存在しないため、手動で対応が必要です。');
    } else {
      console.log('✅ すべての部署データが整合性を保っています');
    }

  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await pool.end();
    rl.close();
  }
}

// 実行
fixDepartmentInconsistencies();
