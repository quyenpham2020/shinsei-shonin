#!/usr/bin/env node

const { spawn, exec } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

console.log('\n========================================');
console.log('  Shinsei-Shonin Auto Internet Setup');
console.log('========================================\n');

let backendNgrok = null;
let frontendNgrok = null;

// Kill existing ngrok processes
function killNgrok() {
  return new Promise((resolve) => {
    exec('taskkill /F /IM ngrok.exe', () => {
      setTimeout(resolve, 2000);
    });
  });
}

// Start ngrok process
function startNgrok(port, name) {
  console.log(`[Starting] ${name} ngrok on port ${port}...`);
  const process = spawn('ngrok', ['http', port.toString()], {
    stdio: 'ignore',
    detached: false
  });
  return process;
}

// Get ngrok URL from API
async function getNgrokUrl(port, maxRetries = 15) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch('http://localhost:4040/api/tunnels');
      const data = await response.json();

      for (const tunnel of data.tunnels) {
        if (tunnel.config.addr.includes(`:${port}`)) {
          return tunnel.public_url;
        }
      }
    } catch (error) {
      // Ngrok API not ready yet
    }

    console.log(`  Waiting for ngrok API... (${i + 1}/${maxRetries})`);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  throw new Error(`Could not get ngrok URL for port ${port}`);
}

// Update .env file
function updateEnvFile(backendUrl) {
  console.log('\n[Updating] frontend/.env file...');
  const envPath = path.join(__dirname, 'frontend', '.env');
  const envContent = `# Frontend Environment Variables

# API URL
# Auto-configured by auto-setup-internet.js
VITE_API_URL=${backendUrl}

# Backup: For local network access
# VITE_API_URL=http://192.168.3.5:3001
`;

  fs.writeFileSync(envPath, envContent, 'utf8');
  console.log('  ✓ .env file updated!');
}

// Build frontend
function buildFrontend() {
  return new Promise((resolve, reject) => {
    console.log('\n[Building] Frontend...');
    const build = spawn('npm', ['run', 'build'], {
      cwd: path.join(__dirname, 'frontend'),
      stdio: 'inherit',
      shell: true
    });

    build.on('close', (code) => {
      if (code === 0) {
        console.log('  ✓ Frontend built successfully!');
        resolve();
      } else {
        reject(new Error('Frontend build failed'));
      }
    });
  });
}

// Main execution
async function main() {
  try {
    // Step 1: Clean up
    console.log('[1/6] Cleaning up existing ngrok processes...');
    await killNgrok();

    // Step 2: Start backend ngrok
    console.log('\n[2/6] Starting backend ngrok...');
    backendNgrok = startNgrok(3001, 'Backend');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Step 3: Get backend URL
    console.log('\n[3/6] Getting backend URL...');
    const backendUrl = await getNgrokUrl(3001);
    console.log(`  ✓ Backend URL: ${backendUrl}`);

    // Step 4: Update .env
    console.log('\n[4/6] Updating configuration...');
    updateEnvFile(backendUrl);

    // Step 5: Build frontend
    console.log('\n[5/6] Building frontend...');
    await buildFrontend();

    // Step 6: Start frontend ngrok
    console.log('\n[6/6] Starting frontend ngrok...');
    frontendNgrok = startNgrok(3000, 'Frontend');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Get frontend URL
    const frontendUrl = await getNgrokUrl(3000);

    // Display results
    console.log('\n========================================');
    console.log('  ✓ Setup Complete!');
    console.log('========================================\n');
    console.log(`Backend URL:  ${backendUrl}`);
    console.log(`Frontend URL: ${frontendUrl}\n`);
    console.log('========================================');
    console.log('  Access from anywhere:');
    console.log(`  ${frontendUrl}`);
    console.log('========================================\n');
    console.log('Ngrok Dashboard: http://localhost:4040\n');
    console.log('Press Ctrl+C to stop...\n');

    // Keep running
    process.on('SIGINT', async () => {
      console.log('\n\nStopping ngrok tunnels...');
      await killNgrok();
      process.exit(0);
    });

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await killNgrok();
    process.exit(1);
  }
}

main();
