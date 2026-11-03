import * as core from '@actions/core';
import { context, getOctokit } from '@actions/github';
import { release } from '../changelog.js';
import { createRelease, createTag, readFile, tagExists, writeFile } from '../github.js';
import { writeOutputFile } from '../output.js';
import { render } from '../template.js';
import { isPrerelease, tagName, today, validateVersion } from '../version.js';

export async function run(): Promise<void> {
  try {
    const version = validateVersion(core.getInput('version', { required: true }));
    const tag = tagName(version, core.getBooleanInput('add-v-prefix'));
    const path = core.getInput('changelog-path');
    const shouldTag = core.getBooleanInput('tag');
    const shouldRelease = core.getBooleanInput('github-release');
    const committer = { name: core.getInput('committer-name'), email: core.getInput('committer-email') };
    const octokit = getOctokit(core.getInput('token', { required: true }));
    const branch = context.ref.startsWith('refs/heads/')
      ? context.ref.slice('refs/heads/'.length)
      : (context.payload.repository?.default_branch as string);

    // Every check runs before the first write, so a failed release leaves nothing behind.
    const file = await readFile(octokit, context.repo, path, branch);
    if (!file) throw new Error(`${path} not found on ${branch}.`);
    const { content, notes } = release(file.content, version, today());
    if ((shouldTag || shouldRelease) && (await tagExists(octokit, context.repo, tag))) {
      throw new Error(`Tag ${tag} already exists.`);
    }

    const message = render(core.getInput('commit-message'), { version });
    const commitSha = await writeFile(octokit, context.repo, path, branch, content, file.sha, message, committer);
    core.info(`Committed ${commitSha} to ${branch}.`);
    core.setOutput('version', version);
    core.setOutput('tag', tag);
    core.setOutput('notes', notes);
    core.setOutput('notes-file', writeOutputFile('notes.md', notes));
    core.setOutput('commit-sha', commitSha);

    if (shouldTag) {
      await createTag(octokit, context.repo, tag, commitSha, committer);
      core.info(`Created tag ${tag}.`);
    }
    if (shouldRelease) {
      const url = await createRelease(octokit, context.repo, tag, commitSha, notes, isPrerelease(version));
      core.info(`Created release ${url}`);
      core.setOutput('release-url', url);
    }
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : String(error));
  }
}
