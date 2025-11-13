# 龜馬山整合服務平台 - 系統文檔

**最近更新**: 2025-11-13
- **新增服務開放時間管理系統** - 管理員可設定 6 個服務的開放/關閉狀態、開放時間、關閉訊息；用戶訪問關閉的服務時會看到友善提示並無法提交表單
- **新增 superadmin 刪除訂單功能** - 允許 superadmin 刪除測試訂單，包含審計日誌記錄和安全權限檢查
- **修復訂單管理頁面初始化問題** - 將 orders.js 改為導出 init 函數，修復頁面卡在「驗證中...」的問題
- **修復神務服務儀表板 API 調用錯誤** - 添加正確的 Cloud Functions URL 配置
- 神務服務管理模組上線 - 啟用儀表板、報名訂單、使用者管理頁面
- 修復巡邏點編輯功能 - Cloud Functions 2nd Gen 升級與事件綁定問題
- 優化簽到錯誤訊息顯示

## 系統概述

龜馬山整合服務平台第三版採用微服務架構，橫跨 3 個 Firebase 專案，提供 LINE Bot、GPS 簽到、神務服務等功能。

**核心特點：**
- 微服務架構，每個專案獨立部署
- 條件式 Cloud Functions 導出，避免跨專案衝突
- 標準 LINE Login OAuth 2.0 認證
- Firestore 資料庫 + Firebase Authentication
- **統一管理介面 UI**（所有管理頁面使用單一 CSS 架構）

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
- 法會報名（6 個服務：DD, ND, LD, ZY, PS, QJ）
- 訂單管理
- 付款確認
- **服務開放時間管理**（2025-11-13 新增）

**主要頁面：**
- `/service/service.html` - 服務列表頁面（顯示服務狀態）
- `/service/DD.html` - 龜馬山一點靈報名
- `/service/ND.html` - 年斗法會報名
- `/service/LD.html` - 禮斗法會報名
- `/service/ZY.html` - 中元法會報名
- `/service/PS.html` - 普施法會報名
- `/service/QJ.html` - 秋祭法會報名
- `/service/manage/orders.html` - 訂單管理
- `/service/manage/list.html` - **表單設定管理**（2025-11-13 新增）

**服務開放時間管理系統（2025-11-13）：**
- 管理員可設定每個服務的開放/關閉狀態
- 可設定開始/結束日期（自動化開放排程）
- 可自訂服務關閉時的提示訊息
- 用戶訪問關閉的服務時：
  - service.html：點擊時彈出提示，不跳轉頁面
  - 表單頁面：顯示大型警告框，禁用所有輸入和按鈕，不載入模組

**Cloud Functions：**
- `submitRegistration` - 提交報名表單
- `getRegistrations` - 取得訂單列表
- `confirmPayment` - 確認付款
- `deleteOrder` - 刪除訂單（superadmin 專用）
- `getServiceConfigs` - 獲取所有服務配置（公開 API）
- `updateServiceConfig` - 更新服務配置（需權限：admin_service/poweruser_service/superadmin）

### 4. 權限管理 (Platform)
**角色系統架構（2025-11-12 標準化）：**

龜馬山平台採用**模組化角色系統**，每個功能模組有三級權限：user（使用者）→ poweruser（幹部）→ admin（管理員）

**基礎角色：**
- `user` - 一般用戶（預設角色，可報名法會服務）

**簽到系統角色：**
- `user_checkin` - 簽到使用者（可使用簽到功能、查看自己的簽到記錄）
- `poweruser_checkin` - 簽到幹部（進階簽到功能、可查看部分用戶數據）
- `admin_checkin` - 簽到管理員（完整簽到管理功能、用戶管理、巡查點管理）

**神務服務角色：**
- `user` - 一般用戶（可報名法會、查看自己的報名記錄）
- `poweruser_service` - 神務專員（可查看和管理部分訂單）
- `admin_service` - 神務管理員（完整訂單管理、神務用戶管理）

**排班系統角色：**
- `user_schedule` - 排班使用者（可查看和管理自己的排班）
- `poweruser_schedule` - 排班幹部（可查看和管理部分班表）
- `admin_schedule` - 排班管理員（完整排班系統管理功能）

**超級管理員：**
- `superadmin` - 超級管理員（所有權限、全站用戶管理、跨模組操作）

