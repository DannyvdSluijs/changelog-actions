import { describe, expect, it } from 'vitest';
import { isPrerelease, today, validateVersion } from '../src/version.js';

describe('validateVersion', () => {
  it.each(['7.0.0', '7.0.0-rc1', '7.0.0-rc.1', '1.2.3+build.5'])('accepts %s', (version) => {
    expect(validateVersion(version)).toBe(version);
  });

  it('rejects a v prefix', () => {
    expect(() => validateVersion('v7.0.0')).toThrow('must not start with "v"');
  });

  it.each(['7.0', '07.0.0', '7.0.0-', 'latest'])('rejects %s', (version) => {
    expect(() => validateVersion(version)).toThrow('not a valid semantic version');
  });
});

describe('isPrerelease', () => {
  it('detects pre-release versions', () => {
    expect(isPrerelease('7.0.0-rc1')).toBe(true);
    expect(isPrerelease('7.0.0')).toBe(false);
    expect(isPrerelease('7.0.0+build.1')).toBe(false);
  });
});

describe('today', () => {
  it('formats the date in UTC', () => {
    expect(today(new Date('2026-10-27T23:30:00-05:00'))).toBe('2026-10-28');
  });
});
