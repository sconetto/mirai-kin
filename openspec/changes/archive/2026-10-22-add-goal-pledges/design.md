## Context

Goals have `manualCurrentAmount` or account allocations plus `monthlyContribution`. Pledges are a lightweight, dated contribution layer; withdrawals are detected from transfers out of linked accounts.

## Goals / Non-Goals

**Goals:**

- A pledge records amount, target date, and status (open/fulfilled/expired).
- Open pledges count toward the projected funded amount only until they expire.
- Withdrawals out of goal-linked accounts surface a warning on the goal.

**Non-Goals:**

- Automatic transfers or execution of pledges.
- Replacing existing allocations or monthly contributions.

## Decisions

### 1. Pledge model

A `goal_pledges` row holds `goal_id`, `amount`, `currency`, `due_date`, and `status`. A pledge is open until its date passes, then expired; it never auto-creates a transaction.

### 2. Projection treatment

Open pledges add to the goal's projected funding at their due date (or are excluded if expired), keeping the existing real-return projection.

### 3. Withdrawal detection

Reuse transfer data: a transfer whose source is a goal-linked account and whose destination is outside the goal is flagged as a withdrawal on that goal.
