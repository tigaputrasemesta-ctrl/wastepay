# Testing Recipes & Best Practices

## 1. Unit Testing (Vitest / Jest)
- Focus on domain logic, calculation algorithms, data transformations, and custom hooks.
- Mock external network requests and third-party APIs (e.g., with MSW - Mock Service Worker).
- Avoid testing implementation details; test inputs and expected outputs.

## 2. Integration Testing (React Testing Library)
- Test components as a user interacts with them:
  - Find elements by accessible role (`getByRole('button', { name: /submit/i })`).
  - Avoid finding by CSS class or arbitrary test IDs unless necessary.
  - Assert what the user observes on the screen.

## 3. End-to-End Testing (Playwright)
- Cover critical user journeys: Sign up -> Onboarding -> Core Workflow -> Payment / Checkout.
- Run tests in parallel across headless browsers (Chromium, Firefox, WebKit).
