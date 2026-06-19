// Reproducible capture harness for the README demo GIF.
// Steps: build the package -> generate the deterministic sample PDF -> run VHS
// against scripts/demo.tape -> leave assets/demo.gif in place.
// Run: npm run capture   (requires `vhs` on PATH: brew install vhs)

import { execSync } from 'child_process';
import { existsSync, copyFileSync, rmSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const run = (cmd) => execSync(cmd, { cwd: ROOT, stdio: 'inherit' });

// 1. Ensure the CLI is built.
if (!existsSync(resolve(ROOT, 'dist', 'cli.js'))) {
	console.log('Building package…');
	run('npm run build');
}

// 2. Generate the deterministic sample PDF.
run('node scripts/make-sample.mjs');

// 3. The tape runs in ROOT and references `secret.pdf`; stage it there.
const sampleSrc = resolve(ROOT, 'assets', 'secret.pdf');
const sampleStaged = resolve(ROOT, 'secret.pdf');
copyFileSync(sampleSrc, sampleStaged);

// 4. Render the GIF.
try {
	run('vhs scripts/demo.tape');
} finally {
	// 5. Clean up staged artifacts (kept out of git).
	rmSync(sampleStaged, { force: true });
	rmSync(resolve(ROOT, 'clean.pdf'), { force: true });
}

console.log('Done — assets/demo.gif');
