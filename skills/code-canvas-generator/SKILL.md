---
name: code-canvas-generator
description: 阅读任意项目的真实源码并生成 Code Canvas 可视化所需的临时 `.logic.json` 代码逻辑图。用于分析函数、组件、Hook、事件处理器、命令入口或跨文件调用链，并输出可供 `code-canvas view` 展示的 flow artifact。
---

# Code Canvas Generator

分析用户指定的代码路径，将控制流和调用关系写入新的临时 `.logic.json` 文件。生成的 artifact 会由 Code Canvas Viewer 转换为 React Flow 图形渲染，因此必须保持节点、边和源码引用语义准确。输出路径由 Code Canvas CLI 分配，本文件包含完整格式契约，不依赖目标项目中的 schema、示例或辅助脚本。

## 执行流程

1. 定位用户指定的入口，阅读入口的完整实现，以及理解该流程必需的直接调用方、被调用函数、Hook 和共享状态。优先使用 `rg` 查找定义和引用，不要分析无关代码。
2. 根据实际执行顺序建立节点和边。先覆盖主路径，再补充影响结果的重要分支、循环、提前返回和异常路径。
3. 运行 `npx @haydenull/code-canvas@latest artifact path` 获取新的 artifact 输出路径。不得自行决定默认输出目录，不得覆盖已有 artifact。
4. 将生成结果写入上一步返回的路径。
5. 运行 `npx @haydenull/code-canvas@latest validate <artifactPath>`。如果校验失败，根据错误信息修正文件并重新运行，直到命令成功。
6. 主动运行 `npx @haydenull/code-canvas@latest view <artifactPath>` 启动 Viewer 服务，并回复生成文件路径、Viewer 地址（如已启动）和可手动执行的 view 命令；若服务启动失败，说明失败原因。

如果用户给出的入口仍不明确，先阅读相关代码；只有无法可靠确定分析范围时才询问用户。

## 建图规则

- 只描述源码可以证明的行为。不要根据函数名猜测实现，不要虚构未读取的调用链。
- 表达逻辑而不是逐行复刻 AST。将目的相同的连续语句合并为一个节点。
- 将改变控制流、数据结果或副作用的重要步骤单独成节点。
- 只在目标实现确实影响当前流程时展开跨文件调用。普通库调用或无关实现只保留为调用节点。
- 每个 `branch` 表示一个明确判断，使用 `true` 和 `false` 边表示实际存在的两条路径。不要为不存在的路径制造占位节点。
- 每个 `loop` 表示一个迭代结构，使用 `loop` 边连接循环体或下一轮，使用 `next` 边连接循环结束后的步骤。
- 展开被调用函数时，使用 `call` 边进入实现，使用 `return` 边回到调用方的后续步骤。不展开实现时，按正常执行顺序连接节点。
- 使用 `error` 边连接抛出、拒绝或捕获后的错误路径。
- 使所有主流程节点都可以从 `entry` 节点到达。避免孤立节点、重复节点和没有解释价值的往返边。
- 控制图的规模，以快速理解目标逻辑为准。

## JSON 契约

顶层必须是包含以下字段的对象，不要添加未说明的自定义字段：

```json
{
  "schemaVersion": 1,
  "title": "流程名称",
  "entry": {
    "name": "入口名称",
    "file": "src/example.ts",
    "startLine": 1,
    "endLine": 20
  },
  "artifact": {
    "id": "a1b2c3d4",
    "createdAt": "2026-06-20T10:30:00+08:00"
  },
  "nodes": [],
  "edges": [],
  "notes": []
}
```

顶层约束：

- `schemaVersion` 必须是数字 `1`。
- `title` 必须是非空字符串。
- `entry.name` 和 `entry.file` 必须是非空字符串；`startLine` 和 `endLine` 必须是数字。
- `artifact.id` 必须是非空字符串，并与文件名中的 ID 一致。
- `artifact.createdAt` 必须是非空的 ISO 8601 时间字符串，使用生成时的实际时间并保留本地时区偏移。
- `nodes`、`edges` 和 `notes` 必须是数组；`notes` 中每一项必须是字符串，没有说明时使用空数组。

### 节点