**角色層級說明：**
1. **user** - 基礎使用權限，可使用一般功能（報名、查詢自己的記錄）
2. **user_**** - 模組專用使用者，可使用該模組的核心功能（簽到、排班）
3. **poweruser_**** - 模組幹部，可查看和管理部分數據
4. **admin_**** - 模組管理員，完整管理該模組的所有功能和用戶
5. **superadmin** - 全站超級管理員，不受任何限制

**Cloud Functions：**
- `generateCustomToken` - 一般登入
- `generateCustomTokenFromLiff` - LIFF 登入（已停用）
- `updateUserRole` - 更新用戶角色

**角色檢查機制：**
- 前端：使用 `checkAdminAuth(['role1', 'role2'])` 檢查必要角色
- 後端 onCall：使用 `assertHasRequiredRole(context, ['role1', 'role2'])` 檢查必要角色
- 後端 onRequest：使用 `ensureRequestHasRoles(req, res, ['role1', 'role2'])` 檢查必要角色

**權限檢查範例：**
```javascript
// 簽到管理頁面 - 允許簽到管理員、幹部、超級管理員
checkAdminAuth(['admin_checkin', 'poweruser_checkin', 'superadmin'])

// 神務管理頁面 - 允許神務管理員、專員、超級管理員
checkAdminAuth(['admin_service', 'poweruser_service', 'superadmin'])

// 排班管理頁面 - 允許排班管理員、幹部、超級管理員
checkAdminAuth(['admin_schedule', 'poweruser_schedule', 'superadmin'])

// 簽到功能 - 允許簽到使用者及以上權限
checkAdminAuth(['user_checkin', 'poweruser_checkin', 'admin_checkin', 'superadmin'])

// 排班功能 - 允許排班使用者及以上權限
checkAdminAuth(['user_schedule', 'poweruser_schedule', 'admin_schedule', 'superadmin'])

// 全站管理 - 只允許超級管理員
checkAdminAuth(['superadmin'])
```

---

## 前端樣式架構

### 單一 CSS 檔案架構 (2025-11-10)

**檔案：** `public/styles/common.css` (1,154 行)
- 全站基礎樣式：915 行
- **統一管理介面樣式：239 行**

**統一管理介面設計：**
所有管理頁面（簽到管理 + 神務服務管理）使用相同的 UI 架構：

1. **金色漸層頂部** (.manage-header)
   - 標題 + 副標題
   - 右側按鈕（回首頁、登出）
   - 金色配色：#D4AF37

2. **白色導航列** (.manage-subnav)
   - 簽到管理：儀表板、簽到記錄、巡邏點管理、用戶管理
   - 金色底線強調

3. **主要內容區** (.manage-main)
   - 白色背景，圓角卡片
   - 統一的統計卡片樣式

**已統一的管理頁面（7 個）：**
- Checkin: index.html, dashboard.html, record.html, patrol.html, user.html
- Service: index.html, orders.html

**核心類別：**
- `.manage-layout` - 主容器
- `.manage-header` - 金色頂部
- `.manage-subnav` - 白色導航列
- `.manage-main` - 主要內容區
- `.manage-card` - 內容卡片
- `.manage-stat-card` - 統計卡片

**已移除：**
- ❌ `public/checkin/manage/styles/manage.css` (已刪除)
- ❌ `public/service/manage/styles/manage.css` (已刪除)

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

**部署 Firestore 規則：**
```bash
# Platform 專案 (使用 firebase.platform.json)
firebase deploy --project platform-bc783 --only firestore:rules --config firebase.platform.json

# Checkin 專案 (使用預設 firebase.json)
firebase deploy --project checkin-76c77 --only firestore:rules
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

**Platform 專案 (firestore.platform.rules)：**
- 所有認證用戶可讀取用戶資料
- 用戶可修改自己的資料
- 管理員/幹部可修改其他用戶的資料
- 只有 superadmin 可創建/刪除用戶
- 部署：`firebase deploy --project platform-bc783 --only firestore:rules --config firebase.platform.json`

**Checkin 專案 (firestore.rules)：**
- 所有認證用戶可讀取簽到相關資料
- 寫入權限由前端和 Cloud Functions 控制
- 部署：`firebase deploy --project checkin-76c77 --only firestore:rules`

**Custom Claims：**
用戶的角色 (`roles`) 儲存在 Firestore `users` collection：
```javascript
// 範例用戶資料
{
  uid: "abc123",
  displayName: "張三",
  roles: ["admin_checkin", "poweruser_service"],
  active: true
}
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

