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