每个节点必须包含：

```json
{
  "id": "n1",
  "kind": "entry",
  "label": "入口",
  "summary": "流程从这里开始。"
}
```

可选字段：

```json
{
  "codeRef": {
    "file": "src/example.ts",
    "startLine": 1,
    "endLine": 3
  },
  "code": "export function run() {\n  // ...\n}"
}
```

节点约束：

- `id`、`label` 和 `summary` 必须是非空字符串。
- `id` 在 artifact 内必须唯一，建议按阅读顺序使用 `n1`、`n2`。
- `kind` 只能是 `entry`、`statement`、`branch`、`loop`、`call`、`return`、`throw` 之一。
- `codeRef.file` 必须是仓库相对路径；`startLine` 和 `endLine` 必须是准确的 1-based 源码行号。
- `code` 必须是字符串，只复制与节点直接相关的短源码片段，保持源码原样，不要改写成伪代码；推荐 40 行以内，最多不能超过 60 行。
- 只要节点对应具体源码，就提供 `codeRef`。顶层 `entry` 始终指向用户关注流程的起点。

节点类型语义：

- `entry`：分析入口。
- `statement`：赋值、状态更新、数据转换或一组连续操作。
- `branch`：条件判断。
- `loop`：循环或集合迭代。
- `call`：关键函数、服务、Hook 或外部 API 调用。
- `return`：正常返回、提前返回或流程完成。
- `throw`：抛出异常或明确失败终点。

### 边

每条边必须包含：

```json
{
  "id": "e1",
  "source": "n1",
  "target": "n2",
  "kind": "next"
}
```

可选的 `label` 必须是字符串。边约束：

- `id`、`source` 和 `target` 必须是非空字符串。
- `id` 在 artifact 内保持唯一，建议使用 `e1`、`e2`。
- `source` 和 `target` 必须引用 `nodes` 中已有的节点 ID。
- `kind` 只能是 `next`、`true`、`false`、`loop`、`call`、`return`、`error` 之一。
- 只有路径含义不能从两端节点直接看出时才添加简短 `label`。
- 当边表示两个节点之间的关键方法、函数或命令调用关系时，优先添加 `codeHighlights`，显式标注 source 调用处和 target 声明处需要高亮的文本。

可选的 `codeHighlights` 格式：

```json
{
  "codeHighlights": [
    { "node": "source", "line": 3, "text": "startup" },
    { "node": "target", "line": 1, "text": "startup" }
  ]
}
```

高亮约束：

- `node` 只能是 `source` 或 `target`。
- `line` 是对应节点 `code` 片段内的 1-based 行号，不是源文件绝对行号。
- `text` 必须非空，并且必须出现在该行源码中。
- 被高亮的 source 或 target 节点必须包含 `code`。
- 只标注源码中真实存在的调用名、声明名或关键字符，不要让 viewer 自动猜测关系。

边类型语义：

- `next`：同一流程中的下一步。
- `true` / `false`：判断结果。
- `loop`：进入循环体或下一轮迭代。
- `call`：进入被调用实现。
- `return`：被调用实现返回调用方，或异步结果进入后续处理。
- `error`：异常或失败路径。

## 示例

生成 artifact 前读取 [references/example.logic.json](references/example.logic.json)，参考其中的完整结构、节点粒度、源码引用和分支连线。

## 输出前检查

- `npx @haydenull/code-canvas@latest validate <artifactPath>` 执行成功。
- 已尝试启动 `npx @haydenull/code-canvas@latest view <artifactPath>`，并在回复中给出 Viewer 地址或失败原因。
- 文件名、`artifact.id` 和回复中的路径一致。
- 所有必填字符串非空，所有枚举值合法。
- 节点 ID 唯一，边 ID 唯一，每条边都引用已有节点。
- `codeRef` 文件存在，行号与当前源码一致，`code` 与对应源码一致。
- 每个节点的 `code` 推荐 40 行以内，且没有任何节点超过 60 行；过长时应拆分节点或围绕关键高亮行截取更短片段。
- 主流程从 `entry` 可达，分支、循环、调用返回和错误边的方向符合实际执行过程。
- 未覆盖已有 artifact。
