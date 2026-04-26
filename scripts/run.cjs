#!/usr/bin/env node
// Launcher that scrubs ELECTRON_RUN_AS_NODE before invoking electron-vite.
// Some parent shells (notably VSCode's integrated terminal) set this var for
// their own internals; if it leaks in, electron.exe boots as plain Node and
// `require('electron')` returns the binary path string instead of the API.
const { spawn } = require('node:child_process');
const path = require('node:path');

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const subcommand = process.argv[2];
if (!subcommand) {
  console.error('Usage: run.cjs <dev|build|preview>');
  process.exit(1);
}

const electronViteEntry = path.join(
  __dirname,
  '..',
  'node_modules',
  'electron-vite',
  'bin',
  'electron-vite.js'
);

const child = spawn(
  process.execPath,
  [electronViteEntry, subcommand, ...process.argv.slice(3)],
  { stdio: 'inherit', env }
);

child.on('close', (code) => process.exit(code ?? 1));
child.on('error', (err) => {
  console.error('Failed to launch electron-vite:', err);
  process.exit(1);
});
