# Cognitive Mental Models for Elite Engineering

## 1. First-Principles Thinking
Break the problem down to its fundamental truths and reason up from there, rather than reasoning by analogy.
- *Question*: "Why is this system slow?"
- *Analogy*: "Other people use Redis caching, so let's add Redis."
- *First Principles*: "Let's profile where CPU and I/O cycles are spent. The query is scanning 500,000 unindexed rows. Adding an index reduces the scan from 500ms to 2ms without additional infrastructure."

## 2. Invariant Analysis
Identify statements that must remain true throughout system execution.
- *Examples*:
  - "Sum of debits must equal sum of credits at every transaction commit."
  - "A user session must always have a valid non-expired signature."
  - "The UI component must never display a blank screen if data is loading (show skeleton or spinner)."

## 3. Defense in Depth
Never rely on a single layer of security or validation.
- Layer 1: Client-side input validation (immediate UI feedback).
- Layer 2: API boundary schema validation (e.g., Zod / Pydantic).
- Layer 3: Database-level constraints (foreign keys, CHECK constraints, NOT NULL).

## 4. Reversible vs. Irreversible Decisions (Type 1 vs Type 2)
- **Reversible (Type 2)**: Changing a button color, tweaking a helper utility function. Decide quickly and iterate.
- **Irreversible (Type 1)**: Database schema migration, public API contract, authentication protocol. Take time to think deeply, analyze trade-offs, and verify edge cases.
