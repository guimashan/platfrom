# 07 - Firebase Functions 部署

> 把後端程式（Cloud Functions）部署到 Firebase，讓網站可以運作。

## 🎯 本章目標

完成本章後，您將：
- 安裝 Firebase CLI 工具
- 設定 Firebase 專案
- 部署 Cloud Functions
- 測試 API 是否正常運作
- 查看 Functions 執行紀錄

## 📋 前置要求

- ✅ 已完成第 06 章（建立 Firebase 專案）
- ✅ 已安裝 Node.js
- ✅ 已設定好 LINE 密鑰（第 03-05 章）

## 🛠️ 步驟一：安裝 Firebase CLI

### 1-1. 安裝 Firebase Tools

在終端機執行：

```bash
npm install -g firebase-tools
```

### 1-2. 驗證安裝

```bash
firebase --version
```

應該會顯示版本號，例如：`13.0.0`

✅ 安裝成功！

## 🔐 步驟二：登入 Firebase

### 2-1. 執行登入指令

```bash
firebase login
```

### 2-2. 選擇帳號

- 瀏覽器會自動開啟
- 選擇您的 Google 帳號（建立 Firebase 專案的那個）
- 授權 Firebase CLI

### 2-3. 確認登入

```bash
firebase projects:list
```

應該會看到您建立的四個專案：
```
platform-bc783
checkin-76c77
service-b9d4a
schedule-48ff9
```

✅ 登入成功！

## 📁 步驟三：檢查專案結構

### 3-1. 查看 Functions 資料夾

```bash
ls functions/
```

應該會看到：
```
src/              # 程式碼
package.json      # 依賴套件
.env              # 環境變數（本機測試用）
```

### 3-2. 查看 firebase.json

檢查專案根目錄的 `firebase.json`：

```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "functions": [
    {
      "source": "functions",
      "codebase": "platform",
      "ignore": [
        "node_modules",
        ".git"
      ]
    }
  ]
}
```

## 🔑 步驟四：設定環境變數（密鑰）

### 4-1. 設定 LINE Channel Secret

```bash
firebase functions:secrets:set LINE_CHANNEL_SECRET --project platform-bc783
```

貼上您的 LINE Login Channel Secret，按 Enter。

### 4-2. 設定 LINE Messaging 密鑰

```bash
firebase functions:secrets:set LINE_MESSAGING_CHANNEL_SECRET --project platform-bc783

firebase functions:secrets:set LINE_MESSAGING_ACCESS_TOKEN --project platform-bc783
```

### 4-3. 設定 Session Secret

```bash
firebase functions:secrets:set SESSION_SECRET --project platform-bc783
```

可以輸入任意隨機字串，例如：
```
guimashan-secret-2025-abcd1234
```

### 4-4. 對 Checkin 專案設定密鑰

```bash
firebase functions:secrets:set LINE_CHANNEL_SECRET --project checkin-76c77
firebase functions:secrets:set SESSION_SECRET --project checkin-76c77
```

## 📦 步驟五：安裝依賴套件

### 5-1. 進入 Functions 資料夾

```bash
cd functions
```

### 5-2. 安裝套件

```bash
npm install
```

這會安裝 `package.json` 裡列出的所有套件，可能需要 1-2 分鐘。

### 5-3. 回到根目錄

```bash
cd ..
```

## 🚀 步驟六：部署到 Platform 專案

### 6-1. 部署 Functions

```bash
firebase deploy --only functions --project platform-bc783
```

### 6-2. 等待部署完成

部署過程約需要 2-5 分鐘，您會看到：

```
✔ functions[lineWebhook] Successful create operation.
✔ functions[api] Successful create operation.
✔ Deploy complete!
```

### 6-3. 記錄 Function URLs

部署完成後會顯示 URL：

```
Function URL (lineWebhook): 
https://asia-east2-platform-bc783.cloudfunctions.net/lineWebhook

Function URL (api): 
https://asia-east2-platform-bc783.cloudfunctions.net/api
```

**⚠️ 把這些 URL 記錄下來！**

✅ Platform Functions 部署成功！

## 🔁 步驟七：部署到 Checkin 專案

### 7-1. 修改 firebase.json

如果您的 `firebase.json` 有設定多個專案，可以指定：

```bash
firebase use checkin-76c77
firebase deploy --only functions
```

或直接指定專案：

```bash
firebase deploy --only functions --project checkin-76c77
```

### 7-2. 記錄 Checkin Functions URL

```
https://asia-east2-checkin-76c77.cloudfunctions.net/checkinApi
```

✅ Checkin Functions 部署成功！

## 🧪 步驟八：測試 Functions

### 8-1. 測試 Platform API

在瀏覽器打開：
```
https://asia-east2-platform-bc783.cloudfunctions.net/api/health
```

應該會看到：
```json
{
  "status": "ok",
  "message": "Platform API is running"
}
```

### 8-2. 測試 Checkin API

```
https://asia-east2-checkin-76c77.cloudfunctions.net/checkinApi/health
```

應該會看到類似的回應。

### 8-3. 測試 Webhook（從 LINE）

