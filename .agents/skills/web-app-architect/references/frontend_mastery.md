# Frontend Engineering Mastery Guide

## 1. Component Architecture & Separation of Concerns
1. **Presentation Components**: Pure, deterministic, no side-effects. Given props, produce UI.
2. **Container / Feature Components**: Coordinate custom hooks, server state, and handle user interactions.
3. **Custom Hooks**: Encapsulate reusable stateful logic (e.g., `useDebounce`, `useMediaQuery`, `useLocalStorage`).

## 2. Accessible UI Component Best Practices
- **Dialogs & Modals**:
  - Trap focus inside the dialog when open.
  - Return focus to the trigger button when closed.
  - Close on `Escape` key press or backdrop click.
  - Apply `aria-modal="true"` and `role="dialog"`.
- **Keyboard Navigation**:
  - All interactive elements must be accessible via keyboard (`tabIndex={0}`).
  - Maintain visible focus indicators (`focus-visible:ring-2`).

## 3. Hydration Safety in SSR
Never do this:
```tsx
// BUG: Causes Hydration Mismatch!
return <div>Current Time: {new Date().toLocaleTimeString()}</div>;
```
Do this instead:
```tsx
const [time, setTime] = useState<string | null>(null);
useEffect(() => {
  setTime(new Date().toLocaleTimeString());
}, []);
return <div>Current Time: {time ?? 'Loading...'}</div>;
```
