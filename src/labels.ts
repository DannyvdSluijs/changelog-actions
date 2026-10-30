import { parse } from 'yaml';
import { type Category, CATEGORIES, toCategory } from './changelog.js';

// Ordered: when a PR carries labels for several categories, the first matching rule wins.
export type LabelMapping = Array<{ category: Category; labels: string[] }>;

export const DEFAULT_LABEL_MAPPING: LabelMapping = [
  { category: 'Changed', labels: ['breaking', 'changed'] },
  { category: 'Added', labels: ['enhancement', 'feature', 'added'] },
  { category: 'Deprecated', labels: ['deprecated'] },
  { category: 'Removed', labels: ['removed'] },
  { category: 'Fixed', labels: ['bug', 'fix', 'fixed'] },
  { category: 'Security', labels: ['security'] },
];

/**
 * Parses the `label-mapping` input: a YAML mapping of category to a label or list of labels.
 *
 *   Added: [enhancement, feature]
 *   Fixed: bug
 */
export function parseLabelMapping(input: string): LabelMapping {
  if (input.trim() === '') return DEFAULT_LABEL_MAPPING;

  const parsed: unknown = parse(input);
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('label-mapping must be a YAML mapping of category to labels.');
  }

  return Object.entries(parsed).map(([key, value]) => {
    const category = toCategory(key);
    if (!category) {
      throw new Error(`Unknown category "${key}" in label-mapping. Use one of: ${CATEGORIES.join(', ')}.`);
    }
    const labels = Array.isArray(value) ? value : [value];
    if (labels.some((label) => typeof label !== 'string' || label.trim() === '')) {
      throw new Error(`label-mapping for "${key}" must be a label or a list of labels.`);
    }
    return { category, labels: labels.map((label: string) => label.trim()) };
  });
}

export function parseCategory(input: string): Category {
  const category = toCategory(input);
  if (!category) {
    throw new Error(`Unknown category "${input}". Use one of: ${CATEGORIES.join(', ')}.`);
  }
  return category;
}

/** Picks the category for a PR from its labels. Labels match exactly, ignoring case. */
export function resolveCategory(labels: string[], mapping: LabelMapping, fallback: Category): Category {
  const prLabels = new Set(labels.map((label) => label.toLowerCase()));
  const rule = mapping.find((candidate) => candidate.labels.some((label) => prLabels.has(label.toLowerCase())));
  return rule?.category ?? fallback;
}