1. 回到 LINE Developers Console
2. Messaging API Channel → Messaging API 設定
3. 找到 Webhook URL
4. 更新為：`https://asia-east2-platform-bc783.cloudfunctions.net/lineWebhook`
5. 點擊「Verify」驗證

如果成功會顯示：「Success」

✅ 所有 Functions 都正常運作！

## 📊 步驟九：查看 Functions 執行紀錄

### 9-1. 在 Firebase Console 查看

1. 前往：https://console.firebase.google.com/
2. 選擇專案（例如：platform-bc783）
3. 點擊「Functions」
4. 點擊「日誌」

### 9-2. 用指令查看

```bash
firebase functions:log --project platform-bc783
```

### 9-3. 即時查看（持續監看）

```bash
firebase functions:log --project platform-bc783 --only lineWebhook
```

按 Ctrl+C 停止。

## 🔄 步驟十：更新 Functions

### 10-1. 修改程式碼

在 `functions/src/` 資料夾修改程式碼。

### 10-2. 重新部署

```bash
firebase deploy --only functions --project platform-bc783
```

### 10-3. 只部署特定 Function

```bash
firebase deploy --only functions:lineWebhook --project platform-bc783
```

這樣只會更新 `lineWebhook` 這個 Function，速度更快。

## 🗂️ Functions 檔案結構

```
functions/
├── src/
│   ├── index.js              # 主要入口
│   ├── platform/
│   │   ├── lineWebhook.js    # LINE Webhook
│   │   └── api.js            # Platform API
│   ├── checkin/
│   │   └── index.js          # Checkin API
│   └── utils/
│       ├── firestore.js      # 資料庫工具
│       └── auth.js           # 驗證工具
├── package.json
└── .env.example
```

## ⚙️ 環境變數管理

### 本機開發

建立 `functions/.env` 檔案：
```
LINE_CHANNEL_SECRET=your_channel_secret
SESSION_SECRET=your_session_secret
```

### 正式環境

使用 Firebase Secrets：
```bash
firebase functions:secrets:set SECRET_NAME --project PROJECT_ID
```

查看已設定的 Secrets：
```bash
firebase functions:secrets:access SECRET_NAME --project PROJECT_ID
```

## 📝 Functions 部署清單

請確認所有 Functions 都已部署：

**Platform 專案（platform-bc783）**
- [ ] lineWebhook - LINE Messaging Webhook
- [ ] api - Platform API
- [ ] 已設定所有必要的 Secrets
- [ ] Webhook 驗證成功

**Checkin 專案（checkin-76c77）**
- [ ] checkinApi - Checkin API
- [ ] 已設定所有必要的 Secrets
- [ ] API 健康檢查通過

## ⚠️ 常見錯誤

### 錯誤 1：Permission denied

**錯誤訊息**：`Error: HTTP Error: 403, Permission denied`

**原因**：沒有權限部署

**解決**：
1. 確認已登入正確的 Google 帳號
2. 確認該帳號是 Firebase 專案的擁有者
3. 重新登入：`firebase logout` → `firebase login`

### 錯誤 2：Secrets not found

**錯誤訊息**：`Error: Failed to load secret`

**原因**：沒有設定 Secrets

**解決**：
```bash
firebase functions:secrets:set SECRET_NAME --project PROJECT_ID
```

### 錯誤 3：函數逾時

**錯誤訊息**：`Function execution took 60001 ms, finished with status: 'timeout'`

**原因**：函數執行時間超過 60 秒

**解決**：
在 `functions/src/index.js` 設定逾時時間：
```javascript
exports.myFunction = functions
  .runWith({ timeoutSeconds: 120 })
  .https.onRequest(...)
```

### 錯誤 4：Cannot find module

**錯誤訊息**：`Error: Cannot find module 'xxx'`

**原因**：缺少依賴套件

**解決**：
```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

## 💰 費用說明

### Cloud Functions 計費

- 前 200 萬次調用：免費
- 前 40 萬 GB-秒、20 萬 GHz-秒計算時間：免費
- 超過後依用量計費

### 龜馬山系統預估

小型系統（100 位使用者）：
- 每月約 1-5 萬次調用
- 費用：$0-2/月

## ✅ 完成檢查清單

請確認：
- [ ] Firebase CLI 已安裝並登入
- [ ] 所有 Secrets 都已設定
- [ ] Platform Functions 已部署
- [ ] Checkin Functions 已部署
- [ ] API 健康檢查通過
- [ ] LINE Webhook 驗證成功
- [ ] 已記錄所有 Function URLs
- [ ] 知道如何查看 Logs

## 🎓 下一步

Functions 都部署好了！接下來了解專案結構：

➡️ **下一章：08-專案結構說明.md**

在下一章，我們會詳細說明程式碼的組織方式，讓您知道每個檔案的作用。

---

💡 **小提示**：
- 每次修改程式碼後記得重新部署
- 用 `--only functions:functionName` 可以只部署單一函數，速度更快
- 定期查看 Logs 確認沒有錯誤
- 設定預算提醒避免超支
