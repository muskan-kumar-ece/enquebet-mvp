import { spawn } from 'node:child_process';

// Stress defaults (override via env if desired)
process.env.PW_STRESS = process.env.PW_STRESS ?? '1';
process.env.PW_REPEAT_EACH = process.env.PW_REPEAT_EACH ?? '3';
process.env.PW_WORKERS = process.env.PW_WORKERS ?? '4';
process.env.PW_RETRIES = process.env.PW_RETRIES ?? '1';
process.env.PW_REPORTER = process.env.PW_REPORTER ?? 'line';

const cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const args = ['playwright', 'test'];

const child = spawn(cmd, args, {
  stdio: 'inherit',
  shell: false,
  env: process.env,
});

child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
