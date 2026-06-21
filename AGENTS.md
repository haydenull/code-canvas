# Code Canvas 开发指南

## 1. 项目概述

Code Canvas 是面向开发者的代码流程产物校验与可视化工具，将控制流和调用关系展示为可交互流程图。

## 2. 技术栈

- **运行时与包管理**: Bun。
- **语言与模块**: 严格模式 TypeScript、ES Modules、ES2022。
- **CLI**: Commander 15。
- **Viewer**: React、Vite、React Flow、Dagre、Shiki。
- **数据校验**: Zod 4。
- **测试**: `bun:test`。

## 3. 开发规则

- 共享 Schema、校验和流程转换逻辑放在 `src/shared/`；仅界面行为放在 `src/viewer/`。
- 函数和变量使用 `camelCase`，React 组件与接口使用 `PascalCase`。
- 测试文件命名为 `<subject>.test.ts`，统一放在 `src/__tests__/`。
- 修改 Schema、产物生成或流程转换时，添加正常行为和相关拒绝场景测试。
- 提交使用 `type(scope): 简短说明`，且每个提交只处理一个主题。
- Viewer 变更在合并请求中附截图或短视频；产物格式变更附代表性 `.logic.json`。

## 4. 常用命令

安装依赖：

```bash
bun install
```

打开示例产物：

```bash
bun run view
```

校验产物：

```bash
bun src/cli.ts validate artifacts/example.logic.json
```

启动 Viewer：

```bash
bun src/cli.ts view artifacts/example.logic.json
bun src/cli.ts view artifacts/example.logic.json --host 0.0.0.0 --port 4173
```

运行测试和类型检查：

```bash
bun run test
bun run check
```

构建 CLI 并执行类型检查：

```bash
bun run build
```

验证构建产物：

```bash
bun dist/cli.js validate artifacts/example.logic.json
```

## 5. 文档索引

仓库当前没有 `docs/` 目录；开发相关文档如下：

- `README.md` - 项目定位、环境要求、快速开始、CLI 用法和目录概览。
- `AGENTS.md` - AI 开发约束、技术栈、常用命令和文档入口。
- `skills/code-canvas-generator/SKILL.md` - 流程图产物生成步骤、JSON 契约和检查清单。
- `skills/code-canvas-generator/references/example.logic.json` - 生成器产物的完整结构示例。
