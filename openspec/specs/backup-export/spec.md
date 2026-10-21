# Backup & Export

## Purpose

Protect and port the workspace with scheduled backups, retention, full ZIP export, and a documented restore.

## Requirements

### Requirement: Scheduled backups
The system SHALL run scheduled PostgreSQL backups and SHALL record each backup's outcome.

#### Scenario: Successful backup
- **WHEN** the scheduled backup job runs successfully
- **THEN** a dump file is written to the backups volume and recorded with its size and timestamp

#### Scenario: Failed backup
- **WHEN** the backup job fails
- **THEN** the failure is recorded and surfaced in the data settings

### Requirement: Retention
The system SHALL retain backups for a configurable number of days and SHALL delete older backups.

#### Scenario: Retention cleanup
- **WHEN** a backup is older than the retention window
- **THEN** the system removes it from the backups volume and history

### Requirement: Backup verification
The system SHALL verify that a backup file is non-empty and readable before recording it as successful.

#### Scenario: Corrupt dump
- **WHEN** the dump file is empty or cannot be listed
- **THEN** the backup is recorded as failed

### Requirement: Manual backup
The system SHALL allow an authenticated user to trigger a backup on demand.

#### Scenario: Trigger backup
- **WHEN** a user clicks "Back up now"
- **THEN** the system runs the backup and reports the result

### Requirement: Full data export
The system SHALL produce a full data export containing the user's financial data as JSON files in a ZIP archive, excluding secrets.

#### Scenario: Download export
- **WHEN** a user downloads the full export
- **THEN** the system streams a ZIP with one JSON file per domain and a manifest

### Requirement: Restore procedure
The system SHALL document and provide a restore procedure that can restore a backup into a running deployment without exposing a destructive web endpoint.

#### Scenario: Documented restore
- **WHEN** an operator follows the restore procedure
- **THEN** the database is restored from the dump and the application starts successfully

### Requirement: Backup security
The system SHALL keep backups outside the public web root and SHALL restrict access to authenticated users.

#### Scenario: No public access
- **WHEN** an unauthenticated request targets a backup file
- **THEN** the system denies access
