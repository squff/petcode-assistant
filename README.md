# 🐾 PetCode Assistant

桌面AI萌宠助手 — 像一个真正的 living AI assistant 一样生活在你的桌面上。

## ✨ 特性

- 🎭 **双角色系统** — 一二（安静陪伴型）和 布布（活泼可爱型）
- 🤖 **Claude Code 接入** — 直接连接本地 Claude Code CLI，流式输出
- 📁 **文件拖拽分析** — 拖文件到萌宠身上，自动分析代码/文档/图片
- 💬 **气泡对话** — 毛玻璃 UI，Markdown 渲染，代码高亮
- 🖥️ **真正桌面级** — 透明窗口、系统托盘、Always On Top、窗口拖拽
- 🎬 **丝滑动画** — 呼吸、眨眼、浮动、思考、开心旋转
- 🌍 **跨平台** — Linux / Windows / macOS

## 📦 技术栈

| 层 | 技术 |
|---|---|
| 桌面壳 | Electron 42 |
| 前端 | Vue 3 + TypeScript + Vite |
| AI | Claude Code CLI (`-p --output-format stream-json`) |
| 动画 | CSS Keyframes + 状态机 |
| 存储 | 本地 JSON 会话 |

## 🚀 快速开始

```bash
# 克隆
git clone https://github.com/squff/petcode-assistant.git
cd petcode-assistant

# 安装依赖
pnpm install

# 安装 Electron 二进制（如果 pnpm 没自动执行）
node node_modules/.pnpm/electron@*/node_modules/electron/install.js

# 开发模式
pnpm dev

# 构建
pnpm build

# 打包
pnpm dist         # 当前平台
pnpm dist:linux   # Linux AppImage + deb
pnpm dist:win     # Windows NSIS
pnpm dist:mac     # macOS DMG
```

## 🎮 使用方式

- **点击萌宠** → 打开/关闭对话面板
- **拖拽萌宠** → 移动窗口位置
- **拖文件到窗口** → 自动分析文件
- **Ctrl+Enter** → 发送消息
- **系统托盘右键** → 切换角色、置顶、退出

## 🎭 角色

### 一二 🤍
- 安静陪伴型，白色系，呆萌风格
- 待机呼吸动画，眨眼，思考时摇头

### 布布 💗
- 活泼可爱型，粉色系，团子风格
- 待机上下浮动，开心时旋转，长时间不理会主动提醒

## 📁 项目结构

```
petcode-assistant/
├── src/
│   ├── main/              # Electron 主进程
│   │   └── index.ts       # 窗口、托盘、Claude Code 进程管理
│   ├── preload/
│   │   └── index.ts       # IPC bridge (petAPI)
│   └── renderer/
│       ├── App.vue         # 根组件
│       ├── main.ts         # 入口
│       ├── index.html      # HTML
│       ├── env.d.ts        # 类型声明
│       └── components/
│           ├── PetCharacter.vue  # 萌宠角色 + CSS 动画
│           ├── ChatPanel.vue     # 对话面板 + Markdown
│           └── FileDropZone.vue  # 文件拖拽层
├── scripts/
│   └── wait-and-launch.js # dev 模式启动脚本
├── resources/             # 图标资源
├── package.json
├── vite.config.ts
├── tsconfig.json
└── tsconfig.main.json
```

## 🔧 前置要求

- Node.js >= 18
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) 已安装并登录
- pnpm（推荐）或 npm

## 🖥️ 平台说明

### Linux
- 需要 GTK3 和 WebKit2GTK 运行时（大多数桌面发行版自带）
- 打包为 AppImage 和 deb

### Windows
- 自动禁用硬件加速以支持透明窗口
- 打包为 NSIS 安装程序
- 系统托盘使用 .ico 图标

### macOS
- 支持 DMG 打包
- 原生 Retina 支持

## 📄 License

MIT © open
