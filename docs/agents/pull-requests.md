# Pull requests

Read this guide before preparing or opening a pull request.

## Before opening

1. Ensure the branch addresses one focused change.
2. Add a version plan when the change affects Voltra behavior; see
   `docs/agents/version-plans.md`.
3. Ensure the website was updated to reflect changes to the public API.
4. Run and report validation proportionate to the changes.

## Description

Write for the person affected by the change: end users for public behavior and
developers for tooling, tests, documentation, or internal maintenance. Use
present tense and make the opening paragraph understandable without the diff.

Use exactly these three primary sections:

```md
## What is this?

[Describe the capability, fix, or developer-facing improvement and the gap it addresses.]

## How does it work?

[Explain the behavior or mechanism without a file-by-file changelog.]

## Why is this useful?

[State the concrete value for users, contributors, or maintainers.]
```

Do not add test-status sections, checklists, screenshots, rollout notes, or
generated-by footers unless the repository's pull request template requires
them.
