// Semantic Versioning 2.0.0, without a `v` prefix: tags and headings are always the bare version.
const SEMVER =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

export function validateVersion(input: string): string {
  const version = input.trim();
  if (/^v/i.test(version)) {
    throw new Error(`Version "${version}" must not start with "v"; use the bare version, e.g. "7.0.0".`);
  }
  if (!SEMVER.test(version)) {
    throw new Error(`Version "${version}" is not a valid semantic version, e.g. "7.0.0" or "7.0.0-rc1".`);
  }
  return version;
}

export function isPrerelease(version: string): boolean {
  return SEMVER.exec(version)?.[4] !== undefined;
}

export function today(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}
