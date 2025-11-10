# 龜馬山整合服務平台 - 系統文檔

**最近更新**: 2025-11-10

## 系統概述

龜馬山整合服務平台第三版採用微服務架構，橫跨 3 個 Firebase 專案，提供 LINE Bot、GPS 簽到、神務服務等功能。

**核心特點：**
- 微服務架構，每個專案獨立部署
- 條件式 Cloud Functions 導出，避免跨專案衝突
- 標準 LINE Login OAuth 2.0 認證
- Firestore 資料庫 + Firebase Authentication

---

## 系統架構

### Firebase 專案配置

| 專案 | Project ID | 功能 | Cloud Functions |
|------|-----------|------|----------------|
| **Platform** | platform-bc783 | LINE Bot、用戶管理 | lineMessaging, generateCustomToken, updateUserRole |
| **Check-in** | checkin-76c77 | GPS 簽到系統 | verifyCheckinV2, getPatrols, savePatrol, etc. |
| **Service** | service-b9d4a | 神務服務（法會報名） | submitRegistration, confirmPayment, etc. |

### 條件式導出機制

`functions/index.js` 使用環境變數判斷當前專案，只導出對應的 functions：

```javascript
const PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;

if (!PROJECT_ID || PROJECT_ID === 'platform-bc783') {
  exports.lineMessaging = messagingFunctions.lineMessaging;
  // ...
}
```

**好處：**
- 避免 functions 重複部署到錯誤的專案
- 每個專案只包含必要的 functions
- 本機開發時可載入所有 functions

---

## 當前功能模組

### 1. LINE Bot (Platform)
**簡化版 Webhook** - 收到任何訊息時回覆固定文字：
```
🙏 感謝您聯繫龜馬山整合服務平台

請直接瀏覽我們的網站：
https://go.guimashan.org.tw

或聯繫服務人員獲取協助。
```

**重要變更 (2025-11-10)：**
- ❌ 已移除：LIFF 轉發器、關鍵字匹配系統、LIFF URL 按鈕
- ✅ 保留：標準 LINE Login OAuth 2.0（供未來使用）

**Webhook 位置：**
- Cloud Function: `lineMessaging` (platform-bc783)
- 檔案：`functions/src/messaging/index.js`

### 2. GPS 簽到系統 (Check-in)
**功能：**
- GPS 定位驗證簽到
- 巡查點管理
- 簽到歷史記錄
- 測試模式（跳過距離驗證）

**主要頁面：**
- `/checkin/checkin.html` - 簽到介面
- `/checkin/history.html` - 簽到歷史
- `/checkin/manage.html` - 巡查點管理

**Cloud Functions：**
- `verifyCheckinV2` - 驗證並記錄簽到
- `getPatrols` - 取得巡查點列表
- `savePatrol` / `deletePatrol` - 管理巡查點
- `getCheckinHistory` - 取得簽到記錄
- `updateTestMode` - 切換測試模式

### 3. 神務服務系統 (Service)
**功能：**
- 法會報名（龜馬山一點靈、年斗、禮斗）
- 訂單管理
- 付款確認

**主要頁面：**
- `/service/DD.html` - 龜馬山一點靈報名
- `/service/ND.html` - 年斗法會報名
- `/service/LD.html` - 禮斗法會報名
- `/service/orders.html` - 訂單查詢

**Cloud Functions：**
- `submitRegistration` - 提交報名表單
- `getRegistrations` - 取得訂單列表
- `confirmPayment` - 確認付款

### 4. 權限管理 (Platform)
**角色系統：**
- `user` - 一般用戶
- `staff` - 工作人員
- `admin` - 管理員

**Cloud Functions：**
- `generateCustomToken` - 一般登入
- `generateCustomTokenFromLiff` - LIFF 登入（已停用）
- `updateUserRole` - 更新用戶角色

---

## 部署與操作

### 部署指令

**部署單一專案的所有 functions：**
```bash
cd functions
firebase deploy --project platform-bc783 --only functions
firebase deploy --project checkin-76c77 --only functions
firebase deploy --project service-b9d4a --only functions
```

**部署特定 function：**
```bash
firebase deploy --project platform-bc783 --only functions:lineMessaging
firebase deploy --project checkin-76c77 --only functions:verifyCheckinV2
```

**部署前端靜態檔案：**
```bash
firebase deploy --project platform-bc783 --only hosting
```

### 驗證步驟

**1. 檢查 functions 狀態：**
```bash
firebase functions:list --project platform-bc783
```

**2. 測試 LINE Bot Webhook：**
- 發送訊息到 LINE Bot
- 檢查 Firebase Console Logs
- 預期回應：固定的服務資訊文字

**3. 測試簽到功能：**
- 訪問 `/checkin/checkin.html`
- 開啟測試模式
- 執行簽到操作

---

## 配置與環境

### Firebase Secrets (必要)

**Platform 專案：**
- `LINE_MESSAGING_CHANNEL_SECRET` - LINE Bot 簽名驗證
- `LINE_MESSAGING_ACCESS_TOKEN` - LINE Bot API 認證
- `SESSION_SECRET` - Session 加密密鑰

**所有專案：**
- Firebase Admin SDK 自動初始化（無需額外設定）

### 環境變數

**Replit Secrets（已設定）：**
```
LINE_CHANNEL_ID
LINE_CHANNEL_SECRET
LINE_MESSAGING_ACCESS_TOKEN
LINE_MESSAGING_CHANNEL_SECRET
SESSION_SECRET
VERCEL_ORG_ID
VERCEL_PROJECT_ID
VERCEL_TOKEN
```

### LINE Webhook 設定

