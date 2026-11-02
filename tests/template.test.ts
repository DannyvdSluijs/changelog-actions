import { describe, expect, it } from 'vitest';
import { render, sanitizeTitle, stripConventionalPrefix } from '../src/template.js';

describe('render', () => {
  it('replaces known placeholders and keeps unknown ones', () => {
    expect(render('- {title} ([#{number}]({url})) {other}', { title: 'T', number: 1, url: 'u' })).toBe(
      '- T ([#1](u)) {other}',
    );
  });
});

describe('stripConventionalPrefix', () => {
  it.each([
    ['fix: Handle x', 'Handle x'],
    ['feat(parser): Support y', 'Support y'],
    ['chore!: Drop z', 'Drop z'],
    ['Fix: Coerce quoted 0', 'Coerce quoted 0'],
    ['No prefix here', 'No prefix here'],
    ['Ratio 1:2 support', 'Ratio 1:2 support'],
  ])('%s -> %s', (title, expected) => {
    expect(stripConventionalPrefix(title)).toBe(expected);
  });
});

describe('sanitizeTitle', () => {
  it.each([
    ['Plain title', 'Plain title'],
    ['Fix `null` in `parseDate`; add tests', 'Fix `null` in `parseDate`; add tests'],
    ['Innocent\n\n## [2.0.0] - 2020-01-01', 'Innocent ## [2.0.0] - 2020-01-01'],
    ['Title\r\n::add-mask::x', 'Title ::add-mask::x'],
    ['Tab\there', 'Tab here'],
    ['Line\u2028separator\u2029para', 'Line separator para'],
    ['Escape\u001b[31m and null\u0000', 'Escape [31m and null'],
    ['  \n padded \n  ', 'padded'],
  ])('%j -> %j', (title, expected) => {
    expect(sanitizeTitle(title)).toBe(expected);
  });
});
