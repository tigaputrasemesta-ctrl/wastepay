# Refactoring Catalog & Code Smell Detection

## 1. Common Code Smells & Solutions
- **Long Method (> 30 lines)**: Extract helper functions for discrete steps.
- **Feature Envy**: A method that accesses more data from another object than its own. Move the method to the owner of the data.
- **Primitive Obsession**: Using basic strings or numbers for domain concepts (e.g., using `string` for a ZIP code, phone number, or currency). Create value objects or branded types.
- **Deep Nesting (> 3 levels)**: Use guard clauses / early returns to flatten conditional trees.
