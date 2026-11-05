# Quad Board · 四象限任务看板

仿 Focus Matrix 的桌面级任务管理应用（Tauri v2 + React 18 + TypeScript），支持 Windows 与 macOS。

## 核心功能

- **四象限看板**：马上做 / 计划做 / 委托他人 / 别做，任务卡可跨象限拖拽与排序
- **任务编辑**：标题、备注、截止日期时间、到期提醒（可设置提前分钟数）
- **视图过滤**：全部 / 今天 / 本周 / 已逾期 / 已完成，支持标题与备注全文搜索
- **快速添加**：全局快捷键 `Ctrl+Shift+Space`（macOS 为 `Cmd+Shift+Space`）随时呼出小窗，`Alt+1~4` 切换目标象限
- **桌面集成**：系统托盘（关闭窗口即驻留后台）、到期系统通知、开机自启、窗口位置尺寸记忆、深浅色主题
- **数据安全**：本地 JSON 原子写入（临时文件 + 重命名），损坏时自动回退 `.bak` 备份；删除 5 秒内可撤销

## 开发

依赖：Node 18+、pnpm（或 npm）、Rust stable（MSVC 工具链）、WebView2（Win10/11 一般自带）。

```bash
pnpm install      # 或 npm install
pnpm dev          # 启动开发窗口（vite + cargo，热更新）
```

## 打包

```bash
pnpm dist:win     # Windows：NSIS 安装包（dist 目录）
pnpm dist:mac     # macOS：dmg（需在 Mac 上执行）
```

> 说明：Windows 上无法交叉产出 macOS 的 .dmg/.icns 已内置（图标已预生成），在任意一台 Mac 上 clone 后执行 `pnpm dist:mac` 即可；未签名的 app 首次打开需右键 → 打开。

## 数据位置

- Windows：`%APPDATA%\com.quadboard.desktop\quad-board-data.json`
- macOS：`~/Library/Application Support/com.quadboard.desktop/quad-board-data.json`

可在应用内「设置 → 数据目录」一键打开。

## 目录结构

```
├─ index.html / quick.html     主窗口 / 快速添加小窗入口
├─ src/                        React 前端（看板、抽屉、设置、快速添加）
│  ├─ components/              Board / TaskCard / Sidebar / TaskDrawer / SettingsDialog
│  ├─ store.ts                 Zustand 状态与过滤逻辑
│  └─ api.ts                   Tauri IPC 封装（含浏览器降级，可直接 pnpm dev:web 预览）
├─ src-tauri/                  Rust 后端（crate 名 quad-board，lib quad_board_lib）
│  ├─ src/store.rs             JSON 原子持久化 + 数据模型
│  ├─ src/commands.rs          任务/设置/自启/通知等命令
│  └─ src/lib.rs               托盘、全局快捷键、提醒线程、窗口事件
└─ scripts/make-icon.mjs       图标生成脚本（纯 Node，无依赖）
```
