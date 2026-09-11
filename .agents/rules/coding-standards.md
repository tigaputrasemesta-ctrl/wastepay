# Rule: Coding Standards & Software Craftsmanship

This rule enforces clean, resilient, maintainable, and thoroughly tested software across all programming languages.

## 1. Code Quality Invariants
- **SOLID Principles**:
  - Single Responsibility: Each function/class does one thing well.
  - Open/Closed: Extensible via composition and interfaces, not risky modifications.
  - Liskov Substitution: Subtypes must fulfill base contracts.
  - Interface Segregation: Small, focused interfaces rather than bloated general-purpose ones.
  - Dependency Inversion: Depend on abstractions, not concrete implementations.
- **KISS & YAGNI**:
  - Favor straightforward code over clever abstractions.
  - Do not introduce premature generalizations or unused configuration parameters.

## 2. Error Handling & Logging
- Avoid catch-all suppression. Log errors with relevant contextual metadata (timestamp, user action, input parameters without PII).
- Use custom error classes with descriptive names and HTTP status codes or domain error codes.

## 3. Testing & Verification
- Strive for comprehensive test coverage around core business logic.
- Structure tests with clear Arrange-Act-Assert (AAA) pattern.
- Test both happy paths and edge cases (unauthorized access, boundary limits, invalid data, timeouts).
