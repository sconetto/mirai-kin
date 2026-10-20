# Knowledge

## ADDED Requirements

### Requirement: Static content rendering
The system SHALL render static markdown/MDX content (finance articles and a glossary) as styled pages with headings, lists, tables, and callouts.

#### Scenario: Render article
- **WHEN** a user opens a knowledge article
- **THEN** the system renders the content with rich formatting (headings, tables, callouts) rather than raw text

### Requirement: Glossary
The system SHALL provide a finance glossary listing defined terms with their explanations.

#### Scenario: Browse glossary
- **WHEN** a user opens the glossary
- **THEN** the system lists terms and displays each term's definition

### Requirement: Localized content
The system SHALL serve knowledge content in the active locale, falling back to a default locale when a translation is missing.

#### Scenario: Missing translation falls back
- **WHEN** a knowledge article is requested in a locale where it is not authored
- **THEN** the system serves the default-locale version

### Requirement: Content navigation
The system SHALL provide a navigation surface (index and links) so users can discover and browse knowledge content.

#### Scenario: Discover articles
- **WHEN** a user opens the learn section
- **THEN** the system lists available articles with links and, where present, their titles in the active locale
