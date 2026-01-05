/**
 * Master Test Runner
 * Runs all test suites and generates comprehensive report
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

const testSuites = [
  { name: 'Authentication', file: '01-auth-test.js' },
  { name: 'User Management', file: '02-users-test.js' },
  { name: 'Application Management', file: '03-applications-test.js' },
  { name: 'Weekly Reports', file: '04-weekly-reports-test.js' },
  { name: 'Departments & Teams', file: '05-departments-teams-test.js' },
  { name: 'System Access', file: '06-system-access-test.js' },
  { name: 'Favorites & Feedback', file: '07-favorites-feedback-test.js' },
];

let totalPassed = 0;
let totalFailed = 0;
let totalTests = 0;
let results = [];

function log(message, color = 'reset') {
  const colorCode = colors[color] || colors.reset;
  console.log(`${colorCode}${message}${colors.reset}`);
}

function runTest(testFile) {
  return new Promise((resolve, reject) => {
    const testPath = path.join(__dirname, 'api', testFile);

    log(`\n${'='.repeat(80)}`, 'bright');
    log(`Running: ${testFile}`, 'cyan');
    log('='.repeat(80), 'bright');

    const child = spawn('node', [testPath], {
      stdio: 'inherit',
      cwd: __dirname,
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, code });
      } else {
        resolve({ success: false, code });
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

async function runAllTests() {
  log('\n\n', 'reset');
  log('╔═══════════════════════════════════════════════════════════════════════════════╗', 'bright');
  log('║                         SHINSEI-SHONIN TEST SUITE                             ║', 'cyan');
  log('║                         Comprehensive API Testing                             ║', 'cyan');
  log('╚═══════════════════════════════════════════════════════════════════════════════╝', 'bright');
  log(`Started at: ${new Date().toLocaleString()}`, 'blue');
  log('', 'reset');

  const startTime = Date.now();

  for (const suite of testSuites) {
    try {
      const result = await runTest(suite.file);
      results.push({
        name: suite.name,
        file: suite.file,
        success: result.success,
        exitCode: result.code,
      });

      // Try to read summary file
      const summaryFile = path.join(__dirname, 'logs', `${suite.name.replace(/\s+/g, '-')}-summary.json`);
      if (fs.existsSync(summaryFile)) {
        const summary = JSON.parse(fs.readFileSync(summaryFile, 'utf8'));
        totalPassed += summary.passed || 0;
        totalFailed += summary.failed || 0;
        totalTests += summary.total || 0;
      }

      // Wait a bit between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      log(`Error running ${suite.name}: ${error.message}`, 'red');
      results.push({
        name: suite.name,
        file: suite.file,
        success: false,
        error: error.message,
      });
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  // Print summary
  log('\n\n', 'reset');
  log('╔═══════════════════════════════════════════════════════════════════════════════╗', 'bright');
  log('║                            TEST EXECUTION SUMMARY                             ║', 'cyan');
  log('╚═══════════════════════════════════════════════════════════════════════════════╝', 'bright');
  log('', 'reset');

  log('Test Suites:', 'bright');
  results.forEach(result => {
    const status = result.success ? '✅ PASSED' : '❌ FAILED';
    const statusColor = result.success ? 'green' : 'red';
    log(`  ${status} - ${result.name}`, statusColor);
  });

  log('', 'reset');
  log('Overall Statistics:', 'bright');
  log(`  Total Test Suites: ${results.length}`, 'blue');
  log(`  Passed Suites: ${results.filter(r => r.success).length}`, 'green');
  log(`  Failed Suites: ${results.filter(r => !r.success).length}`, results.filter(r => !r.success).length > 0 ? 'red' : 'reset');
  log('', 'reset');
  log(`  Total Individual Tests: ${totalTests}`, 'blue');
  log(`  Passed Tests: ${totalPassed}`, 'green');
  log(`  Failed Tests: ${totalFailed}`, totalFailed > 0 ? 'red' : 'reset');
  log('', 'reset');
  log(`  Total Duration: ${duration}s`, 'blue');
  log(`  Average per Suite: ${(duration / results.length).toFixed(2)}s`, 'blue');
  log('', 'reset');

  // Save master report
  const reportFile = path.join(__dirname, 'logs', `master-report-${Date.now()}.json`);
  fs.writeFileSync(reportFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    duration: duration,
    totalSuites: results.length,
    passedSuites: results.filter(r => r.success).length,
    failedSuites: results.filter(r => !r.success).length,
    totalTests: totalTests,
    passedTests: totalPassed,
    failedTests: totalFailed,
    suiteResults: results,
  }, null, 2));

  log(`Master report saved to: ${reportFile}`, 'blue');
  log('', 'reset');

  log('Logs and screenshots available in:', 'blue');
  log(`  - Logs: ${path.join(__dirname, 'logs')}`, 'blue');
  log(`  - Screenshots: ${path.join(__dirname, 'screenshots')}`, 'blue');
  log('', 'reset');

  log('╔═══════════════════════════════════════════════════════════════════════════════╗', 'bright');
  const finalStatus = totalFailed === 0 && results.filter(r => !r.success).length === 0;
  if (finalStatus) {
    log('║                          ✅ ALL TESTS PASSED ✅                               ║', 'green');
  } else {
    log('║                          ❌ SOME TESTS FAILED ❌                              ║', 'red');
  }
  log('╚═══════════════════════════════════════════════════════════════════════════════╝', 'bright');
  log('', 'reset');

  process.exit(finalStatus ? 0 : 1);
}

// Run all tests
runAllTests().catch(error => {
  log(`Fatal error: ${error.message}`, 'red');
  process.exit(1);
});
