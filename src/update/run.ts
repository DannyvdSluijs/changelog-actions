import * as core from '@actions/core';
import { context, getOctokit } from '@actions/github';
import { addEntry, ensureUnreleased, mentionsUrl } from '../changelog.js';
import { readFile, writeFile } from '../github.js';
import { parseCategory, parseLabelMapping, resolveCategory } from '../labels.js';
import { render, stripConventionalPrefix } from '../template.js';

const SUPPORTED_EVENTS = ['pull_request', 'pull_request_target'];

interface PullRequest {
  number: number;
  title: string;
  html_url: string;
  merged: boolean;
  user: { login: string };
  base: { ref: string };
  labels: Array<{ name: string }>;
}

export async function run(): Promise<void> {
  try {
    if (!SUPPORTED_EVENTS.includes(context.eventName) || context.payload.action !== 'closed') {
      throw new Error(
        `This action only runs on closed pull requests, got "${context.eventName}" (${context.payload.action ?? 'no action'}).`,
      );
    }

    const pr = context.payload.pull_request as PullRequest | undefined;
    if (!pr) throw new Error('The event payload has no pull request.');
    if (!pr.merged) {
      core.info(`PR #${pr.number} was closed without merging; nothing to do.`);
      return;
    }

    const path = core.getInput('changelog-path');
    const mapping = parseLabelMapping(core.getInput('label-mapping'));
    const fallback = parseCategory(core.getInput('default-category'));
    const committer = { name: core.getInput('committer-name'), email: core.getInput('committer-email') };
    const octokit = getOctokit(core.getInput('token', { required: true }));
    const branch = pr.base.ref;

    const labels = pr.labels.map((label) => label.name);
    const category = resolveCategory(labels, mapping, fallback);
    const values = {
      title: core.getBooleanInput('strip-prefixes') ? stripConventionalPrefix(pr.title) : pr.title,
      number: pr.number,
      url: pr.html_url,
      author: pr.user.login,
    };
    const entry = render(core.getInput('entry-template'), values);
    core.info(`Labels: ${labels.join(', ') || '(none)'} -> ${category}`);
    core.info(`Entry: ${entry}`);
    core.setOutput('category', category);
    core.setOutput('entry', entry);

    const file = await readFile(octokit, context.repo, path, branch);
    const current = file?.content ?? null;
    if (current !== null && (mentionsUrl(current, pr.html_url) || current.includes(entry))) {
      core.info(`${path} already has an entry for PR #${pr.number}; nothing to do.`);
      return;
    }

    const updated = addEntry(ensureUnreleased(current), category, entry);
    const message = render(core.getInput('commit-message'), values);
    const commitSha = await writeFile(octokit, context.repo, path, branch, updated, file?.sha, message, committer);
    core.info(`Committed ${commitSha} to ${branch}.`);
    core.setOutput('commit-sha', commitSha);
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : String(error));
  }
}
