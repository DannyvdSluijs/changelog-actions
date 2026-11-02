import { describe, expect, it, vi } from 'vitest';
import { type Octokit, readFile } from '../src/github.js';

const repo = { owner: 'o', repo: 'r' };
const base64 = (text: string) => Buffer.from(text, 'utf8').toString('base64');

function fakeOctokit(file: object, blob?: object) {
  const getBlob = vi.fn().mockResolvedValue({ data: blob });
  const octokit = {
    rest: {
      repos: { getContent: vi.fn().mockResolvedValue({ data: { type: 'file', sha: 'abc', ...file } }) },
      git: { getBlob },
    },
  } as unknown as Octokit;
  return { octokit, getBlob };
}

describe('readFile', () => {
  it('decodes base64 content from the contents API', async () => {
    const { octokit, getBlob } = fakeOctokit({ encoding: 'base64', content: base64('# Changelog\n') });
    expect(await readFile(octokit, repo, 'CHANGELOG.md', 'main')).toEqual({ content: '# Changelog\n', sha: 'abc' });
    expect(getBlob).not.toHaveBeenCalled();
  });

  it('reads files over 1 MB through the blobs API', async () => {
    const { octokit, getBlob } = fakeOctokit(
      { encoding: 'none', content: '' },
      { encoding: 'base64', content: base64('# Big changelog\n') },
    );
    expect(await readFile(octokit, repo, 'CHANGELOG.md', 'main')).toEqual({ content: '# Big changelog\n', sha: 'abc' });
    expect(getBlob).toHaveBeenCalledWith({ ...repo, file_sha: 'abc' });
  });

  it('refuses a blob it cannot decode', async () => {
    const { octokit } = fakeOctokit({ encoding: 'none', content: '' }, { encoding: 'utf-16', content: '' });
    await expect(readFile(octokit, repo, 'CHANGELOG.md', 'main')).rejects.toThrow('encoding "utf-16"');
  });

  it('refuses an unknown encoding instead of reading the file as empty', async () => {
    const { octokit } = fakeOctokit({ encoding: 'something-else', content: '' });
    await expect(readFile(octokit, repo, 'CHANGELOG.md', 'main')).rejects.toThrow('encoding "something-else"');
  });
});