**Webhook URL：**
```
https://asia-east2-platform-bc783.cloudfunctions.net/lineMessaging
```

**設定位置：**
LINE Developers Console → Messaging API → Webhook settings

**驗證方式：**
- LINE 計算 HMAC-SHA256 簽名（使用 `LINE_MESSAGING_CHANNEL_SECRET`）
- Webhook 使用 `req.rawBody` 驗證簽名
- 簽名不符 → 返回 403

---

## 資料存儲與安全

### Firestore Collections

**Platform (platform-bc783)：**
- `users` - 用戶資料
- `lineKeywordMappings` - ⚠️ 已廢棄（2025-11-10 移除關鍵字系統）

**Check-in (checkin-76c77)：**
- `patrols` - 巡查點定義
- `checkins` - 簽到記錄
- `testMode` - 測試模式配置

**Service (service-b9d4a)：**
- `registrations` - 法會報名資料
- `orders` - 訂單記錄

### 安全規則

**原則：**
- 認證用戶才能讀寫自己的資料
- 管理員可以讀寫所有資料
- 使用 Firebase Security Rules 保護

**Custom Claims：**
用戶的 `role` 儲存在 Firebase Auth Custom Claims：
```javascript
auth.setCustomUserClaims(uid, { role: 'admin' })
```

---

## 維護手冊

### 常見問題排查

**問題：網頁更新後用戶看不到變更**

**原因：** 瀏覽器快取

**解決方案：**
1. 確保 HTTP 伺服器回傳 `Cache-Control: no-cache`
2. 指導用戶執行「清除快取並強制重新整理」
   - Chrome/Edge: Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac)
   - Firefox: Ctrl+F5 (Windows) / Cmd+Shift+R (Mac)
   - Safari: Cmd+Option+R (Mac)

**問題：LINE Bot 不回應訊息**

**檢查清單：**
1. 檢查 Firebase Functions Logs
2. 確認 Webhook URL 正確設定
3. 驗證 `LINE_MESSAGING_CHANNEL_SECRET` 正確
4. 測試簽名驗證邏輯（`req.rawBody`）

**問題：簽到驗證失敗**

**檢查清單：**
1. 檢查 GPS 定位是否啟用
2. 確認巡查點座標正確
3. 開啟測試模式跳過距離驗證
4. 檢查 `verifyCheckinV2` function logs

### 重新部署檢查清單

**部署前：**
- [ ] 確認當前分支是 `main`
- [ ] 本機測試通過
- [ ] 檢查 LSP 診斷無錯誤

**部署後：**
- [ ] 檢查 functions 部署成功
- [ ] 測試關鍵功能（簽到、報名、LINE Bot）
- [ ] 檢查 Firebase Console Logs 無錯誤
- [ ] 通知用戶可能需要清除快取

### 憑證輪換提醒

**定期檢查（每 6 個月）：**
- LINE Channel Secret 和 Access Token
- Firebase Service Account Keys
- Session Secret

---

## 技術決策記錄

### 2025-11-10: 移除 LINE Bot 關鍵字系統

**決策：** 完全移除 LIFF 轉發器和關鍵字匹配系統

**原因：**
- 簡化系統架構
- 降低維護成本
- 用戶直接訪問網站更直覺

**影響：**
- 刪除 10 個檔案（LIFF 轉發器、關鍵字管理介面、Cloud Functions 模組）
- `messaging/index.js` 從 362 行重寫為 145 行
- Firestore `lineKeywordMappings` collection 已廢棄（資料已清空）

**保留：**
- 標準 LINE Login OAuth 2.0（供未來重新實作）
- Webhook 基礎架構（返回靜態訊息）

### 2024-08: 採用微服務架構

**決策：** 將單一專案拆分為 3 個 Firebase 專案

**原因：**
- 模組化管理
- 獨立部署和擴展
- 資料隔離

**實作：**
- 條件式 Cloud Functions 導出
- 共用前端代碼
- 各專案獨立 Firestore 資料庫

### 2024-06: 選擇 Firebase 平台

**決策：** 使用 Firebase 作為後端平台

**原因：**
- 快速開發和部署
- 免費額度足夠
- 整合 Authentication 和 Firestore
- Serverless 架構，無需管理伺服器

---

## 開發環境

### 本機開發

**啟動前端：**
```bash
cd public
npx http-server -p 5000 --cors -c-1
```

**測試 Cloud Functions：**
```bash
cd functions
npm run serve
```

### 專案結構

```
.
├── public/                  # 前端靜態檔案（共用）
│   ├── index.html          # 主頁
│   ├── checkin/            # 簽到模組
│   ├── service/            # 神務模組
│   ├── manage/             # 管理介面
│   └── js/                 # 共用 JavaScript
├── functions/              # Cloud Functions（共用）
│   ├── index.js            # 條件式導出入口
│   ├── src/
│   │   ├── platform/       # Platform functions
│   │   ├── checkin/        # Check-in functions
│   │   ├── service/        # Service functions
│   │   └── messaging/      # LINE Bot webhook
│   └── package.json
└── replit.md              # 本文檔
```

---

## 參考資源

**Firebase Console：**
- Platform: https://console.firebase.google.com/project/platform-bc783
- Check-in: https://console.firebase.google.com/project/checkin-76c77
- Service: https://console.firebase.google.com/project/service-b9d4a

**LINE Developers：**
- https://developers.line.biz/console/

**技術文檔：**
- Firebase Cloud Functions: https://firebase.google.com/docs/functions
- LINE Messaging API: https://developers.line.biz/en/docs/messaging-api/
- Firestore: https://firebase.google.com/docs/firestore
