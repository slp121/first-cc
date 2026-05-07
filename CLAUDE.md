# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

桌面番茄钟应用（Pomodoro Timer），使用 Electron 构建的跨平台桌面应用。应用包含主窗口和系统托盘功能，提供专注计时器。

## 常用命令

```bash
# 启动应用
npm start

# 构建安装包（Windows NSIS）
npm run build
```

## 代码架构

### Main Process (main.js)
- `createWindow()`: 创建主 BrowserWindow，禁用菜单栏
- `createTray()`: 创建系统托盘图标和右键菜单
- IPC Handlers:
  - `show-notification`: 显示系统通知
  - `update-tray`: 更新托盘提示文本

### Preload Script (preload.js)
- 通过 contextBridge 安全暴露 API 给渲染进程
- `electronAPI.showNotification()`: 显示通知
- `electronAPI.updateTray()`: 更新托盘文字
- `electronAPI.playSound()`: 播放结束提醒音效（正弦波振荡器）

### Renderer (index.html + style.css)
渲染进程 UI 与样式，接收 IPC 调用并响应。

## 安全配置
- 启用 `contextIsolation: true` 和 `nodeIntegration: false`
- 所有 Node.js 交互通过 preload 的 contextBridge 中转