### 2025-11-12: 修復巡邏點編輯功能 - Cloud Functions 2nd Gen 升級與事件綁定

**決策：** 修復巡邏點管理頁面無法儲存編輯的問題

**問題症狀：**
- 用戶在後台編輯巡邏點（容許距離、測試模式）後點擊「儲存」
- 沒有任何反應（既沒有成功也沒有失敗訊息）
- 但在 Firebase Console 手動編輯可以成功顯示在前端

**根本原因（兩個問題）：**

1. **Cloud Functions URL 版本不匹配**
   - Cloud Functions 已升級為 2nd Gen，使用新的 Cloud Run URL 格式
   - 前端 `firebase-init.js` 還在呼叫舊的 1st Gen URL
   - 導致 API 請求發送到不存在的端點

2. **事件監聽器綁定失敗**
   - `patrol-manage.js` 使用動態 `import` 載入
   - 事件監聽器在 `DOMContentLoaded` 中綁定
   - 但動態載入時 `DOMContentLoaded` 事件早已觸發
   - 導致「儲存」按鈕沒有綁定事件處理器

**解決方案：**

1. **更新 Cloud Functions URL**
   ```javascript
   // firebase-init.js - 更新為 2nd Gen URL
   export const API_ENDPOINTS = {
     verifyCheckinV2: 'https://verifycheckinv2-tcj2pvviia-df.a.run.app',
     getPatrols: 'https://getpatrols-tcj2pvviia-df.a.run.app',
     savePatrol: 'https://savepatrol-tcj2pvviia-df.a.run.app',
     deletePatrol: 'https://deletepatrol-tcj2pvviia-df.a.run.app',
     // ... 其他端點
   }
   ```

2. **修復事件綁定時機**
   ```javascript
   // patrol-manage.js - 將事件監聽器從 DOMContentLoaded 移到 init()
   export async function init() {
     // ... 初始化邏輯
     
     // 綁定事件監聽器（必須在這裡，因為模組是動態載入的）
     document.getElementById('patrolForm')?.addEventListener('submit', savePatrol);
     document.getElementById('addPatrolBtn')?.addEventListener('click', openPatrolModal);
     // ... 其他事件
   }
   
   // 移除舊的 DOMContentLoaded 監聽器
   ```

3. **修復變數未定義錯誤**
   - 移除未定義的 `isLiffEnvironment` 檢查
   - 管理後台不在 LIFF 環境中運行，直接綁定登出按鈕

**部署步驟：**

1. 重新部署所有 Checkin Cloud Functions（獲取新的 2nd Gen URL）：
   ```bash
   cd functions
   firebase deploy --project checkin-76c77 --only functions:getPatrols,functions:deletePatrol,functions:verifyCheckinV2,functions:getCheckinHistory,functions:getDashboardStats,functions:getTestModeStatus,functions:updateTestMode,functions:savePatrol
   ```

2. 更新前端配置並部署到 Vercel：
   ```bash
   vercel --prod --yes
   ```

**受影響的檔案：**
- `public/js/firebase-init.js` - 更新 8 個 Cloud Functions URL
- `public/checkin/manage/js/patrol-manage.js` - 修復事件綁定時機

**測試確認：**
- ✅ 巡邏點編輯功能正常（可儲存容許距離、測試模式）
- ✅ 顯示「儲存成功」提示訊息
- ✅ 重新整理後數據保留
- ✅ 所有管理功能正常運作

**經驗教訓：**
1. **Cloud Functions 升級需同步更新前端 URL** - 2nd Gen 使用 Cloud Run URL 格式
2. **動態 import 的模組不能依賴 DOMContentLoaded** - 事件監聽器應在模組的 `init()` 函數中綁定
3. **這個問題與之前 GPS 簽到按鈕相同** - 應統一檢查所有動態載入的管理模組

**潛在風險：**
- 其他管理模組（`dashboard.js`, `record.js`, `user_checkin.js`）仍引用 `isLiffEnvironment`
- 如果這些模組也改為動態載入，需要同樣的修復

---

### 2025-11-12: 修復 Firestore 安全規則 - 允許管理員編輯用戶角色

