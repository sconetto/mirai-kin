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

### Requirement: Planning guides
The system SHALL provide planning guides covering investing, tax, and estate topics in addition to the glossary and articles.

#### Scenario: Open a planning guide
- **WHEN** a user opens a planning guide
- **THEN** the system renders it in the active locale with the same rich formatting as other content

### Requirement: Contextual links
The system SHALL allow insights and reports to link to relevant glossary entries or guides.

#### Scenario: Insight explanation
- **WHEN** an insight references a financial concept
- **THEN** the user can open the related glossary entry or guide
