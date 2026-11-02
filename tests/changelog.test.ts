import { describe, expect, it } from 'vitest';
import { addEntry, DEFAULT_HEADER, ensureUnreleased, hasEntry, release } from '../src/changelog.js';

const header = DEFAULT_HEADER;

const released = `${header}
## [Unreleased]

## [1.1.0] - 2026-10-24

### Added
- Older feature ([#2](https://github.com/o/r/pull/2))


## [1.0.0] - 2026-09-30

### Fixed
- Older fix ([#1](https://github.com/o/r/pull/1))
`;

describe('ensureUnreleased', () => {
  it('creates a changelog with the standard header when the file is missing', () => {
    expect(ensureUnreleased(null)).toBe(`${header}\n## [Unreleased]\n`);
  });

  it('inserts the Unreleased section above the first release', () => {
    const content = `${header}\n## [1.0.0] - 2026-09-30\n\n### Fixed\n- x\n`;
    expect(ensureUnreleased(content)).toBe(`${header}\n## [Unreleased]\n\n## [1.0.0] - 2026-09-30\n\n### Fixed\n- x\n`);
  });

  it('leaves an existing Unreleased section alone', () => {
    expect(ensureUnreleased(released)).toBe(released);
  });
});

describe('addEntry', () => {
  it('adds a category heading and entry to an empty Unreleased section', () => {
    const result = addEntry(released, 'Fixed', '- A fix ([#3](https://github.com/o/r/pull/3))');
    expect(result).toBe(
      released.replace(
        '## [Unreleased]\n\n',
        '## [Unreleased]\n\n### Fixed\n- A fix ([#3](https://github.com/o/r/pull/3))\n\n',
      ),
    );
  });

  it('puts new entries on top of an existing category', () => {
    let result = addEntry(released, 'Fixed', '- first');
    result = addEntry(result, 'Fixed', '- second');
    expect(result).toContain('### Fixed\n- second\n- first\n\n## [1.1.0]');
  });

  it('inserts new category headings in Keep a Changelog order', () => {
    let result = addEntry(released, 'Fixed', '- fix');
    result = addEntry(result, 'Security', '- security');
    result = addEntry(result, 'Added', '- added');
    result = addEntry(result, 'Deprecated', '- deprecated');
    expect(result).toContain(
      '## [Unreleased]\n\n### Added\n- added\n\n### Deprecated\n- deprecated\n\n### Fixed\n- fix\n\n### Security\n- security\n\n## [1.1.0]',
    );
  });

  it('matches existing category headings case-insensitively', () => {
    const content = released.replace('## [Unreleased]\n', '## [Unreleased]\n\n### fixed\n- old\n');
    expect(addEntry(content, 'Fixed', '- new')).toContain('### fixed\n- new\n- old\n');
  });

  it('works when the Unreleased section is the last section', () => {
    const content = ensureUnreleased(null);
    expect(addEntry(content, 'Added', '- x')).toBe(`${header}\n## [Unreleased]\n\n### Added\n- x\n`);
  });

  it('does not touch released sections', () => {
    const result = addEntry(released, 'Added', '- new');
    expect(result.slice(result.indexOf('## [1.1.0]'))).toBe(released.slice(released.indexOf('## [1.1.0]')));
  });
});

describe('hasEntry', () => {
  const entry = '- Fix x ([#77](https://github.com/o/r/pull/77))';
  const pending = addEntry(released, 'Fixed', entry);

  it('finds the exact entry', () => {
    expect(hasEntry(pending, entry)).toBe(true);
  });

  it('finds the exact entry in a released section', () => {
    expect(hasEntry(released, '- Older feature ([#2](https://github.com/o/r/pull/2))')).toBe(true);
  });

  it('ignores another entry that mentions the PR URL', () => {
    const content = addEntry(released, 'Changed', '- Prep work, see https://github.com/o/r/pull/77 ([#76](https://github.com/o/r/pull/76))');
    expect(hasEntry(content, entry)).toBe(false);
  });

  it('ignores an entry that only contains the entry as part of a line', () => {
    const content = addEntry(released, 'Changed', `${entry} and more`);
    expect(hasEntry(content, entry)).toBe(false);
  });

  it('ignores released sections when asked', () => {
    expect(hasEntry(released, '- Older feature ([#2](https://github.com/o/r/pull/2))', true)).toBe(false);
    expect(hasEntry(pending, entry, true)).toBe(true);
  });
});

describe('release', () => {
  const unreleased = addEntry(addEntry(released, 'Fixed', '- fix'), 'Added', '- added');

  it('moves Unreleased into a dated version section', () => {
    const { content, notes } = release(unreleased, '1.2.0', '2026-10-27');
    expect(content).toContain(
      '## [Unreleased]\n\n## [1.2.0] - 2026-10-27\n\n### Added\n- added\n\n### Fixed\n- fix\n\n\n## [1.1.0] - 2026-10-24',
    );
    expect(notes).toBe('### Added\n- added\n\n### Fixed\n- fix\n');
  });

  it('accepts pre-release versions', () => {
    expect(release(unreleased, '2.0.0-rc1', '2026-10-27').content).toContain('## [2.0.0-rc1] - 2026-10-27');
  });

  it('fails when Unreleased is empty', () => {
    expect(() => release(released, '1.2.0', '2026-10-27')).toThrow('No changes found');
  });

  it('fails when the version already exists', () => {
    expect(() => release(unreleased, '1.1.0', '2026-10-27')).toThrow('already exists');
  });
});