**決策：** 修改 Platform 專案的 Firestore 安全規則，允許 superadmin 和管理員編輯其他用戶的角色

**背景：**
- 用戶管理頁面無法編輯其他用戶的角色
- 原始規則只允許用戶修改自己的資料：`allow update: if userId == request.auth.uid`
- 即使 superadmin 也無法管理其他用戶

**解決方案：**

1. **修改 firestore.platform.rules**
   - 新增 `getUserData()` - 讀取當前用戶資料
   - 新增 `hasUserData()` - 檢查用戶資料是否存在
   - 新增 `isSuperAdmin()` - 檢查超級管理員權限
   - 新增 `isAnyAdmin()` - 檢查任何管理員/幹部權限
   - 修改 users 更新規則：`allow update: if userId == request.auth.uid || isAnyAdmin()`
   - 限制創建/刪除：`allow create, delete: if isSuperAdmin()`

2. **創建 firebase.platform.json**
   - 為 Platform 專案創建專屬配置
   - 指向 `firestore.platform.rules`（不是 `firestore.rules`）
   - 解決多專案部署配置問題

3. **部署命令**
   ```bash
   firebase deploy --project platform-bc783 --only firestore:rules --config firebase.platform.json
   ```

**管理員權限列表（isAnyAdmin）：**
- `superadmin` - 超級管理員
- `admin_checkin` - 簽到管理員
- `admin_service` - 神務管理員
- `admin_schedule` - 排班管理員
- `poweruser_checkin` - 簽到幹部
- `poweruser_service` - 神務專員
- `poweruser_schedule` - 排班專員

**安全性：**
- ✅ 一般用戶只能修改自己的資料
- ✅ 管理員和幹部可以修改其他用戶的角色
- ✅ 只有 superadmin 可以創建和刪除用戶
- ✅ 所有操作都需要認證

**測試確認：**
- ✅ Firebase Console 手動編輯用戶角色 - 成功
- ✅ 網站後台編輯用戶角色 - 成功
- ✅ 規則已部署到生產環境

**維護要點：**
- Platform 專案規則：使用 `firebase.platform.json`
- Checkin 專案規則：使用 `firebase.json`（預設）
- 新增管理員角色時需同步更新 `isAnyAdmin()` 函數

---

### 2025-11-11: 統一登入 UI 系統實作完成

**決策：** 實作全站統一登入介面，提升用戶體驗一致性

**背景：**
- 23 個頁面使用不同的登入提示樣式
- 服務表單使用舊的 `<div id="loginPrompt">` 本地登入按鈕
- 管理頁面缺少統一的權限檢查機制
- 用戶體驗不一致，維護困難

**實作內容：**

1. **創建統一登入 UI 組件**（`auth-ui.js`）
   - 全螢幕淺金色背景（#F5F0E8）
   - 居中白色卡片設計
   - 金色標題「請先登入」（#D4AF37）
   - 綠色 LINE 登入按鈕（#06C755）
   - 響應式設計，支援行動裝置

2. **增強認證守衛**（`auth-guard.js`）
   - 新增 `checkAuthWithUI()` - 一般用戶認證（停留在頁面顯示登入 UI）
   - 新增 `checkAdminAuth()` - 管理員權限檢查（支援角色陣列）
   - 整合 `auth-ui.js` 提供統一登入介面
   - 登入成功後自動隱藏登入 UI，顯示主要內容
   - 權限不足時顯示友善錯誤訊息

3. **更新所有 23 個頁面**
   - **首頁（1）**: 使用 `checkAuthWithUI()`
   - **服務表單（11）**: DD, LD, ND, PS, QJ, ZY, BG, FTC, FTP, FTY, XY
     - 移除舊的 `<div id="loginPrompt">` HTML
     - 使用 `checkAuthWithUI()`
     - 登入成功後動態載入服務模組
   - **服務管理（2）**: service/manage/index.html, orders.html
     - 使用 `checkAdminAuth(['admin_service', 'poweruser_service', 'superadmin'])`
   - **簽到系統（2）**: checkin/checkin.html, history.html
     - 使用 `checkAuthWithUI()`
   - **簽到管理（5）**: checkin/manage/ 下 5 個頁面
     - 使用 `checkAdminAuth(['admin_checkin', 'poweruser_checkin', 'superadmin'])`
   - **管理系統（2）**: manage/index.html, schedule/index.html
     - 使用適當的管理員權限配置

