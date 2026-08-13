#!/usr/bin/env tsx
/**
 * Waits for the API health endpoint, then runs all GraphQL integration scripts.
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const healthUrl = process.env.HEALTH_URL ?? 'http://localhost:4000/health';
const timeoutMs = Number(process.env.HEALTH_TIMEOUT_MS ?? 60_000);

const scripts = [
  'smoke-test.ts',
  'test-subscription.mts',
  'test-push-changes.mts',
  'test-image-upload.mts',
  'test-tv-pairing.mts',
  'test-import-chronicle.mts',
];

async function waitForHealth(): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(healthUrl);
      if (res.ok) {
        console.log(`✅ API healthy at ${healthUrl}`);
        return;
      }
    } catch {
      // retry
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`API not healthy at ${healthUrl} after ${timeoutMs}ms`);
}

function runScript(script: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const apiRoot = path.join(__dirname, '..');
    const scriptRel = path.join('scripts', script);
    console.log(`\n▶ ${script}`);
    const child = spawn('yarn', ['tsx', scriptRel], {
      cwd: apiRoot,
      stdio: 'inherit',
      env: process.env,
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${script} failed with exit code ${code ?? 'unknown'}`));
    });
  });
}

async function main() {
  await waitForHealth();
  for (const script of scripts) {
    await runScript(script);
  }
  console.log('\n✅ All API integration tests passed');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
