# Debts

## Purpose

Model installment, financed, mortgage, and loan debts with amortization schedules.

## Requirements

### Requirement: Debt lifecycle
The system SHALL allow creating, reading, updating, and deleting debt instruments (installments, financed goods, mortgage, loan, credit card), each with a name, type, principal, annual interest rate, term, start date, payment frequency, and amortization method.

#### Scenario: Create debt
- **WHEN** a user creates a debt with principal, rate, term, and amortization method
- **THEN** the system stores it and generates its amortization schedule

### Requirement: Price amortization
The system SHALL compute a Price (tabela Price) schedule with constant payments, where each period's interest is computed on the declining balance and the principal portion grows over time.

#### Scenario: Constant payment
- **WHEN** a debt uses the Price method
- **THEN** every scheduled payment is equal (within rounding) and interest decreases while principal increases across periods

### Requirement: SAC amortization
The system SHALL compute a SAC (Sistema de Amortização Constante) schedule with a constant principal portion and a declining payment, where interest is computed on the declining balance.

#### Scenario: Constant principal portion
- **WHEN** a debt uses the SAC method
- **THEN** each period's principal portion is constant and the total payment decreases over time

### Requirement: Schedule generation and regeneration
The system SHALL generate a full amortization schedule (period number, due date, payment, interest, principal, and remaining balance) and SHALL regenerate it idempotently when a debt's inputs change.

#### Scenario: Schedule regenerated on update
- **WHEN** a debt's principal or interest rate is updated
- **THEN** the system recomputes and replaces the schedule

#### Scenario: Remaining balance reaches zero
- **WHEN** the schedule reaches the final period
- **THEN** the remaining balance is zero within rounding tolerance
