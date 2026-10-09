const { execSync, spawn } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

// 1. Load env first
try {
  require('./load-env.js');
} catch (e) {
  console.log('[run-android] Warning loading env:', e.message);
}

const rootDir = __dirname;
let workDir = rootDir;

// On Windows, bypass MAX_PATH (260 char limit) by using a virtual drive letter
if (os.platform() === 'win32') {
  const drive = 'X:';
  try {
    let existingSubst = '';
    try {
      existingSubst = execSync('subst', { encoding: 'utf8' });
    } catch (_) {}

    if (!existingSubst.includes(`${drive}\\: => ${rootDir}`)) {
      if (existingSubst.includes(`${drive}\\:`)) {
        try { execSync(`subst ${drive} /d`); } catch (_) {}
      }
      execSync(`subst ${drive} "${rootDir}"`);
    }
    workDir = `${drive}\\`;
    console.log(`[run-android] Building via ${drive}\\ to prevent Windows 260-character path limit.`);
  } catch (err) {
    console.log('[run-android] Could not map virtual drive, continuing with original path:', err.message);
  }
}

// 2. Prepare arguments
const rawArgs = process.argv.slice(2);
const args = [...rawArgs];

// Automatically ensure reverse port tunnels for connected devices
try {
  const devList = execSync('adb devices', { encoding: 'utf8' });
  const lines = devList.split('\n').filter(l => l.includes('\tdevice'));
  for (const line of lines) {
    const devId = line.split('\t')[0].trim();
    if (devId) {
      try {
        execSync(`adb -s ${devId} reverse tcp:8081 tcp:8081`);
        execSync(`adb -s ${devId} reverse tcp:8001 tcp:8001`);
        execSync(`adb -s ${devId} reverse tcp:5000 tcp:5000`);
      } catch (_) {}
    }
  }
} catch (_) {}
// Do not force --active-arch-only so universal device architectures are preserved
// (caller can still pass --active-arch-only explicitly if desired for quick emulator dev)

// Ensure Metro packager runs from physical rootDir, not the virtual drive
let isMetroRunning = false;
try {
  const netstat = execSync('netstat -ano | findstr 8081', { encoding: 'utf8' });
  if (netstat.includes(':8081')) {
    isMetroRunning = true;
  }
} catch (_) {}

if (!isMetroRunning) {
  console.log('[run-android] Starting Metro bundler from project root...');
  spawn('cmd.exe', ['/c', 'start', 'cmd.exe', '/k', 'npx', 'react-native', 'start'], {
    cwd: rootDir,
    detached: true,
    stdio: 'ignore',
  });
  try {
    execSync('timeout /t 3 /nobreak >nul 2>&1');
  } catch (_) {}
}

if (!args.includes('--no-packager')) {
  args.push('--no-packager');
}

const localCli = path.join(workDir, 'node_modules', '.bin', 'react-native.cmd');
const cmd = fs.existsSync(localCli) ? localCli : 'npx';
const cmdArgs = fs.existsSync(localCli) ? ['run-android', ...args] : ['react-native', 'run-android', ...args];

console.log(`[run-android] Running: ${cmd} ${cmdArgs.join(' ')}`);

const child = spawn(cmd, cmdArgs, {
  cwd: workDir,
  stdio: 'inherit',
  shell: true,
  env: process.env,
});

child.on('close', (code) => {
  process.exit(code || 0);
});
