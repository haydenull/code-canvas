# npm 发布流程

本文档记录 `@haydenull/code-canvas` 发布到 npm registry 的流程。

## 发布前检查

确认依赖安装、测试和构建通过：

```bash
bun install
bun run test
bun run build
```

检查最终发布包内容。`npm pack` 会触发 `prepack`，因此会在打包前重新执行构建：

```bash
npm pack --dry-run
```

当前发布相关配置在 `package.json` 中维护：

- `name` 为 `@haydenull/code-canvas`
- `bin.code-canvas` 指向 `./dist/cli.js`
- `files` 只发布 `dist`
- `publishConfig.access` 为 `public`
- `prepack` 在 `npm pack` 和 `npm publish` 前自动执行 `bun run build`

## 发布

确认 npm 登录状态：

```bash
npm whoami
```

如未登录，先登录 npm：

```bash
npm login
```

更新版本号。按发布内容选择 `patch`、`minor` 或 `major`：

```bash
npm version patch
```

发布到 npm：

```bash
npm publish
```

`publishConfig.access` 已配置为 `public`，因此不需要在每次发布时额外传 `--access public`。

## 发布后验证

确认 npm 上的版本：

```bash
npm view @haydenull/code-canvas version
```

使用已发布的 CLI 验证：

```bash
npx -y @haydenull/code-canvas validate artifacts/example.logic.json
npx -y @haydenull/code-canvas view artifacts/example.logic.json
```
