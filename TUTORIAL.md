# 🐾 PetCode Assistant — 使用教程

> 桌面 AI 萌宠助手，让 Claude 住在你桌面上。

---

## 📋 前置要求

### 1. 安装 Node.js

- 下载：https://nodejs.org/ （推荐 v18+）
- 安装后验证：

```bash
node --version   # 应显示 v18.x 或更高
npm --version
```

### 2. 安装 pnpm（推荐）

```bash
npm install -g pnpm
```

### 3. 安装 Claude Code CLI

```bash
npm install -g @anthropic-ai/claude-code
claude --version   # 验证安装
claude login       # 登录你的 Anthropic 账号
```

> ⚠️ Claude Code 需要有效的 Anthropic API 密钥或 Claude Max/Pro 订阅。

---

## 🚀 安装 PetCode Assistant

### Windows

```powershell
# 1. 克隆项目
git clone https://github.com/squff/petcode-assistant.git
cd petcode-assistant

# 2. 安装依赖
pnpm install

# 3. 安装 Electron 二进制（如果 pnpm 没自动执行）
node node_modules/.pnpm/electron@*/node_modules/electron/install.js

# 4. 启动开发模式
pnpm dev
```

### Linux / macOS

```bash
# 1. 克隆项目
git clone https://github.com/squff/petcode-assistant.git
cd petcode-assistant

# 2. 安装依赖
pnpm install

# 3. 安装 Electron 二进制（如果 pnpm 没自动执行）
node node_modules/.pnpm/electron@*/node_modules/electron/install.js

# 4. 启动开发模式
pnpm dev
```

> 💡 首次运行 `pnpm dev` 会先启动 Vite 开发服务器（~1s），然后自动打开 Electron 窗口。

---

## 🎮 基本操作

### 萌宠交互

| 操作 | 效果 |
|------|------|
| **点击萌宠** | 打开 / 关闭对话面板 |
| **按住萌宠拖动** | 移动窗口位置（移动超过 5px 才算拖拽，不会误触） |
| **拖文件到窗口** | 自动分析文件内容 |
| **右键托盘图标** | 切换角色、置顶、退出菜单 |

### 对话操作

| 操作 | 效果 |
|------|------|
| **Ctrl + Enter** | 发送消息 |
| **点击 ➕ 按钮** | 新建会话（重置上下文） |
| **点击 ■ 停止** | 中断 Claude 回复 |

---

## 🎭 角色系统

### 一二 🤍

- 安静陪伴型，白色系，呆萌风格
- 待机时轻轻呼吸
- 自动眨眼
- 思考时头顶出现 `...` 气泡
- 回答时嘴巴轻微动作

### 布布 💗

- 活泼可爱型，粉色系，团子风格
- 待机时上下浮动
- 开心时旋转一圈
- 手臂轻轻摆动
- 长时间不理会会弹出「嘿，还在吗？」提醒

### 切换角色

右键系统托盘图标 → 选择「一二」或「布布」

---

## 📁 文件分析

把文件拖到桌宠窗口上，松开后自动发送给 Claude 分析。

支持的文件类型：

| 类型 | 行为 |
|------|------|
| **代码文件** (.py/.js/.ts/.cpp/.java 等) | 读取内容，让 Claude 分析代码 |
| **文本文件** (.txt/.md/.json/.yaml 等) | 读取内容，让 Claude 总结 |
| **目录/文件夹** | 列出目录树结构（3层深度） |
| **图片** (.png/.jpg/.gif 等) | 报告文件信息（Claude CLI 不直接处理图片） |
| **大文件** (>200KB) | 只报告文件名和大小，不读取内容 |

---

## 🔄 多轮对话

PetCode Assistant 支持多轮上下文：

1. 第一次对话：Claude 创建新会话
2. 后续对话：自动使用 `--resume` 续接上下文
3. 点击 **➕** 按钮：重置为新会话

这意味着你可以：

```
你：帮我写一个 Python 快排
Claude：好的，这是快排代码...

你：改成降序排列
Claude：（理解上下文，修改代码）
```

---

## 🖥️ 系统托盘

右键任务栏右下角的紫色圆点图标：

- 💬 **打开对话** — 显示窗口并打开聊天
- 🤍 **一二** / 💗 **布布** — 切换角色
- 📌 **置顶窗口** — 勾选后窗口始终在最前面
- 🔧 **开发者工具** — 打开 Chrome DevTools 调试
- ❌ **退出** — 完全退出程序

---

## ⚙️ 配置

### 自定义 Claude 路径

如果 Claude Code 安装在非标准位置，设置环境变量：

**Windows (PowerShell)：**
```powershell
$env:CLAUDE_PATH = "C:\Users\你的用户名\AppData\Roaming\npm\claude.cmd"
pnpm dev
```

**Linux/macOS：**
```bash
CLAUDE_PATH=/usr/local/bin/claude pnpm dev
```

### 打包为安装程序

```bash
# 当前平台
pnpm dist

# 指定平台
pnpm dist:win     # Windows NSIS 安装程序
pnpm dist:linux   # Linux AppImage + deb
pnpm dist:mac     # macOS DMG
```

打包产物在 `release/` 目录下。

---

## 🔧 常见问题

### Q: 启动后窗口一片空白？

A: 开发模式需要先启动 Vite。确保用 `pnpm dev` 而不是直接 `electron .`。

### Q: 「无法启动 Claude Code」错误？

A: 检查 Claude Code 是否已安装并登录：

```bash
claude --version
claude login
```

### Q: Windows 上窗口不透明？

A: 已自动处理（`disableHardwareAcceleration`）。如果仍有问题，尝试：
- 右键 exe → 属性 → 兼容性 → 勾选「禁用全屏优化」

### Q: 对话没有上下文？

A: 确保没有点击 ➕ 新建会话。上下文通过 `--resume` 自动维护。

### Q: 拖文件没反应？

A: 确保拖到萌宠角色身上（不是窗口边缘）。松开鼠标后会自动分析。

---

## 📁 项目结构

```
petcode-assistant/
├── src/
│   ├── main/index.ts              # Electron 主进程（窗口、托盘、Claude 进程）
│   ├── preload/index.ts           # IPC bridge (petAPI)
│   └── renderer/
│       ├── App.vue                # 根组件（状态管理）
│       ├── components/
│       │   ├── PetCharacter.vue   # 萌宠角色（CSS 动画）
│       │   ├── ChatPanel.vue      # 对话面板（Markdown 渲染）
│       │   └── FileDropZone.vue   # 文件拖拽层
│       ├── env.d.ts               # TypeScript 类型声明
│       ├── main.ts                # Vue 入口
│       └── index.html             # HTML 入口
├── scripts/wait-and-launch.js     # dev 启动脚本
├── resources/                     # 图标资源目录
├── package.json
├── vite.config.ts
├── tsconfig.json
└── tsconfig.main.json
```

---

## 📄 License

MIT © open
