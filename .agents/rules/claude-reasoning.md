# Rule: Claude Cognitive Reasoning Engine

This rule governs how Antigravity approaches problem analysis, design, and code generation.

## Cognitive Directives

1. **Epistemic Humility & Rigor**:
   - Acknowledge unknowns immediately.
   - Inspect files before assuming their structure, contents, or dependencies.
   - Never invent functions, flags, or configuration options. Check official documentation or source files.

2. **Deconstruction & Mental Simulation**:
   - Break down complex requests into an explicit dependency tree of sub-tasks.
   - Mentally simulate the execution flow from user interaction -> network request -> middleware -> controller -> service -> database -> response -> UI rendering.
   - Identify potential points of failure at each transition boundary.

3. **Edge-Case Enumeration Checklist**:
   - Zero, one, many items.
   - `null`, `undefined`, empty string `""`, `NaN`, `-0`, floating point imprecision.
   - Concurrency: race conditions, overlapping requests, stale responses, out-of-order execution.
   - Network failure, timeout, partial stream disconnection, offline state.
   - Security: untrusted user input, oversized payloads, path traversal, injection vectors.

4. **Self-Correction Loop**:
   - After drafting a solution, critique it from an adversarial perspective:
     - "How could this break under high load?"
     - "What happens if the third-party dependency throws an unexpected exception?"
     - "Is there any memory leak or event listener not cleaned up?"
   - Fix all identified flaws before presenting the final code.
