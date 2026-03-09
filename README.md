# OmniAgent

一个基于 Electron + React + TypeScript 的桌面 AI 助手，支持：

- 悬浮窗（热键唤起）
- 任务管理（SQLite）
- Claude 对话
- MCP 工具调用（stdio 客户端最小可用版）

## 开发启动

```bash
npm install
npm run dev
```

## MCP：如何添加别的工具（Server）

OmniAgent 通过 `userData/mcp-config.json` 管理 MCP server。
首次启动会自动生成示例配置。你也可以手动编辑为如下结构：

```json
{
  "servers": [
    {
      "id": "filesystem",
      "name": "Filesystem MCP",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "."],
      "enabled": true
    },
    {
      "id": "fetch",
      "name": "Fetch MCP",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-fetch"],
      "enabled": true
    }
  ]
}
```

字段说明：

- `id`: 唯一标识
- `name`: 展示名称
- `command`: 启动命令（如 `node` / `npx` / 可执行文件路径）
- `args`: 命令参数数组
- `cwd`: 可选，server 启动工作目录
- `env`: 可选，附加环境变量（对象）
- `enabled`: 是否启用

## 在 UI 里使用新 MCP 工具

1. 打开 `MCP` 标签页，点“刷新”
2. 对目标 server 点“连接”
3. 点“刷新工具”
4. 在 Tool 下拉里选工具
5. 点“生成模板”并填写 JSON
6. 点“执行调用”

## MCP 第二版能力

- 工具下拉选择
- 基于 `inputSchema` 的 JSON 模板生成
- JSON 格式校验
- 调用历史（重放 / 复制）

## 常见问题

### 1) better-sqlite3 ABI 报错

如果出现 `NODE_MODULE_VERSION` 不匹配，按 Electron 目标版本重编译：

```bash
npm rebuild better-sqlite3 --runtime=electron --target=30.0.1 --dist-url=https://electronjs.org/headers
```

### 2) MCP server 连接失败

- 确认 `command` 可在系统环境中执行
- 确认 `args` 正确
- 先在终端里手工运行同一命令，确认 server 能启动
