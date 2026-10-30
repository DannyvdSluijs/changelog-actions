import { describe, expect, it } from 'vitest';
import { render, stripConventionalPrefix } from '../src/template.js';

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
