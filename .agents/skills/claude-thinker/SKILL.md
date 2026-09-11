---
name: claude-thinker
description: >-
  Activates deep analytical reasoning, cognitive problem decomposition, root-cause analysis (RCA),
  and architectural decision evaluation before executing complex coding tasks. Use this skill whenever
  tackling complex bugs, architectural decisions, non-trivial refactoring, or multi-step system design.
---

# Claude Analytical Reasoning & Cognitive Engine

This skill provides an advanced cognitive protocol modeled after Claude 3.7 / Opus extended thinking, enabling deep first-principles analysis, hypothesis validation, and error-free problem solving.

## When to Activate This Skill
- Complex bugs requiring root-cause analysis (RCA).
- Designing new features, system architecture, or data models.
- Evaluating trade-offs between multiple architectural approaches.
- Validating critical code paths before execution.

---

## 4-Stage Cognitive Reasoning Framework

```text
[1. Deconstruct] ──> [2. Explore & Hypothesize] ──> [3. Stress Test & Critique] ──> [4. Synthesize & Execute]
```

### Stage 1: Problem Space Deconstruction
1. **Identify the Core Physics of the Problem**:
   - What is the raw input, the required output, and the transformation logic?
   - What are the explicit vs. implicit constraints (latency, memory, concurrency, backwards compatibility)?
2. **Surface Hidden Invariants**:
   - What guarantees must never be broken (e.g., "account balance must never be negative", "token must never be sent in URL")?
3. **Map the Failure Surface**:
   - Where are the external boundaries (network calls, disk I/O, user input, third-party APIs)?

### Stage 2: Multi-Hypothesis Exploration & Trade-off Matrix
Do not jump to the first idea. Compare at least two distinct viable approaches:
| Dimension | Approach A (Direct / Pragmatic) | Approach B (Architectural / Scalable) |
| :--- | :--- | :--- |
| **Complexity** | Minimal lines of code, fast to ship | Higher abstraction, more modular |
| **Performance** | Good for N < 1000 | O(1) or O(log N) scalable |
| **Maintainability** | Simple for small teams | Isolated domain logic, easy to test |
| **Risk of Regression** | Low immediate risk | Requires schema/interface updates |

*Decision Rule*: Choose the approach that provides the highest resilience with the lowest accidental complexity.

### Stage 3: Adversarial Self-Critique (Pre-Mortem)
Ask yourself these critical questions before modifying code:
- "If this solution fails in production at 3:00 AM, what will be the cause?"
- "Does this introduce a race condition under concurrent requests?"
- "What happens if a dependent service returns null, times out, or throws a 500 error?"
- "Is there an unhandled edge case (e.g., zero items, 100,000 items, empty strings, Unicode characters)?"

### Stage 4: Execution Blueprint & Verification Checklist
1. Write down the atomic modification steps in order of dependency.
2. Execute modifications surgically, preserving existing conventions and comments.
3. Validate each step through automated tests, type checks, or runtime verification.

---

## References & Playbooks
- [Mental Models & Cognitive Tools](./references/mental_models.md)
- [Root Cause Analysis (5-Whys & RCA)](./references/root_cause_analysis.md)
