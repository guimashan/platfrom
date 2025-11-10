# LIFF 設定指南

## 🎯 概述

本指南說明如何設定 LINE LIFF (LINE Front-end Framework) 功能，讓用戶可以在 LINE 官方帳號中輸入關鍵字，開啟對應的 LIFF App。

## 📋 前置作業

### 1. 準備 LINE Login Channel
您已經有的 LINE Login Channel：
- **Channel ID**: 2008269293
- **Channel Type**: LINE Login

這個 Channel 將同時用於：
- ✅ LINE Login (OAuth 2.0) - 網站登入
- ✅ LIFF Apps - LINE 內嵌應用

---

## 🔧 設定步驟

### 第一步：建立 LINE Official Account（官方帳號）

1. 前往 [LINE Official Account Manager](https://manager.line.biz/)
2. 建立新的官方帳號或使用現有帳號
3. 記錄以下資訊：
   - **Official Account ID**: `@xxxxx`
   - **官方帳號名稱**: 龜馬山 goLine

### 第二步：建立 Messaging API Channel

1. 前往 [LINE Developers Console](https://developers.line.biz/console/)
2. 選擇您的 Provider（或建立新的）
3. 建立新的 **Messaging API** Channel：
   - **Channel name**: 龜馬山官方帳號
   - **Channel description**: 龜馬山 goLine 平台訊息服務
   - **Category**: 宗教
   - **Subcategory**: 寺廟
4. 建立後記錄：
   - **Channel ID**: (新的 Messaging API Channel ID)
   - **Channel Secret**: (在 Basic settings 頁面)
   - **Channel Access Token**: (在 Messaging API 頁面，點擊 Issue 生成)

### 第三步：設定 Firebase Secrets

在您的 Firebase 專案中設定以下 Secrets：

```bash
# 進入 functions 目錄
cd functions

# 設定 LINE Messaging API Channel Secret
firebase functions:secrets:set LINE_MESSAGING_CHANNEL_SECRET

# 設定 LINE Messaging API Access Token
firebase functions:secrets:set LINE_MESSAGING_ACCESS_TOKEN
```

### 第四步：建立 LIFF Apps

前往 [LINE Developers Console](https://developers.line.biz/console/)，選擇您的 **LINE Login Channel** (ID: 2008269293)

#### 4.1 建立「奉香簽到」LIFF App

1. 點擊 **LIFF** 標籤
2. 點擊 **Add** 按鈕
3. 填寫以下資訊：

| 項目 | 設定值 |
|------|--------|
| **LIFF app name** | 奉香簽到 |
| **Size** | Full |
| **Endpoint URL** | `https://go.guimashan.org.tw/liff/checkin.html` |
| **Scopes** | ☑ profile<br>☑ openid<br>☑ chat_message.write |
| **Add friend option** | Off |
| **Scan QR** | ☑ On (啟用) |
| **Module mode** | ☑ On (隱藏動作按鈕) |

4. 點擊 **Add**
5. **記錄 LIFF ID**：例如 `2008269293-AbcdEfgh`

#### 4.2 建立「神務服務」LIFF App

1. 重複上述步驟，修改以下項目：

| 項目 | 設定值 |
|------|--------|
| **LIFF app name** | 神務服務 |
| **Endpoint URL** | `https://go.guimashan.org.tw/liff/service.html` |
| **Scopes** | ☑ profile<br>☑ openid |

2. **記錄 LIFF ID**：例如 `2008269293-12345678`

#### 4.3 建立「排班系統」LIFF App

1. 重複上述步驟，修改以下項目：

| 項目 | 設定值 |
|------|--------|
| **LIFF app name** | 排班系統 |
| **Endpoint URL** | `https://go.guimashan.org.tw/liff/schedule.html` |
| **Scopes** | ☑ profile<br>☑ openid |

2. **記錄 LIFF ID**：例如 `2008269293-87654321`

### 第五步：更新 LIFF 頁面的 LIFF ID

更新以下三個檔案中的 `LIFF_ID` 常數：

**1. public/liff/checkin.html**
```javascript
const LIFF_ID = '2008269293-AbcdEfgh'; // 替換為您的實際 LIFF ID
```

**2. public/liff/service.html**
```javascript
const LIFF_ID = '2008269293-12345678'; // 替換為您的實際 LIFF ID
```

**3. public/liff/schedule.html**
```javascript
const LIFF_ID = '2008269293-87654321'; // 替換為您的實際 LIFF ID
```

### 第六步：更新 Cloud Functions 的 LIFF IDs

編輯 `functions/src/messaging/index.js`：

```javascript
const LIFF_IDS = {
  checkin: '2008269293-AbcdEfgh',  // 替換為實際的簽到 LIFF ID
  service: '2008269293-12345678',  // 替換為實際的服務 LIFF ID
  schedule: '2008269293-87654321', // 替換為實際的排班 LIFF ID
};
```

### 第七步：部署 Cloud Functions

```bash
cd functions
npm install
firebase deploy --only functions:lineWebhook
```

部署完成後，記錄 Webhook URL：
```
https://asia-east2-platform-bc783.cloudfunctions.net/lineWebhook
```

### 第八步：設定 Messaging API Webhook

1. 前往您的 **Messaging API Channel** 設定頁面
2. 在 **Messaging API** 標籤中：
   - **Webhook URL**: 輸入 `https://asia-east2-platform-bc783.cloudfunctions.net/lineWebhook`
   - 點擊 **Verify** 驗證（應該顯示成功）
   - **Use webhook**: 切換為 **開啟**
   - **Webhook redelivery**: 切換為 **開啟**（建議）

3. 在 **Messaging API** 標籤底部：
   - **Auto-reply messages**: 切換為 **關閉**
   - **Greeting messages**: 可選擇性設定歡迎訊息

### 第九步：連結 Official Account 到 Messaging API Channel

1. 在 Messaging API Channel 設定頁面
2. 確認已連結到您的 Official Account
3. 如果沒有，點擊 **Link** 按鈕連結

---

## 📱 使用方式

### 用戶端操作流程

1. 用戶在 LINE 中搜尋並加入「龜馬山 goLine」官方帳號
2. 用戶輸入關鍵字：
   - 「奉香簽到」→ 開啟簽到 LIFF App
   - 「神務服務」→ 開啟服務 LIFF App
   - 「排班系統」→ 開啟排班 LIFF App
   - 「幫助」→ 顯示可用指令
3. LIFF App 在 LINE 內開啟，自動完成登入
4. 用戶使用功能後，可直接關閉視窗

### 支援的關鍵字

| 關鍵字 | 開啟的 LIFF App | 功能 |
|--------|----------------|------|
| 奉香、簽到、打卡 | 奉香簽到 | GPS/QR Code 簽到 |
| 神務、服務、法會 | 神務服務 | 法會報名、服務單管理 |
| 排班、班表、志工 | 排班系統 | 志工排班、出勤統計 |
| 幫助、help、? | - | 顯示說明訊息 |
| 其他 | - | 顯示功能選單 |

---

## 🧪 測試

### 1. 測試 LIFF App 初始化

在瀏覽器中直接訪問 LIFF URL：
```
https://liff.line.me/2008269293-AbcdEfgh
```

**預期結果：**
- 如果在 LINE App 中開啟：自動登入，顯示簽到頁面
- 如果在外部瀏覽器：要求登入 LINE 帳號

### 2. 測試 Webhook

使用以下指令測試 Webhook：

```bash
curl -X POST https://asia-east2-platform-bc783.cloudfunctions.net/lineWebhook \
  -H "Content-Type: application/json" \
  -d '{"events":[]}'
```

**預期結果：** 回傳 `OK`

### 3. 測試官方帳號互動

1. 在 LINE 加入官方帳號
2. 發送訊息：「奉香簽到」
3. **預期結果：** 收到按鈕訊息，點擊後開啟簽到 LIFF App

---

## 🔒 安全性注意事項

1. **Channel Secret 和 Access Token** 必須使用 Firebase Secrets 管理，不要寫死在代碼中
2. **Webhook 簽名驗證** 已實作，確保訊息來自 LINE Platform
3. **LIFF ID Token** 用於與 Firebase 認證整合，確保用戶身份安全
4. **HTTPS 必須** - 所有 Endpoint URL 必須使用 HTTPS

---

## 📊 架構圖

```
LINE 用戶
    ↓ 輸入關鍵字
LINE Official Account
    ↓ 發送 Webhook
Firebase Cloud Function (lineWebhook)
    ↓ 解析關鍵字，回覆 LIFF URL
LINE 用戶
    ↓ 點擊按鈕
LIFF App (在 LINE 內開啟)
    ↓ 初始化 LIFF SDK
    ↓ 取得 LINE ID Token
    ↓ 與 Firebase 認證整合
Firebase Auth + Firestore
    ↓ 回傳用戶資料
LIFF App 顯示功能
```

---

## 🐛 疑難排解

### LIFF 初始化失敗

**錯誤訊息：** `LIFF ID is not valid`

**解決方法：**
- 確認 LIFF ID 格式正確（例如：`2008269293-AbcdEfgh`）
- 檢查 LIFF App 是否已建立
- 確認 Endpoint URL 使用 HTTPS

### Webhook 無回應

**解決方法：**
1. 檢查 Cloud Function 是否部署成功
2. 查看 Firebase Console → Functions → Logs
3. 確認 Webhook URL 設定正確
4. 確認 Channel Secret 和 Access Token 設定正確

### LIFF App 顯示空白

**解決方法：**
1. 檢查瀏覽器 Console 是否有錯誤
2. 確認 Firebase 配置正確
3. 確認 LIFF SDK 載入成功

---

## 📚 參考資源

- [LINE LIFF 官方文件](https://developers.line.biz/en/docs/liff/)
- [LINE Messaging API 官方文件](https://developers.line.biz/en/docs/messaging-api/)
- [Firebase Cloud Functions 文件](https://firebase.google.com/docs/functions)

---

## ✅ 檢查清單

設定完成後，請確認以下項目：

- [ ] LINE Login Channel 已建立
- [ ] 三個 LIFF Apps 已建立並記錄 LIFF IDs
- [ ] Messaging API Channel 已建立
- [ ] Firebase Secrets 已設定
- [ ] LIFF 頁面已更新正確的 LIFF IDs
- [ ] Cloud Functions 已更新正確的 LIFF IDs
- [ ] lineWebhook Function 已部署
- [ ] Messaging API Webhook 已設定並驗證
- [ ] Official Account 已連結到 Messaging API Channel
- [ ] 測試發送訊息可收到回覆
- [ ] 測試點擊按鈕可開啟 LIFF App
