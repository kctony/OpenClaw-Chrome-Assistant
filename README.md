# OpenClaw Chrome Assistant (v0.21)

[English]
A simple and lightweight Chrome extension designed to make communicating with your OpenClaw agent seamless while browsing. Whether you need to summarize a page, save a snippet, or just ask a quick question, the Lobster Assistant is always just a click away.

[繁體中文]
這是一個簡單輕量的 Chrome 擴充功能，旨在讓您在瀏覽網頁時能與 OpenClaw 助理進行無縫溝通。無論是需要摘要網頁、記錄片段，還是隨手提問，龍蝦助理隨時待命。

---

## Features / 功能 (v0.21)

1.  **Draggable Floating Icon / 可拖動圖示 (🦞)**: 
    - Click to open the dialog. / 點擊開啟對話框。
    - Drag to reposition (auto-saved). / 拖動改變位置（自動記憶）。
    - Hover for Quick Options menu (now with 500ms delay for better UX). / 滑鼠懸停顯示快速選單（新增 500ms 延遲以優化體驗）。
2.  **Smart Context Modes / 智慧情境模式**:
    - **Page Mode**: Summarize the current page via right-click or hover menu. / 摘要當前網頁。
    - **Selection Mode**: Save or analyze selected text. / 記錄或分析選取文字。
    - **Image Mode**: Explain images with a simple right-click. / 解釋圖片內容。
3.  **UI/UX Improvements / 介面優化**:
    - **Dark Mode**: Professional dark theme for comfortable night use. / 專業暗色模式。
    - **Autogrow Input**: Textarea grows as you type. / 自動長高輸入框。
    - **Fullscreen Mode (⛶)**: Toggle to cover the entire page. / 全螢幕切換按鈕。
    - **Auto-Fade**: Dialog fades to 0.1 opacity after 3s of inactivity (adjustable). / 閒置 3 秒自動淡化。
4.  **Enhanced Settings / 設定增強**:
    - **Emoji Sync**: Toolbar icon now matches your custom floating icon. / 工具列圖示同步自訂 Emoji。
    - **Gateway Auto-complete**: Automatically appends `/v1/chat/completions`. / 自動補全 Gateway URL。
    - **Bilingual Support**: Supports Traditional Chinese and English. / 支援繁體中文與英文。

## Installation / 安裝說明

1.  Open Chrome and go to `chrome://extensions/`. / 打開 Chrome 瀏覽器，進入 `chrome://extensions/`。
2.  Enable **Developer mode**. / 開啟右上角的「開發人員模式」。
3.  Click **Load unpacked**. / 點擊「載入未封裝項目」。
4.  Select the project directory. / 選擇本專案目錄。

## Configuration / 設定說明

1.  After installation, click the Lobster icon in the toolbar and select **Options**. / 安裝後，點擊工具列圖示進入「設定」。
2.  **Token**: Required (Your OpenClaw Token). / 必填 (OpenClaw Token)。
3.  **Gateway URL**: e.g., `http://localhost:18789`. / 填入基礎位址即可。
4.  **Custom Icon**: Enter an Emoji (e.g., 🤖, ⚡) to change the icon. / 可輸入 Emoji 更改圖示。

## Usage / 使用方法

- **Chat**: Click the floating 🦞 icon. / 點擊右下角圖示開啟對話框。
- **Quick Action**: Hover over the icon and select a prompt. / 滑鼠懸停在圖示上使用快速指令。
- **Right-click**: Use context menus on any page, text, or image. / 在網頁/文字/圖片上右鍵選擇功能。
