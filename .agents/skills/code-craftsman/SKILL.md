---
name: code-craftsman
description: >-
  Guides precision refactoring, defensive programming, test-driven development (TDD),
  automated testing (Vitest, Jest, Playwright), and code quality audits. Use whenever
  writing tests, refactoring legacy code, fixing intricate bugs, or auditing codebases.
---

# Code Craftsman: Precision Refactoring & Testing

This skill provides methodologies to guarantee high software quality, bulletproof test coverage, and clean refactoring without unintended regressions.

---

## 1. Test-Driven Development (TDD) Workflow

Follow the Red-Green-Refactor cycle:
1. **Red**: Write a failing test that clearly defines the expected behavior and edge cases.
2. **Green**: Write the minimal code necessary to make the test pass.
3. **Refactor**: Improve code readability, modularity, and efficiency while ensuring tests stay green.

```typescript
// Example: Comprehensive Unit Test with Vitest
import { describe, it, expect } from 'vitest';
import { calculateDiscount } from './pricing';

describe('calculateDiscount', () => {
  it('should apply percentage discount accurately', () => {
    const result = calculateDiscount(100, { type: 'PERCENT', value: 20 });
    expect(result).toBe(80);
  });

  it('should prevent negative prices when discount exceeds total', () => {
    const result = calculateDiscount(50, { type: 'FIXED', value: 100 });
    expect(result).toBe(0);
  });

  it('should throw an error for invalid negative prices', () => {
    expect(() => calculateDiscount(-10, { type: 'PERCENT', value: 10 })).toThrowError(
      'Price cannot be negative'
    );
  });
});
```

---

## 2. Precision Refactoring Rules
- **Keep Tests Running**: Never begin a refactor without existing tests or newly written baseline tests.
- **Surgical Commits**: Separate cosmetic formatting changes from functional refactoring.
- **Extract Function / Hook**: When a block of code handles a separate sub-concern, extract it into a pure function with a descriptive name.

---

## References & Playbooks
- [Testing Recipes & Patterns](./references/testing_recipes.md)
- [Refactoring Catalog & Smells](./references/refactoring_catalog.md)
