// Pure Keep a Changelog parsing and editing. No GitHub or filesystem access in here,
// so everything can be unit tested against plain strings.

export const CATEGORIES = ['Added', 'Changed', 'Deprecated', 'Removed', 'Fixed', 'Security'] as const;
export type Category = (typeof CATEGORIES)[number];

export const DEFAULT_HEADER = [
  '# Changelog',
  '',
  'All notable changes to this project will be documented in this file.',
  '',
  'The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),',
  'and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).',
  '',
].join('\n');

const UNRELEASED_HEADING = '## [Unreleased]';
const UNRELEASED_PATTERN = /^## \[?Unreleased\]?\s*$/i;
const SECTION_PATTERN = /^## /;
const CATEGORY_PATTERN = /^### (.+?)\s*$/;

export function toCategory(name: string): Category | undefined {
  return CATEGORIES.find((category) => category.toLowerCase() === name.trim().toLowerCase());
}

interface Block {
  heading: string;
  category: Category | undefined;
  body: string[];
}

interface Unreleased {
  // Lines before and after the Unreleased section, untouched.
  before: string[];
  after: string[];
  // Free text between the Unreleased heading and the first category heading.
  preamble: string[];
  blocks: Block[];
}

function trimBlankLines(lines: string[]): string[] {
  let start = 0;
  let end = lines.length;
  while (start < end && lines[start]!.trim() === '') start++;
  while (end > start && lines[end - 1]!.trim() === '') end--;
  return lines.slice(start, end);
}

function splitLines(content: string): string[] {
  return content.replace(/\r\n/g, '\n').replace(/\n+$/, '').split('\n');
}

function joinLines(lines: string[]): string {
  return lines.join('\n').replace(/\n+$/, '') + '\n';
}

/**
 * Makes sure the changelog exists and has an Unreleased section. A missing file gets the
 * standard Keep a Changelog header, a missing section is inserted above the first release.
 */
export function ensureUnreleased(content: string | null): string {
  if (content === null || content.trim() === '') {
    return joinLines([...splitLines(DEFAULT_HEADER), '', UNRELEASED_HEADING]);
  }

  const lines = splitLines(content);
  if (lines.some((line) => UNRELEASED_PATTERN.test(line))) {
    return joinLines(lines);
  }

  const firstSection = lines.findIndex((line) => SECTION_PATTERN.test(line));
  if (firstSection === -1) {
    return joinLines([...trimBlankLines(lines), '', UNRELEASED_HEADING]);
  }

  return joinLines([...lines.slice(0, firstSection), UNRELEASED_HEADING, '', ...lines.slice(firstSection)]);
}

function parseUnreleased(content: string): Unreleased {
  const lines = splitLines(content);
  const start = lines.findIndex((line) => UNRELEASED_PATTERN.test(line));
  if (start === -1) {
    throw new Error('No "## [Unreleased]" section found in the changelog.');
  }

  let end = lines.findIndex((line, index) => index > start && SECTION_PATTERN.test(line));
  if (end === -1) end = lines.length;

  const preamble: string[] = [];
  const blocks: Block[] = [];
  for (const line of lines.slice(start + 1, end)) {
    const match = CATEGORY_PATTERN.exec(line);
    if (match) {
      blocks.push({ heading: line.trimEnd(), category: toCategory(match[1]!), body: [] });
    } else if (blocks.length > 0) {
      blocks[blocks.length - 1]!.body.push(line);
    } else {
      preamble.push(line);
    }
  }

  return { before: lines.slice(0, start), after: lines.slice(end), preamble: trimBlankLines(preamble), blocks };
}

// Renders the content of the Unreleased section (without its heading) in a normalised layout:
// a blank line between blocks, no blank lines between a category heading and its entries.
function renderBody(unreleased: Unreleased): string[] {
  const lines: string[] = [];
  if (unreleased.preamble.length > 0) {
    lines.push(...unreleased.preamble, '');
  }
  for (const block of unreleased.blocks) {
    const body = trimBlankLines(block.body);
    if (body.length === 0) continue;
    lines.push(block.heading, ...body, '');
  }
  return trimBlankLines(lines);
}

function hasEntries(unreleased: Unreleased): boolean {
  return unreleased.blocks.some((block) => trimBlankLines(block.body).length > 0);
}

/**
 * Adds an entry under the given category of the Unreleased section. New entries go on top of
 * their category; a missing category heading is inserted in Keep a Changelog order.
 */
export function addEntry(content: string, category: Category, entry: string): string {
  const unreleased = parseUnreleased(content);

  let block = unreleased.blocks.find((candidate) => candidate.category === category);
  if (!block) {
    block = { heading: `### ${category}`, category, body: [] };
    const order = CATEGORIES.indexOf(category);
    const index = unreleased.blocks.findIndex(
      (candidate) => candidate.category !== undefined && CATEGORIES.indexOf(candidate.category) > order,
    );
    unreleased.blocks.splice(index === -1 ? unreleased.blocks.length : index, 0, block);
  }
  block.body = [entry, ...trimBlankLines(block.body)];

  const body = renderBody(unreleased);
  return joinLines([
    ...unreleased.before,
    UNRELEASED_HEADING,
    '',
    ...body,
    ...(unreleased.after.length > 0 ? ['', ...unreleased.after] : []),
  ]);
}

/**
 * Whether the changelog already mentions the given PR URL, anywhere in the file. Used to make
 * re-runs safe. `/pull/12` does not match `/pull/123`.
 */
export function mentionsUrl(content: string, url: string): boolean {
  const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`${escaped}(?![0-9])`).test(content);
}

export function hasVersion(content: string, version: string): boolean {
  return splitLines(content).some((line) => line.startsWith(`## [${version}]`));
}

export interface ReleaseResult {
  content: string;
  notes: string;
}

/**
 * Moves everything in the Unreleased section into a new `## [version] - date` section and
 * leaves an empty Unreleased section above it.
 */
export function release(content: string, version: string, date: string): ReleaseResult {
  if (hasVersion(content, version)) {
    throw new Error(`Version ${version} already exists in the changelog.`);
  }

  const unreleased = parseUnreleased(content);
  if (!hasEntries(unreleased)) {
    throw new Error('No changes found in the [Unreleased] section.');
  }

  const body = renderBody(unreleased);
  return {
    content: joinLines([
      ...unreleased.before,
      UNRELEASED_HEADING,
      '',
      `## [${version}] - ${date}`,
      '',
      ...body,
      ...(unreleased.after.length > 0 ? ['', '', ...unreleased.after] : []),
    ]),
    notes: body.join('\n') + '\n',
  };
}
