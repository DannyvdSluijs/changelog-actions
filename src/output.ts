import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Writes `content` to a new file in the runner's temp directory and returns its path. Outputs that contain
 * PR titles are also offered as a file, so workflows can use them without expanding untrusted text in a script.
 */
export function writeOutputFile(name: string, content: string): string {
  const dir = mkdtempSync(join(process.env.RUNNER_TEMP || tmpdir(), 'changelog-'));
  const path = join(dir, name);
  writeFileSync(path, content);
  return path;
}
