# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-11-03

### Added
- feat(release): add add-v-prefix input to tag releases as v7.0.0 ([#9](https://github.com/DannyvdSluijs/changelog-actions/pull/9))

### Changed
- ci: keep the changelog up to date with the repo's own actions ([#12](https://github.com/DannyvdSluijs/changelog-actions/pull/12))
- docs: drop the GITHUB_TOKEN permissions when passing an app token ([#11](https://github.com/DannyvdSluijs/changelog-actions/pull/11))
- docs: use create-github-app-token v3 in the protected-branch example ([#10](https://github.com/DannyvdSluijs/changelog-actions/pull/10))
- Add GitHub Sponsors username to FUNDING.yml ([#8](https://github.com/DannyvdSluijs/changelog-actions/pull/8))
- ci: update pinned actions and keep them current with Dependabot ([#7](https://github.com/DannyvdSluijs/changelog-actions/pull/7))
- ci: harden the workflow and the README examples ([#6](https://github.com/DannyvdSluijs/changelog-actions/pull/6))

### Fixed
- fix(update): do not allow the PR title in the commit message ([#5](https://github.com/DannyvdSluijs/changelog-actions/pull/5))
- fix(update): require the entry template to be a single list item ([#4](https://github.com/DannyvdSluijs/changelog-actions/pull/4))
- fix(update): only skip a PR when its exact entry is already present ([#3](https://github.com/DannyvdSluijs/changelog-actions/pull/3))
- fix: read changelogs over 1 MB through the blobs API ([#2](https://github.com/DannyvdSluijs/changelog-actions/pull/2))
- fix: harden handling of untrusted PR titles ([#1](https://github.com/DannyvdSluijs/changelog-actions/pull/1))
