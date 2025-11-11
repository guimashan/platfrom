# 龜馬山整合服務平台 - 系統文檔

**最近更新**: 2025-11-11 (ServiceFormEngine 重構架構規劃完成)

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
