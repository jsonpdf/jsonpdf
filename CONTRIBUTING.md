# Contributing to JsonPDF

## Development Setup

```sh
vp install
vp run --filter './packages/*' build
```

### Useful Commands

| Command                                                  | Description                           |
| -------------------------------------------------------- | ------------------------------------- |
| `vp run --filter './packages/*' build`                   | Build all packages                    |
| `vp run --no-cache --filter './packages/*' typecheck`    | Type-check package project references |
| `vp check`                                               | Format and lint                       |
| `vp lint`                                                | Oxlint across the workspace           |
| `vp fmt --check`                                         | Oxfmt check                           |
| `vp fmt . --write`                                       | Oxfmt auto-fix                        |
| `vp test`                                                | Run all tests                         |
| `vp run --no-cache --filter '@jsonpdf/example-*' render` | Render all example templates to PDF   |

Run a single test file:

```sh
vp test packages/renderer/__tests__/renderer.test.ts
```

CI runs: build, typecheck, check, test, examples.

## Publishing to npm

All packages are published under the `@jsonpdf` scope. During the alpha phase, every release is
tagged `alpha` so that `npm install @jsonpdf/core` never resolves to an alpha version — users must
opt in with `@alpha`.

### Prerequisites

- You must be logged in to npm with publish access to the `@jsonpdf` scope:
  ```sh
  npm login
  npm whoami  # verify
  ```
- The working tree should be clean (all changes committed).

### Steps

1. **Run CI checks locally:**

   ```sh
   vp run --filter './packages/*' build && vp run --no-cache --filter './packages/*' typecheck && vp check && vp test
   ```

2. **Bump the version** in all six `packages/*/package.json` files to the next alpha (e.g.
   `0.1.0-alpha.3` → `0.1.0-alpha.4`). All packages share the same version.

3. **Commit the version bump:**

   ```sh
   git add packages/*/package.json
   git commit -m "v0.1.0-alpha.4"
   git tag v0.1.0-alpha.4
   ```

4. **Publish:**

   ```sh
   pnpm -r publish --tag alpha
   ```

   pnpm automatically replaces `workspace:*` references with the real version in the published
   tarballs.

5. **Push:**

   ```sh
   git push && git push --tags
   ```

### Stable Releases

When the project is ready for a stable release:

1. Set the version to `0.1.0` (drop the `-alpha.N` prerelease suffix).
2. Publish without a dist-tag so it becomes the `latest`:
   ```sh
   pnpm -r publish
   ```
3. Update install commands in `README.md`, `docs/`, and `packages/cli/README.md` to remove `@alpha`.
