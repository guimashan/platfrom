# 04 - LIFF 設定完整步驟

> LIFF（LINE Front-end Framework）讓您的網頁可以在 LINE 聊天室裡直接開啟，使用者不用跳出 LINE。

## 🎯 本章目標

完成本章後，您將：
- 了解 LIFF 是什麼，和 LINE Login 有什麼不同
- 建立 LIFF App
- 取得 LIFF ID
- 設定 Endpoint URL
- 測試 LIFF 是否正常運作

## 📋 前置要求

- ✅ 已完成第 03 章（建立 LINE Login Channel）
- ✅ 準備好筆記本，記錄 LIFF ID

## 🤔 LIFF vs LINE Login - 有什麼不同？

### LINE Login（網頁登入）
```
使用者 → 點擊「LINE 登入」→ 跳到 LINE → 授權 → 跳回網站
```
- 使用者會**跳出**您的網站到 LINE
- 適合在**電腦瀏覽器**上使用
- 需要手動點擊「LINE 登入」按鈕

### LIFF（LINE 內建瀏覽器）
```
使用者 → 在 LINE 聊天室 → 點擊連結 → 網頁直接在 LINE 裡開啟
```
- 使用者**不會跳出** LINE
- 適合在**手機 LINE App** 上使用
- 自動知道使用者是誰，不用手動登入

### 龜馬山系統怎麼用？
- **電腦上**：用 LINE Login
- **手機 LINE 上**：用 LIFF

## 🛠️ 步驟一：了解 LIFF 的運作方式

### LIFF 使用流程
```
1. 使用者在 LINE 加龜馬山官方帳號（@495fdqrw）
   ↓
2. 輸入關鍵字「奉香簽到」
   ↓
3. 機器人回覆連結
   ↓
4. 使用者點擊連結
   ↓
5. LIFF 網頁在 LINE 內開啟
   ↓
6. 自動取得使用者資料（名稱、頭像）
   ↓
7. 使用者開始使用功能（例如：GPS 簽到）
```

## 📱 步驟二：建立 LIFF App

### 2-1. 進入 LINE Login Channel

1. 登入 LINE Developers Console：https://developers.line.biz/console/
2. 選擇您的 Provider（龜馬山）
3. 選擇您的 LINE Login Channel（在第 03 章建立的）

**⚠️ 注意**：LIFF 是在 LINE Login Channel 底下建立的，不是新的 Channel！

### 2-2. 切換到 LIFF 分頁

1. 點擊上方的「LIFF」分頁
2. 您會看到 LIFF apps 列表（目前是空的）

### 2-3. 新增 LIFF App

點擊「Add」按鈕，填寫以下資訊：

#### LIFF app name（應用程式名稱）
```
龜馬山奉香簽到
```

#### Size（尺寸）
選擇 **Full**（全螢幕）
- Compact：小視窗（50% 高度）
- Tall：高視窗（75% 高度）
- Full：全螢幕（100% 高度）⭐ 推薦

**為什麼選 Full？**
- 我們的簽到頁面需要顯示地圖、按鈕等，需要完整空間
- Full 讓使用者體驗像在用一個完整的 App

#### Endpoint URL（網址）
這是使用者點擊 LIFF 連結後會開啟的網頁。

**開發階段**（本機測試）：
```
http://localhost:5000/liff/checkin.html
```

**測試環境**：
```
https://您的專案.vercel.app/liff/checkin.html
```

**正式環境**：
```
https://go.guimashan.org.tw/liff/checkin.html
```

**⚠️ 現在填哪個？**
- 如果您還在開發，填本機測試網址
- 如果已經部署到 Vercel，填正式環境網址
- **可以之後再改**，不用擔心！

#### Scopes（權限範圍）
勾選您需要的權限：

- ✅ **profile**（使用者資料）- 必選！
  - 取得使用者的名稱、頭像、狀態訊息
  
- ✅ **openid**（OpenID）- 必選！
  - 取得使用者的唯一 ID

- ⬜ **email**（Email）- 不需要
  - 取得使用者的 Email
  - ⚠️ 需要另外申請權限

- ⬜ **chat_message.write**（傳送訊息）- 視需求
  - LIFF 可以代替使用者傳送訊息
  - 龜馬山系統目前**不需要**

**龜馬山系統建議勾選**：
- ✅ profile
- ✅ openid

#### Bot link feature（連結機器人）
選擇 **On（Normal）**

**這是什麼？**
- 啟用後，使用者開啟 LIFF 時會自動加入您的 LINE 官方帳號
- 這樣您就可以發送通知給使用者

**⚠️ 注意**：這個功能需要先建立 Messaging API Channel（第 05 章）

如果您還沒建立 Messaging API，可以：
1. 先選「Off」
2. 等第 05 章建立 Messaging API 後再回來改成「On」

#### Module mode（模組模式）
保持預設：**Off**

### 2-4. 點擊「Add」建立

✅ 恭喜！您的第一個 LIFF App 建立成功了！

## 🔑 步驟三：取得 LIFF ID

### 3-1. 找到 LIFF ID

建立完成後，您會看到 LIFF app 列表，上面有：
```
龜馬山奉香簽到
LIFF ID: 2008269293-Nl2pZBpV（範例）
```

### 3-2. 記錄 LIFF ID

**⚠️ 超級重要！**把這個 LIFF ID 記在筆記本裡：

```
=== LIFF ID 資訊 ===

奉香簽到 LIFF ID: 2008269293-Nl2pZBpV
建立日期: [今天的日期]
```

## 📝 步驟四：建立其他 LIFF Apps（重複步驟二）

龜馬山系統有三個 LIFF App，請重複步驟二建立：

