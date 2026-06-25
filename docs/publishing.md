# npm Publishing

[简体中文](publishing.zh-CN.md)

This document covers the process for publishing `@haydenull/code-canvas` to the npm registry.

## Pre-publish Checks

Confirm that dependencies are installed, tests pass, and the build succeeds:

```bash
bun install
bun run test
bun run build
```

Check the final package contents. `npm pack` triggers `prepack`, which re-runs the build before packaging:

```bash
npm pack --dry-run
```

Publish-related config is maintained in `package.json`:

- `name` is `@haydenull/code-canvas`
- `bin.code-canvas` points to `./dist/cli.js`
- `files` publishes only `dist`
- `publishConfig.access` is `public`
- `prepack` automatically runs `bun run build` before `npm pack` and `npm publish`

## Publishing

Check npm login status:

```bash
npm whoami
```

If not logged in, log in first:

```bash
npm login
```

Bump the version. Choose `patch`, `minor`, or `major` based on the release:

```bash
npm version patch
```

Publish to npm:

```bash
npm publish
```

Since `publishConfig.access` is set to `public`, there is no need to pass `--access public` on each publish.

## Post-publish Verification

Confirm the version on npm:

```bash
npm view @haydenull/code-canvas version
```

Verify using the published CLI:

```bash
npx -y @haydenull/code-canvas validate artifacts/example.logic.json
npx -y @haydenull/code-canvas view artifacts/example.logic.json
```
