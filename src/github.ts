import type { getOctokit } from '@actions/github';

// All writes go through the GitHub API, so callers need no checkout and no git setup.

export type Octokit = ReturnType<typeof getOctokit>;

export interface Repo {
  owner: string;
  repo: string;
}

export interface Committer {
  name: string;
  email: string;
}

export interface RepoFile {
  content: string;
  sha: string;
}

function status(error: unknown): number | undefined {
  return typeof error === 'object' && error !== null && 'status' in error ? Number(error.status) : undefined;
}

/**
 * The contents API only includes the content of files up to 1 MB. For larger files it returns an empty
 * `content` with encoding `none`, so those are read through the blobs API, which handles up to 100 MB.
 * Any other encoding is refused: treating the file as empty would replace the whole changelog.
 */
async function decodeContent(
  octokit: Octokit,
  repo: Repo,
  path: string,
  file: { content: string; encoding: string; sha: string },
): Promise<string> {
  if (file.encoding === 'base64') return Buffer.from(file.content, 'base64').toString('utf8');
  if (file.encoding === 'none') {
    const { data } = await octokit.rest.git.getBlob({ ...repo, file_sha: file.sha });
    if (data.encoding === 'base64') return Buffer.from(data.content, 'base64').toString('utf8');
    throw new Error(`Cannot read ${path}: GitHub returned it with encoding "${data.encoding}".`);
  }
  throw new Error(`Cannot read ${path}: GitHub returned it with encoding "${file.encoding}".`);
}

export async function readFile(octokit: Octokit, repo: Repo, path: string, branch: string): Promise<RepoFile | null> {
  try {
    const { data } = await octokit.rest.repos.getContent({ ...repo, path, ref: branch });
    if (Array.isArray(data) || data.type !== 'file') {
      throw new Error(`${path} is not a file.`);
    }
    return { content: await decodeContent(octokit, repo, path, data), sha: data.sha };
  } catch (error) {
    if (status(error) === 404) return null;
    throw error;
  }
}

/**
 * Commits the file. Passing the `sha` we read makes GitHub reject the write when the file
 * changed in between, so a concurrent change is never overwritten. Returns the commit sha.
 */
export async function writeFile(
  octokit: Octokit,
  repo: Repo,
  path: string,
  branch: string,
  content: string,
  sha: string | undefined,
  message: string,
  committer: Committer,
): Promise<string> {
  try {
    const { data } = await octokit.rest.repos.createOrUpdateFileContents({
      ...repo,
      path,
      branch,
      message,
      content: Buffer.from(content, 'utf8').toString('base64'),
      ...(sha ? { sha } : {}),
      committer,
      author: committer,
    });
    return data.commit.sha!;
  } catch (error) {
    if (status(error) === 409) {
      throw new Error(
        `${path} changed on ${branch} while this run was in progress. Nothing was overwritten; re-run this job. ` +
          'Put all changelog workflows in one concurrency group with "queue: max" to avoid this.',
      );
    }
    if (status(error) === 403 || status(error) === 422) {
      throw new Error(
        `Could not push to ${branch}: ${error instanceof Error ? error.message : String(error)}. ` +
          'If the branch is protected, pass a token that may bypass the protection (e.g. a GitHub App token).',
      );
    }
    throw error;
  }
}

export async function tagExists(octokit: Octokit, repo: Repo, tag: string): Promise<boolean> {
  try {
    await octokit.rest.git.getRef({ ...repo, ref: `tags/${tag}` });
    return true;
  } catch (error) {
    if (status(error) === 404) return false;
    throw error;
  }
}

/** Creates an annotated tag pointing at the given commit. */
export async function createTag(
  octokit: Octokit,
  repo: Repo,
  tag: string,
  commitSha: string,
  committer: Committer,
): Promise<void> {
  const { data } = await octokit.rest.git.createTag({
    ...repo,
    tag,
    message: `Release ${tag}`,
    object: commitSha,
    type: 'commit',
    tagger: { ...committer, date: new Date().toISOString() },
  });
  await octokit.rest.git.createRef({ ...repo, ref: `refs/tags/${tag}`, sha: data.sha });
}

export async function createRelease(
  octokit: Octokit,
  repo: Repo,
  tag: string,
  commitSha: string,
  notes: string,
  prerelease: boolean,
): Promise<string> {
  const { data } = await octokit.rest.repos.createRelease({
    ...repo,
    tag_name: tag,
    target_commitish: commitSha,
    name: tag,
    body: notes,
    prerelease,
  });
  return data.html_url;
}
