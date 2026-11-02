export type TemplateValues = Record<string, string | number>;

/** Replaces `{name}` placeholders. Unknown placeholders are left as-is. */
export function render(template: string, values: TemplateValues): string {
  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    Object.hasOwn(values, name) ? String(values[name]) : placeholder,
  );
}

/** Strips a Conventional Commit prefix such as `fix:`, `feat(parser):` or `chore!:`. */
export function stripConventionalPrefix(title: string): string {
  const stripped = title.replace(/^[a-z]+(\([^)]*\))?!?:\s*/i, '');
  return stripped === '' ? title : stripped;
}

/**
 * Replaces control characters (including CR, LF and tab) and Unicode line and paragraph separators with a
 * single space. A PR title must stay on one line: a line break would let it add Markdown headings to the
 * changelog or start a workflow command (`::name::`) in the job log.
 */
export function sanitizeTitle(title: string): string {
  return title.replace(/[\p{Cc}\p{Zl}\p{Zp}]+/gu, ' ').trim();
}

/**
 * Checks that the entry template renders a single list item. A placeholder at the start of a line, such as
 * a bare `{title}`, would let a PR title like `## [1.5.0] - 2021-01-01` become a heading in the changelog.
 */
export function validateEntryTemplate(template: string): string {
  if (/[\r\n]/.test(template.trim()) || !/^\s*[-*+] /.test(template)) {
    throw new Error(
      `entry-template must be a single line starting with a list marker such as "- ", got "${template}".`,
    );
  }
  return template;
}
