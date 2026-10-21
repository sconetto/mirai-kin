# Auth

## Purpose

Protect the single-user workspace with session login and bearer-token API access.

## Requirements

### Requirement: Single-user login
The system SHALL provide a login form that authenticates a single user against credentials supplied via environment variables (`AUTH_USERNAME` and `AUTH_PASSWORD_HASH`).

#### Scenario: Successful login
- **WHEN** a user submits the correct username and password
- **THEN** the system establishes an authenticated session and redirects to the dashboard

#### Scenario: Failed login
- **WHEN** a user submits an incorrect username or password
- **THEN** the system rejects the attempt with a generic error and does not establish a session

### Requirement: Session protection
The system SHALL issue an httpOnly, signed session cookie on successful login and SHALL require a valid session to access dashboard pages.

#### Scenario: Unauthenticated access
- **WHEN** an unauthenticated request targets a dashboard route
- **THEN** the system redirects to the login page

#### Scenario: Logout
- **WHEN** the user logs out
- **THEN** the system invalidates the session cookie and redirects to the login page

### Requirement: API token authentication
The system SHALL authenticate REST API requests using a bearer token provided in the `Authorization` header, validated against the `API_TOKEN` environment variable.

#### Scenario: Valid API token
- **WHEN** an API request includes a matching `Authorization: Bearer <token>`
- **THEN** the system processes the request

#### Scenario: Missing or invalid API token
- **WHEN** an API request omits the token or supplies an incorrect token
- **THEN** the system responds with `401 Unauthorized` and does not process the request

### Requirement: Credential storage security
The system SHALL store user passwords only as salted hashes (bcrypt or argon2) and SHALL NEVER store or log plaintext credentials.

#### Scenario: Password not stored in plaintext
- **WHEN** a password is configured
- **THEN** the stored value is a salted hash and no plaintext password appears in logs, configuration, or the database
