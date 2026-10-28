import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const testsDir = path.resolve(process.cwd(), 'dist/tests');

if (!fs.existsSync(testsDir)) {
  console.error(`Tests directory not found: ${testsDir}. Did you run 'npm run build' first?`);
  process.exit(1);
}

const testFiles = fs
  .readdirSync(testsDir)
  .filter((f) => f.endsWith('.test.js'))
  .map((f) => path.join('dist/tests', f));

console.log(`[AgentForge] Executing ${testFiles.length} test suites with Node test runner...`);

const child = spawn(process.execPath, ['--test', ...testFiles], {
  stdio: 'inherit',
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
