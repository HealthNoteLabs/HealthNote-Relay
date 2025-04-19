#!/usr/bin/env node

/**
 * HealthNote-Relay Test Dependencies Setup
 *
 * This script installs the dependencies required to run the test-relay.js script.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Setting up dependencies for HealthNote-Relay tests...');

// Check if package.json exists
const packageJsonPath = path.join(__dirname, '..', 'package.json');
let packageJson;

try {
  if (fs.existsSync(packageJsonPath)) {
    packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  } else {
    packageJson = {
      name: "healthnote-relay-tests",
      version: "1.0.0",
      description: "Test utilities for HealthNote-Relay",
      scripts: {
        "test": "node scripts/test-relay.js"
      },
      dependencies: {}
    };
    
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('Created package.json file');
  }
} catch (error) {
  console.error('Error reading/creating package.json:', error);
  process.exit(1);
}

// Make test-relay.js executable
try {
  const testScriptPath = path.join(__dirname, 'test-relay.js');
  fs.chmodSync(testScriptPath, '755');
  console.log('Made test-relay.js executable');
} catch (error) {
  console.warn('Warning: Could not make test-relay.js executable:', error.message);
}

// Check if dependencies are already installed
const dependencies = ['ws', 'nostr-tools'];
const missingDeps = dependencies.filter(dep => {
  try {
    require.resolve(dep);
    return false;
  } catch (e) {
    return !packageJson.dependencies[dep];
  }
});

if (missingDeps.length > 0) {
  console.log(`Installing missing dependencies: ${missingDeps.join(', ')}`);
  
  try {
    execSync(`npm install --save ${missingDeps.join(' ')}`, { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    console.log('Dependencies installed successfully');
  } catch (error) {
    console.error('Error installing dependencies:', error.message);
    console.log('\nPlease install the following packages manually:');
    console.log(`npm install --save ${dependencies.join(' ')}`);
    process.exit(1);
  }
} else {
  console.log('All dependencies are already installed');
}

console.log('\nSetup complete! You can now run the test script:');
console.log('node scripts/test-relay.js <relay-url> [private-key]'); 