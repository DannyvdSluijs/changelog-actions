import { describe, expect, it } from 'vitest';
import { DEFAULT_LABEL_MAPPING, parseCategory, parseLabelMapping, resolveCategory } from '../src/labels.js';

describe('parseLabelMapping', () => {
  it('uses the default mapping for empty input', () => {
    expect(parseLabelMapping('  ')).toBe(DEFAULT_LABEL_MAPPING);
  });

  it('parses a YAML mapping and keeps its order', () => {
    expect(parseLabelMapping('fixed: bug\nAdded: [feature, enhancement]\n')).toEqual([
      { category: 'Fixed', labels: ['bug'] },
      { category: 'Added', labels: ['feature', 'enhancement'] },
    ]);
  });

  it('rejects unknown categories', () => {
    expect(() => parseLabelMapping('Breaking: breaking')).toThrow('Unknown category "Breaking"');
  });

  it('rejects input that is not a mapping', () => {
    expect(() => parseLabelMapping('- bug')).toThrow('must be a YAML mapping');
  });
});

describe('parseCategory', () => {
  it('normalises the category name', () => {
    expect(parseCategory('fixed')).toBe('Fixed');
  });

  it('rejects unknown categories', () => {
    expect(() => parseCategory('Other')).toThrow('Unknown category');
  });
});

describe('resolveCategory', () => {
  it('matches labels exactly, ignoring case', () => {
    expect(resolveCategory(['Bug'], DEFAULT_LABEL_MAPPING, 'Changed')).toBe('Fixed');
    expect(resolveCategory(['debug'], DEFAULT_LABEL_MAPPING, 'Changed')).toBe('Changed');
  });

  it('lets the first matching category win', () => {
    expect(resolveCategory(['bug', 'feature'], DEFAULT_LABEL_MAPPING, 'Changed')).toBe('Added');
  });

  it('falls back to the default category', () => {
    expect(resolveCategory([], DEFAULT_LABEL_MAPPING, 'Changed')).toBe('Changed');
  });
});
