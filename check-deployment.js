#!/usr/bin/env node

/**
 * Deployment Verification Script
 * Checks if your Render deployment is working correctly
 */

const https = require('https');

// Color codes for terminal output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkUrl(url, expectedStatus = 200, description = '') {
  return new Promise((resolve) => {
    const startTime = Date.now();

    https.get(url, (res) => {
      const duration = Date.now() - startTime;
      const status = res.statusCode;

      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (status === expectedStatus) {
          log(`✓ ${description || url}`, 'green');
          log(`  Status: ${status} | Time: ${duration}ms`, 'blue');
          resolve({ success: true, status, body, duration });
        } else {
          log(`✗ ${description || url}`, 'red');
          log(`  Expected: ${expectedStatus}, Got: ${status}`, 'red');
          resolve({ success: false, status, body, duration });
        }
      });
    }).on('error', (err) => {
      log(`✗ ${description || url}`, 'red');
      log(`  Error: ${err.message}`, 'red');
      resolve({ success: false, error: err.message });
    });
  });
}

async function checkDeployment(backendUrl, frontendUrl) {
  log('\n========================================', 'blue');
  log('Render Deployment Verification', 'blue');
  log('========================================\n', 'blue');

  log(`Backend URL: ${backendUrl}`, 'yellow');
  log(`Frontend URL: ${frontendUrl}\n`, 'yellow');

  const results = {
    backend: {},
    frontend: {},
    api: {},
    auth: {}
  };

  // 1. Check Backend Health
  log('\n1. Backend Health Check', 'yellow');
  log('─────────────────────────────────────\n');

  results.backend.health = await checkUrl(
    `${backendUrl}/api/health`,
    200,
    'Health Endpoint'
  );

  // 2. Check Frontend
  log('\n2. Frontend Check', 'yellow');
  log('─────────────────────────────────────\n');

  results.frontend.homepage = await checkUrl(
    frontendUrl,
    200,
    'Frontend Homepage'
  );

  // 3. Check API Endpoints
  log('\n3. API Endpoints Check', 'yellow');
  log('─────────────────────────────────────\n');

  // Test login endpoint (should return 400/401 for empty credentials)
  const loginData = JSON.stringify({
    email: '',
    password: ''
  });

  const loginOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': loginData.length
    }
  };

  const loginUrl = new URL(`${backendUrl}/api/auth/login`);

  await new Promise((resolve) => {
    const req = https.request(loginUrl, loginOptions, (res) => {
      if (res.statusCode === 400 || res.statusCode === 401) {
        log('✓ Login Endpoint (correctly rejects empty credentials)', 'green');
        results.api.login = { success: true };
      } else {
        log(`✗ Login Endpoint (unexpected status: ${res.statusCode})`, 'red');
        results.api.login = { success: false };
      }
      resolve();
    });

    req.on('error', (err) => {
      log(`✗ Login Endpoint (error: ${err.message})`, 'red');
      results.api.login = { success: false };
      resolve();
    });

    req.write(loginData);
    req.end();
  });

  // 4. Test Authentication with Admin User
  log('\n4. Authentication Test', 'yellow');
  log('─────────────────────────────────────\n');

  const authData = JSON.stringify({
    email: 'admin@example.com',
    password: 'admin123'
  });

  const authOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': authData.length
    }
  };

  const authUrl = new URL(`${backendUrl}/api/auth/login`);

  await new Promise((resolve) => {
    const req = https.request(authUrl, authOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (data.token) {
            log('✓ Admin Login Successful', 'green');
            log(`  Token: ${data.token.substring(0, 20)}...`, 'blue');
            results.auth.adminLogin = { success: true, token: data.token };
          } else {
            log('✗ Admin Login Failed (no token)', 'red');
            log(`  Response: ${body}`, 'red');
            results.auth.adminLogin = { success: false };
          }
        } catch (err) {
          log('✗ Admin Login Failed (invalid JSON)', 'red');
          log(`  Response: ${body}`, 'red');
          results.auth.adminLogin = { success: false };
        }
        resolve();
      });
    });

    req.on('error', (err) => {
      log(`✗ Admin Login Failed (error: ${err.message})`, 'red');
      results.auth.adminLogin = { success: false };
      resolve();
    });

    req.write(authData);
    req.end();
  });

  // Summary
  log('\n========================================', 'blue');
  log('Summary', 'blue');
  log('========================================\n', 'blue');

  const allChecks = [
    results.backend.health?.success,
    results.frontend.homepage?.success,
    results.api.login?.success,
    results.auth.adminLogin?.success
  ];

  const passedChecks = allChecks.filter(Boolean).length;
  const totalChecks = allChecks.length;

  if (passedChecks === totalChecks) {
    log(`✓ All checks passed! (${passedChecks}/${totalChecks})`, 'green');
    log('\nYour deployment is working perfectly! 🎉\n', 'green');
    log('Next steps:', 'yellow');
    log(`1. Open: ${frontendUrl}`);
    log('2. Login with: admin@example.com / admin123');
    log('3. Start using the application!\n');
  } else {
    log(`⚠ ${passedChecks}/${totalChecks} checks passed`, 'yellow');
    log('\nSome issues detected. Check the errors above.\n', 'yellow');

    if (!results.backend.health?.success) {
      log('Backend health check failed - check backend logs', 'red');
    }
    if (!results.frontend.homepage?.success) {
      log('Frontend not accessible - check frontend deployment', 'red');
    }
    if (!results.auth.adminLogin?.success) {
      log('Authentication failed - check database initialization', 'red');
    }
  }

  return results;
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    log('\nUsage: node check-deployment.js <backend-url> <frontend-url>\n', 'yellow');
    log('Example:', 'yellow');
    log('  node check-deployment.js \\', 'blue');
    log('    https://shinsei-shonin-backend.onrender.com \\', 'blue');
    log('    https://shinsei-shonin-frontend.onrender.com\n', 'blue');

    log('Or provide URLs when prompted:\n', 'yellow');

    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    readline.question('Backend URL: ', (backendUrl) => {
      readline.question('Frontend URL: ', (frontendUrl) => {
        readline.close();
        checkDeployment(backendUrl.trim(), frontendUrl.trim());
      });
    });
  } else {
    await checkDeployment(args[0], args[1]);
  }
}

main();
