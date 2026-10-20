# API

## ADDED Requirements

### Requirement: Versioned REST API
The system SHALL expose a REST API under `/api/v1` with URL-prefix versioning, and SHALL only make non-breaking additive changes within v1.

#### Scenario: Versioned endpoint
- **WHEN** a client calls a route under `/api/v1`
- **THEN** the system routes it to the current v1 contract

### Requirement: OpenAPI contract and docs
The system SHALL serve a machine-readable OpenAPI 3.1 document generated from the API's Zod schemas and SHALL provide interactive documentation.

#### Scenario: OpenAPI document available
- **WHEN** a client requests `/api/v1/openapi.json`
- **THEN** the system returns a valid OpenAPI 3.1 document describing all endpoints and schemas

#### Scenario: Interactive docs
- **WHEN** a user opens `/api/v1/docs`
- **THEN** the system renders interactive API documentation derived from the contract

### Requirement: Batch operations
The system SHALL support batch creation for transactions, returning per-item results with input positions and success/error status, and SHALL NOT write valid items when the request violates the schema as a whole.

#### Scenario: Batch create returns per-item results
- **WHEN** a client POSTs an array of transactions
- **THEN** the system returns a result per item including its input index, success flag, and any error

#### Scenario: Schema violation aborts whole request
- **WHEN** a batch request contains an invalid enum value
- **THEN** the system rejects the entire request before writing anything

### Requirement: Idempotency
The system SHALL honor an `Idempotency-Key` header on mutating endpoints, returning the original result for a repeated key instead of re-applying the mutation.

#### Scenario: Repeated idempotency key
- **WHEN** a client retries a mutation with the same `Idempotency-Key`
- **THEN** the system returns the original result and does not create a duplicate

### Requirement: Consistent error envelope
The system SHALL return errors in a consistent shape (`error.code`, `error.message`, optional `error.fields`) with appropriate HTTP status codes.

#### Scenario: Validation error shape
- **WHEN** a request fails validation
- **THEN** the system returns a structured error identifying the failing field and a 4xx status

### Requirement: API authentication
The system SHALL require a valid bearer token for all API endpoints and SHALL return `401` otherwise.

#### Scenario: Token required
- **WHEN** a request to an API endpoint lacks a valid bearer token
- **THEN** the system responds `401 Unauthorized`
