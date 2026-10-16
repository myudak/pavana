// The Chrome Headless Shell that Remotion already downloaded (or CHROME_PATH), for capture scripts.
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export function findChrome(root) {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const dir = join(root, 'node_modules', '.remotion', 'chrome-headless-shell');
  const subdirs = (d) =>
    existsSync(d) ? readdirSync(d, { withFileTypes: true }).filter((e) => e.isDirectory()) : [];
  for (const platform of subdirs(dir)) {
    for (const sub of subdirs(join(dir, platform.name))) {
      for (const exe of ['chrome-headless-shell.exe', 'chrome-headless-shell']) {
        const p = join(dir, platform.name, sub.name, exe);
        if (existsSync(p)) return p;
      }
    }
  }
  throw new Error(
    'No Chrome found: run `pnpm --filter @pavana/video still` once or set CHROME_PATH',
  );
}
