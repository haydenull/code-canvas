# Code Canvas

Code Canvas 将代码的控制流和调用关系转换为可交互的流程图，帮助开发者快速理解函数、组件、Hook、事件处理器和跨文件调用链。

项目包含：

- `code-canvas`：通过 CLI 校验 `.logic.json` 产物，并在 Web Viewer 中展示节点、分支、调用关系、模块分组和源码片段。
- `code-canvas-generator` Skill：阅读真实源码并生成符合约定的流程图产物。

## 环境要求

- [Bun](https://bun.sh/)

## 快速开始

安装依赖：

```bash
bun install
```

打开仓库内的示例流程图：

```bash
bun run view
```

命令会启动本地服务并输出访问地址。默认监听 `127.0.0.1`，端口由系统自动分配。

## CLI 用法

开发环境下可以直接运行源码：

```bash
bun src/cli.ts validate artifacts/example.logic.json
bun src/cli.ts view artifacts/example.logic.json
```

`view` 支持指定监听地址和端口：

```bash
bun src/cli.ts view artifacts/example.logic.json --host 0.0.0.0 --port 4173
```

构建后也可以通过产物运行：

```bash
bun run build
bun dist/cli.js validate artifacts/example.logic.json
bun dist/cli.js view artifacts/example.logic.json
```

## 生成流程图产物

仓库内置的 [`code-canvas-generator`](skills/code-canvas-generator/SKILL.md) Skill 会读取指定代码入口及必要的调用链，在 `artifacts/` 下生成新的 `<id>.logic.json` 文件。

## 开发命令

```bash
bun run test   # 运行测试
bun run check  # TypeScript 类型检查
bun run build  # 构建 CLI 并执行类型检查
```

## 项目结构

```text
src/
├── cli.ts              # CLI 入口和本地 Viewer 服务
├── shared/
│   ├── flow.ts         # Artifact 到 React Flow 数据的转换与布局
│   └── schema.ts       # Artifact 数据结构与校验
└── viewer/             # React 可视化界面
skills/
└── code-canvas-generator # Code Canvas 产物生成 Skill
artifacts/              # 生成的流程图产物和示例
```