4. **角色權限架構**
   - `admin_service` - 神務服務管理員
   - `admin_checkin` - 簽到系統管理員
   - `admin_schedule` - 排班系統管理員
   - `poweruser_*` - 各模組進階用戶
   - `superadmin` - 超級管理員（所有權限）

**技術亮點：**
- 所有頁面主要內容包裹在 `<div id="mainApp" style="display: none;">`
- 未登入時統一顯示登入 UI 覆蓋層
- 登入成功後動態切換 UI（無需重新載入頁面）
- 使用 Firebase `onAuthStateChanged` 監聽認證狀態
- 管理頁面支援多角色權限檢查

**用戶體驗改善：**
- ✅ 所有頁面登入介面一致（金色 + 白色卡片）
- ✅ 停留在當前頁面（不會跳轉到首頁）
- ✅ 登入一次，跨頁面保持登入狀態
- ✅ 管理頁面自動檢查權限
- ✅ 權限不足時顯示友善提示
- ✅ 流暢的 UI 切換動畫

**維護成本降低：**
- 單一登入 UI 組件（`auth-ui.js`）
- 統一認證邏輯（`auth-guard.js`）
- 新增頁面只需呼叫 `checkAuthWithUI()` 或 `checkAdminAuth()`
- 未來修改登入 UI 只需修改一個檔案

**經 Architect 審查確認：**
- 所有頁面移除舊的登入提示 HTML
- 認證流程符合規格要求
- 權限控制正確實作
- 用戶體驗一致性達成

---

### 2025-11-11: ServiceFormEngine 重構架構規劃完成

**決策：** 設計配置驅動架構以減少服務表單 48% 重複代碼

**背景：**
- 11 個服務表單（DD, LD, ND, PS, QJ, ZY, BG, FTC, FTP, FTY, XY）共 6,344 行代碼
- 70-85% 代碼重複（認證、驗證、卡片管理、提交流程）
- 差異僅在：SERVICE_TYPE、定價（LAMP_PRICE/DOU_PRICE）、項目選項

**完成的規劃文件：**

1. **ServiceFormEngine-Architecture.md** - 核心架構設計
   - 配置驅動引擎（ServiceFormEngine）
   - 5 個可重用模組：AuthManager, FormValidator, PaymentHandler, CardManager, SubmitHandler
   - UI 模板策略：從現有 HTML 克隆或動態生成
   - 入口檔案簡化：577 行 → 25 行（減少 96%）
   - 經 3 輪 Architect 審查通過

2. **ServiceFormEngine-Migration.md** - 遷移步驟規劃
   - 4 階段計劃（預估 20 天，2-3 位工程師）
   - 階段 1：基礎設施建設（引擎 + 5 模組）
   - 階段 2：首個服務遷移（DD 作為範本）
   - 階段 3：批次遷移 10 個服務
   - 階段 4：清理與優化
   - ⚠️ 需要建立測試框架（Vitest, Playwright）才能執行

3. **ServiceFormEngine-RiskAssessment.md** - 風險評估與測試策略
   - 識別 8 個主要風險（含優先級和緩解措施）
   - 測試金字塔：單元測試 60% + 整合測試 30% + E2E 10%
   - 41 項回歸測試清單
   - 金絲雀部署策略
   - P0/P1 故障應對計劃（10 分鐘回滾 SLA）
   - ⚠️ 需要配置監控工具才能執行

**預期成果**（實作後）：
- 代碼量：6,344 行 → 3,300 行（減少 48%）
- 新增服務：4 小時 → 30 分鐘（減少 88%）
- 修改業務邏輯：2 小時 → 10 分鐘（減少 92%）
- Bug 修復：11 次修改 → 1 次修改（減少 91%）

**當前狀態：** 
- ✅ 架構設計完成（可實作）
- ✅ 遷移計劃完成（參考指南）
- ✅ 風險評估完成（參考指南）
- ❌ 測試基礎設施尚未建立
- ❌ 監控工具尚未配置
- ❌ 尚未實際執行重構

**維護要點：**
- 這些是**規劃文件**，供未來實作參考
- 實作前需先建立測試和監控基礎設施
- 根據實際團隊人力調整時程
- 保持文件與實作同步

---

### 2025-11-11: 代碼清理階段完成

