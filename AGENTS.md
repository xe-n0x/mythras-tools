
# Mythras Tools — Project Instructions

## Goal
Develop an interactive character sheet and combat companion for Mythras using the existing Angular codebase.

## Non-negotiable rules

1. Follow official Mythras rules strictly.
2. Never invent game mechanics, modifiers or formulas.
3. If a rule cannot be verified, report it and request a source.
4. Clearly distinguish core rules from optional rules.
5. Preserve existing character JSON save compatibility.
6. Do not change rule calculations while working on UI tasks.
7. Do not rewrite working modules without justification.
8. Keep combat logic separate from UI components.

## Development process

- Inspect existing implementations before writing code.
- Prefer small, focused changes.
- Add tests for all rule calculations.
- Run relevant tests and production build after changes.
- Report changed files, test results and unresolved issues.
- Do not update major dependencies without approval.

## UI goals

- Character sheet optimized for gameplay.
- Related information grouped together.
- Minimal navigation and unnecessary scrolling.
- Responsive desktop and mobile layouts.
- Integrated contextual dice rolls.
- No generic dashboard-style design.

## Communication

- Communicate in Russian.
- Explain important architectural decisions.
- Explicitly identify unverified Mythras rules.

## Authoritative Mythras Rule Sources

The normative source for game mechanics is the local Mythras Core Rules:

- `docs/rules/Mythras - core rules.pdf`

Use `docs/rules/rules-index.md` and the local text index to find passages. Verify
wording, values, and table entries in the original PDF before implementing a rule.

Additional sources, if present:
- `docs/rules/errata.pdf`

Rules for working with these documents:

1. Use the local rulebook before external sources.
2. Do not search the internet for rules unless explicitly requested.
3. Never invent or approximate Mythras mechanics.
4. Before implementing mechanics, locate the relevant rule.
5. Report the book section and printed page number.
6. Implement Weapon Reach as a configurable official optional rule. Confirm its
   applicability and exceptions in Core Rules before implementing it.
7. Implement other optional mechanics only after verifying their conditions in
   Core Rules. If a rule or formula is missing or ambiguous, ask the project owner.
8. If PDF extraction is unreliable, report the problem.
9. Do not silently substitute Mythras Imperative rules
   for Mythras Core Rules.
10. Never commit or publish copyrighted rulebook files or their full extracted text.

When implementing or modifying a game mechanic:
- Identify its authoritative source.
- Explain the mechanic being implemented.
- Add tests for the verified behavior.
- Report any unresolved rule ambiguities.
