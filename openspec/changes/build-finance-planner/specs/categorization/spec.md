# Categorization

## ADDED Requirements

### Requirement: Hierarchical categories
The system SHALL support categories organized in a parent/child hierarchy, where each category has a name and an income/expense type.

#### Scenario: Create nested category
- **WHEN** a user creates a subcategory under an existing parent category
- **THEN** the system stores the category with its parent reference intact

#### Scenario: Category type
- **WHEN** a category is created
- **THEN** the category is classified as either income or expense

### Requirement: Category management
The system SHALL allow creating, reading, updating, and deleting custom categories, while preventing deletion of categories in use or base/system categories.

#### Scenario: Delete unused category
- **WHEN** a user deletes a custom category not referenced by any transaction or budget
- **THEN** the system removes the category

#### Scenario: Delete in-use category rejected
- **WHEN** a user attempts to delete a category referenced by transactions
- **THEN** the system rejects the deletion with a clear error

### Requirement: Labels
The system SHALL support free-form labels (tags) that can be attached to transactions independently of categories.

#### Scenario: Create and apply a label
- **WHEN** a user creates a label and applies it to a transaction
- **THEN** the transaction lists the label and can be filtered by it

#### Scenario: Unique label names
- **WHEN** a user creates a label with a name that already exists
- **THEN** the system rejects the duplicate or returns the existing label instead of creating a second one
