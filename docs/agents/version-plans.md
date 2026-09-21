# Version plans

A version plan is required only for code changes that influence Voltra
behavior. Do not create a version plan for documentation-only changes.

## Create the plan

1. Generate the Changeset interactively:

   ```sh
   pnpm changeset
   ```

   Follow the prompts to select the affected publishable packages and the
   appropriate version bump.

2. Review the generated Markdown file under `.changeset/`. Package names must
   exactly match their workspace `package.json` names.
3. Write a concise, user-facing summary after the frontmatter. Describe the
   capability, behavior, or fix—not the files or implementation technique.

## Examples

An affected package:

```md
---
'@use-voltra/ios-client': patch
---

Live Activities now end cleanly after test execution instead of occasionally
remaining active until they time out.
```

## Check the plan

Run the following when dependencies are installed to confirm that the branch
contains a Changeset relative to `main`:

```sh
pnpm exec changeset status --since=main
```

Existing files in `.changeset/` are the repository's best examples for tone
and release scope.
