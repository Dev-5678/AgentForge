import fs from 'node:fs';
import path from 'node:path';

const srcHtml = path.resolve(process.cwd(), 'src/ui/dashboard.html');
const destDir = path.resolve(process.cwd(), 'dist/src/ui');
const destHtml = path.resolve(destDir, 'dashboard.html');

if (fs.existsSync(srcHtml)) {
  fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(srcHtml, destHtml);
  console.log(`[AgentForge] Copied dashboard.html -> dist/src/ui/dashboard.html`);
}
