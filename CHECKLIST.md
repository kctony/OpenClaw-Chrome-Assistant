# Chrome Extension V2.3 功能查核清單

## A. 浮動 Icon 互動 (🦞)
- [x] 拖動功能 (Draggable)
    - [x] 🦞 Icon 可滑鼠左鍵長按拖動。
    - [x] 必須實作 **邊界檢查**，防止 Icon 被拖出瀏覽器可視區域。
    - [x] 位置必須透過 `chrome.storage.local` 持久化儲存（`lobster_icon_pos`）。
- [x] 懸停行為 (Hover)
    - [x] 滑鼠移入 Icon 時，Icon 變為不透明 (1.0)。
    - [x] **快速選單 (Hover Menu)**：移入時在 Icon 旁（視位置向左或向右）直接浮現該情境下的「快速選項按鈕」。不需要點開對話框即可直接點擊按鈕發送指令。
- [ ] 點擊行為
    - [x] 點擊 Icon 啟動/關閉主對話框。

## B. 主對話視窗 (Main Dialog)
- [x] 智慧定位
    - [x] 開啟對話框時，須自動判斷 Icon 位置：若 Icon 靠近螢幕右側，對話框向左彈出；若靠左則向右彈出，確保對話框完全在視窗內。
- [x] UI 結構
    - [x] **Header**: 包含標題、整頁模式按鈕 (⛶)、OpenClaw連結按鈕 (🔗)、關閉按鈕 (✕)。
    - [x] **整頁模式**: 點擊整頁模式按鈕，對話框立即放大至與當前網頁視窗等大（Cover 整個頁面），再次點擊縮回。
    - [x] **訊息區**: 支援 Markdown 渲染，自動捲動到底部。
- [x] 輸入框優化 (Autogrow)
    - [x] 使用 `<textarea>`。
    - [x] **自動長高**：預設高度為 2 行，隨輸入文字增多自動向上/下擴展高度，方便使用者檢查內容。
    - [x] **熱鍵**：按 `Enter` 發送，`Shift + Enter` 換行。
- [x] 自動淡化與關閉
    - [x] **規則**：當滑鼠「移開」對話視窗範圍後，啟動 **3 秒** 倒數。
    - [x] **暫停機制**：若滑鼠重新移入對話框，或輸入框（Textarea）目前正處於「獲取焦點 (Focus)」狀態（使用者正在打字），必須**立即取消**倒數，防止視窗突然消失。

## C. 快速選項與智慧模式 (Context Awareness)
- [x] **整頁模式 (Page Mode)**
    - [x] 觸發：在頁面空白處右鍵或無框選時使用 Hover 選單。
    - [x] 自動化：使用者在設定填寫 Prompt，發送時系統自動在末尾帶上當前網址，不需使用者手動輸入變數。
- [x] **框選模式 (Selection Mode)**
    - [x] 觸發：選取文字後右鍵或使用 Hover 選單。
    - [x] 自動化：結合使用者設定的 Prompt + 選取的文字內容。
- [x] **圖片模式 (Image Mode)**
    - [x] 觸發：在圖片上右鍵。
    - [x] 自動化：結合使用者設定的 Prompt + 圖片的網址。

## D. 右鍵選單 (Context Menu)
- [x] **Submenu結構**: 點擊「龍蝦助理」後直接顯示該情境下的所有選項。
- [x] **動態更新**: 右鍵選單的項目必須與「設定頁面」中的自訂選項內容完全同步。
- [x] **移除項目**: 移除原本失效的「設定」與「齒輪」項目。

## E. 設定頁面 (Settings)
- [x] **Gateway URL**: 使用者僅需填寫基礎位址（預設為 `http://localhost:18789`），程式發送 API 時自動補全 `/v1/chat/completions`。
- [x] **Token**: 必填項。
- [x] **Default Session Key**: 預設為 `agent:main:main`。
- [x] **Icon 自訂**: 增加欄位讓使用者輸入 Emoji 作為浮動圖標（預設 🦞）。
- [x] **多語系開關**: 提供下拉選單切換 zh-TW / en。
- [x] **快速選項管理**: 提供 Page / Selection / Image 三個區塊，讓使用者增刪自訂 Prompt。

## F. 通訊架構
- [x] **API**: 使用 OpenClaw 相容的 OpenAI HTTP 格式。
- [x] **Header**: 必須帶入 `Authorization: Bearer [Token]`。
- [x] **Session 鎖定**: 必須帶入 `x-openclaw-session-key` 以確保訊息回到正確房間。
