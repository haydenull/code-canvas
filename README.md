# Code Canvas

Code Canvas 将代码的控制流和调用关系转换为可交互的流程图，帮助开发者快速理解函数、组件、Hook、事件处理器和跨文件调用链。

项目包含：

- `@haydenull/code-canvas`：校验 `.logic.json` 产物，并在 Web Viewer 中展示节点、分支、调用关系、模块分组和源码片段。
- `code-canvas-generator` Skill：让支持 Agent Skill 的编码助手阅读真实源码，并生成可被 Code Canvas 展示的流程图产物。

## 安装 CLI

推荐本地全局安装 CLI：

```bash
npm install -g @haydenull/code-canvas@latest
```

## 安装 Skill

`code-canvas-generator` Skill 位于仓库的 [`skills/code-canvas-generator`](skills/code-canvas-generator/SKILL.md) 目录。

可以使用 `npx skills` 安装：

```bash
npx skills add haydenull/code-canvas --skill code-canvas-generator
```

也可以使用 [haydenull/skills-manager](https://github.com/haydenull/skills-manager) 安装。


## 文档

- [开发说明](docs/development.md)
- [发布 npm 包](docs/publishing.md)
