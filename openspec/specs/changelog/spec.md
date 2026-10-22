# Changelog

## Purpose

Show what changed in mirai-kin through a versioned, markdown-driven changelog.

## Requirements

### Requirement: Markdown changelog
The system SHALL render a changelog from a markdown file at the `/changelog` route.

#### Scenario: View changelog
- **WHEN** a user opens `/changelog`
- **THEN** the changelog markdown is rendered with the configured markdown pipeline

### Requirement: Discoverability
The system SHALL expose a navigation link to the changelog.

#### Scenario: Find changelog
- **WHEN** the app shell is displayed
- **THEN** a link to `/changelog` is available

### Requirement: Versioned entries
The system SHALL organize changelog content by version with dates.

#### Scenario: Version grouping
- **WHEN** multiple versions are present in the changelog file
- **THEN** each version is shown as a dated section