### LIFF App 1: 奉香簽到（已建立）
- Name: 龜馬山奉香簽到
- Endpoint: https://go.guimashan.org.tw/liff/checkin.html
- Size: Full
- LIFF ID: [記錄在筆記本]

### LIFF App 2: 神務服務（新建）
- Name: 龜馬山神務服務
- Endpoint: https://go.guimashan.org.tw/liff/service.html
- Size: Full
- LIFF ID: [記錄在筆記本]

### LIFF App 3: 排班系統（新建）
- Name: 龜馬山排班系統
- Endpoint: https://go.guimashan.org.tw/liff/schedule.html
- Size: Full
- LIFF ID: [記錄在筆記本]

## 🔧 步驟五：更新程式碼中的 LIFF ID

### 5-1. 找到需要更新的檔案

在您的專案中，找到這些檔案：
```
public/liff/checkin.html
public/liff/service.html
public/liff/schedule.html
public/liff/index.html
```

### 5-2. 更新 LIFF ID

在每個檔案裡，找到這一行：
```javascript
const LIFF_ID = '2008269293-Nl2pZBpV';
```

改成您自己的 LIFF ID：
```javascript
const LIFF_ID = '您的LIFF_ID';
```

**⚠️ 注意**：
- checkin.html 用「奉香簽到」的 LIFF ID
- service.html 用「神務服務」的 LIFF ID
- schedule.html 用「排班系統」的 LIFF ID

## 🧪 步驟六：測試 LIFF

### 6-1. 部署程式碼

**如果您還沒部署到 Vercel**：
- 先跳過測試
- 等第 11 章部署完成後再回來測試

**如果已經部署**：
- 繼續下一步

### 6-2. 建立測試連結

LIFF 連結格式：
```
https://liff.line.me/{您的LIFF_ID}
```

範例：
```
https://liff.line.me/2008269293-Nl2pZBpV
```

### 6-3. 在手機 LINE 上測試

**方法 1：直接開啟連結**
1. 用手機打開瀏覽器
2. 貼上 LIFF 連結
3. 瀏覽器會自動開啟 LINE App
4. LIFF 網頁在 LINE 裡開啟

**方法 2：傳訊息給自己**
1. 在電腦上複製 LIFF 連結
2. 用 LINE 傳給自己或朋友
3. 點擊連結
4. LIFF 網頁在 LINE 裡開啟

### 6-4. 檢查是否正常

✅ 正常運作的話，您會看到：
- 網頁在 LINE 裡開啟（不是跳到瀏覽器）
- 自動取得您的 LINE 名稱和頭像
- 可以使用功能（例如：選擇巡邏點）

❌ 如果有問題：
- 請看下方「常見錯誤和解決方法」

## ⚠️ 常見錯誤和解決方法

### 錯誤 1：LIFF init failed
**錯誤訊息**：`LIFF init failed: Invalid LIFF ID`

**原因**：LIFF ID 錯誤或格式不對

**解決方法**：
1. 檢查程式碼裡的 LIFF ID 是否正確
2. 確認格式是：`數字-英數字`（例如：2008269293-Nl2pZBpV）
3. 不要有多餘的空格

### 錯誤 2：This page isn't available
**錯誤訊息**：網頁顯示 404 或無法開啟

**原因**：Endpoint URL 設定錯誤

**解決方法**：
1. 回到 LINE Developers Console
2. 檢查 Endpoint URL 是否正確
3. 確認網頁確實存在（可以用瀏覽器直接開啟測試）

### 錯誤 3：LIFF 在瀏覽器開啟，不在 LINE 裡
**原因**：沒有從 LINE 開啟

**解決方法**：
- LIFF 只能在 LINE App 裡開啟
- 請用手機 LINE 點擊連結，不要用瀏覽器

### 錯誤 4：無法取得使用者資料
**錯誤訊息**：`Cannot get profile`

**原因**：沒有勾選 profile 權限

**解決方法**：
1. 回到 LINE Developers Console
2. 編輯 LIFF App
3. 確認有勾選「profile」和「openid」
4. 儲存後重新測試

## 💡 進階：LIFF 網址參數

### 傳遞參數給 LIFF

您可以在 LIFF 連結後面加參數：
```
https://liff.line.me/{LIFF_ID}?module=checkin
```

程式碼可以這樣取得參數：
```javascript
const params = new URLSearchParams(window.location.search);
const module = params.get('module'); // 'checkin'
```

**龜馬山系統的應用**：
- 首頁 LIFF 可以接收 `module` 參數
- 根據參數自動導航到對應的模組
- 例如：點「奉香簽到」→ 自動開啟簽到頁面

## ✅ 完成檢查清單

請確認您已經：
- [ ] 了解 LIFF 和 LINE Login 的差異
- [ ] 建立至少一個 LIFF App（奉香簽到）
- [ ] 取得並記錄 LIFF ID
- [ ] 更新程式碼中的 LIFF ID
- [ ] （如果已部署）測試 LIFF 是否正常運作
- [ ] 把所有 LIFF ID 記在筆記本裡

## 🎓 下一步

LIFF 設定完成！接下來我們要設定 LINE Messaging API：

➡️ **下一章：05-LINE-Messaging-API-設定.md**

在下一章，我們會建立 LINE 官方帳號，讓使用者可以在 LINE 聊天室輸入關鍵字，自動開啟對應的 LIFF 功能。

---

💡 **小提示**：
- LIFF 和網頁版（LINE Login）可以共用大部分程式碼
- 只需要判斷使用者是從 LIFF 進來還是網頁進來
- 從 LIFF 進來：自動登入
- 從網頁進來：顯示「LINE 登入」按鈕

這樣就能用一套程式碼支援兩種使用方式！