**決策：** 清理未使用的死代碼和冗餘日誌

**清理成果：**

1. **firebase-lazy.js 死代碼清理**（68 行）
   - 刪除 3 個未使用函數：`hasCachedAuth()`, `toggleLoadingIndicator()`, `createLazyFormHandler()`
   - 經 Architect 審查確認無其他模組引用

2. **console.log 清理**（22 條）
   - `auth.js`: 刪除 11 條調試日誌（保留錯誤日誌和關鍵流程）
   - `storage-simple.js`: 刪除 8 條重複日誌
   - `firebase-init.js`: 刪除 2 條調試日誌
   - `callback.html`: 刪除 1 條調試日誌

3. **callback.html 調試優化**
   - debugInfo 區塊改為開發模式控制
   - 條件：`location.hostname === 'localhost'` 或 `?debug=true` 參數
   - 生產環境自動隱藏調試信息

**影響：**
- 代碼更精簡易讀
- 生產環境控制台更乾淨
- 保留關鍵診斷日誌供故障排查

---

### 2025-11-11: Firebase 完整延遲載入優化（方案 B）

**決策：** 實施全站 Firebase 延遲載入策略

**優化成果：**
- **首頁：** 1360ms → 110ms（**92% 速度提升**）
- **服務列表頁：** 完全不載入 Firebase
- **服務申請表：** 僅在點擊登入時載入 Firebase

**架構變更：**

1. **創建統一延遲載入 Helper**
   - 檔案：`public/js/firebase-lazy.js`
   - 功能：提供記憶化的 `loadFirebaseCore()`, `ensureAuth()`, `ensureFirestore()` 等函數

2. **優化 17 個頁面**
   - 首頁：`index.html` - 點擊登入時才載入
   - 簽到系統：`checkin.html`, `history.html` - 使用 Auth Guard
   - 管理介面：`manage/index.html` - 使用 Auth Guard
   - 服務列表：`service/service.html` - 完全不載入 Firebase
   - 11 個服務申請表：DD, LD, ND, PS, QJ, ZY, BG, FTC, FTP, FTY, XY

3. **重構 11 個服務 JS 模組**
   - 移除靜態 `import Firebase`
   - 改為動態 `await import()` 載入
   - 使用 `export async function init()` 包裹所有邏輯
   - 導出 `{ triggerLogin }` 實現一鍵登入

**實作模式：**

```javascript
// HTML - 延遲載入模式
async function loadModule() {
    if (!moduleLoaded) {
        const module = await import('/service/js/DD.js');
        moduleInstance = await module.init(); // 捕獲返回值
        moduleLoaded = true;
    }
    return moduleInstance;
}

document.addEventListener('click', async (e) => {
    if (e.target.id === 'loginBtn') {
        const module = await loadModule();
        if (module && module.triggerLogin) {
            module.triggerLogin(); // 一鍵登入
        }
    }
});

// JS 模組 - 動態載入 Firebase
export async function init() {
    // 動態載入 Firebase
    const firebaseInit = await import('../../js/firebase-init.js');
    const { platformAuth, platformDb } = firebaseInit;
    
    // 立即執行初始化邏輯
    const initializeApp = () => {
        // 設置事件監聽器和認證狀態監聽
    };
    
    initializeApp();
    
    // 導出觸發登入函數
    return { triggerLogin: handleLineLogin };
}
```

**技術挑戰與解決：**

1. **DOMContentLoaded 時序問題**
   - 問題：模組載入後 DOMContentLoaded 已觸發，監聽器失效
   - 解決：改為立即執行函數 `initializeApp()`

2. **一鍵登入流程**
   - 問題：第一次點擊不觸發認證，需點擊兩次
   - 解決：JS 導出 `triggerLogin`，HTML 載入後立即調用

3. **返回值捕獲**
   - 問題：`loadModule()` 未捕獲 `init()` 返回值
   - 解決：`moduleInstance = await module.init()`

**效能驗證：**
- 所有測試頁面載入時控制台日誌為空（Firebase 未載入）
- Architect 審查通過，確認延遲載入正確實施
- 一鍵登入流程正常運作

**維護要點：**
- 新增服務頁面時須遵循相同的延遲載入模式
- `init()` 函數必須返回 `{ triggerLogin }` 對象
- HTML 的 `loadModule()` 必須捕獲 `init()` 返回值

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
