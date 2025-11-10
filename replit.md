# 龜馬山整合服務平台 - 開發專案

**最近更新**: 2025-11-10 16:15 清理舊版福田會檔案 + 優化 Replit 環境

## 🧹 系統清理完成 (2025-11-10 16:15)

**環境清理：**
- ✅ 移除未使用的模組（Python 3.11, PostgreSQL 16）
- ✅ 保留唯一使用的模組（Node.js 20）
- ✅ 減少環境負載，加快啟動速度

**檔案清理：**
- ✅ 刪除舊版福田會 HTML 檔案（3個）
  - ❌ FTP.html（信眾個人入會 - 舊版）
  - ❌ FTC.html（企業團體入會 - 舊版）
  - ❌ FTY.html（福田Young會 - 舊版）
- ✅ 刪除舊版福田會 JS 檔案（3個）
  - ❌ FTP.js（15K）
  - ❌ FTC.js（12K）
  - ❌ FTY.js（24K）
- ✅ 更新 ft.html，改用獨立 LIFF URLs
  - 信眾個人 → https://liff.line.me/2008269293-71e3y43M
  - 企業團體 → https://liff.line.me/2008269293-LKR2Nr2x
  - 福田Young會 → https://liff.line.me/2008269293-XPgaLra8

**清理原因：**
- 這些檔案已被 keywords.js 中的獨立 LIFF App URLs 完全取代
- 透過 LINE Bot 無法訪問到這些舊檔案（死代碼）
- 保留會造成架構混亂和維護困難

---

## 🎉 方案 C - 自動導出工具部署成功 (2025-11-10 16:00)

**部署狀態：** 🟢 已上線運行

**核心功能：exportKeywordsToCode - 自動導出工具**
- URL: `https://exportkeywordstocode-4yprhpbawa-df.a.run.app`
- 功能：從 Firestore 讀取關鍵字，生成 keywords.js 代碼
- 模式：
  - 預覽模式（瀏覽器訪問）：顯示 HTML 界面，包含統計、下載按鈕、操作指南
  - 下載模式（`?download=true`）：直接下載 keywords.js 文件
- 安全特性：
  - ✅ 使用 JSON.stringify 轉義所有字符串（防止注入攻擊）
  - ✅ Template literals 改用字符串拼接（避免反引號問題）
  - ✅ HTML 完整轉義（防止 XSS）
  - ✅ 通過 Architect 審查（無安全問題）

**三層同步機制：**
```
硬編碼（keywords.js）←─┐
                        │
                        ├─→ 三者保持同步
                        │
Firestore（動態資料）  ←─┤
                        │
網站後台（可編輯）     ←─┘
```

**同步工作流程：**
1. ✏️ 在網站後台 `/manage/keywords.html` 修改關鍵字
2. 🔄 Firestore 即時更新
3. 📦 訪問 `https://exportkeywordstocode-4yprhpbawa-df.a.run.app`
4. 💾 點擊「下載 keywords.js」按鈕
5. 📝 替換 `functions/src/shared/keywords.js`
6. 🚀 重新部署：`cd functions && npm run deploy`
7. ✅ 三者同步完成！（硬編碼 = Firestore = 網站後台）

**重要提醒：**
- ⚠️ 修改後台後，需執行導出工具並手動更新硬編碼
- ⚠️ 只有重新部署後，硬編碼才會與 Firestore 同步
- ⚠️ 導出的代碼已通過語法驗證（`node -c`）

---

## ✅ 第三版系統部署成功 (2025-11-10 15:30)

**部署狀態：** 🟢 已上線運行

**核心 Cloud Functions：**
- ✅ `lineMessaging` - LINE Bot Webhook
  - URL: `https://asia-east2-platform-bc783.cloudfunctions.net/lineMessaging`
  - 狀態：已部署並運行
  
- ✅ `clearKeywords` - 清空關鍵字工具
  - URL: `https://asia-east2-platform-bc783.cloudfunctions.net/clearKeywords`
  - 狀態：已執行（刪除 18 個舊關鍵字）
  
- ✅ `rebuildKeywords` - 重建關鍵字工具
  - URL: `https://rebuildkeywords-4yprhpbawa-df.a.run.app`
  - 狀態：已執行（創建 19 個新關鍵字）

- ✅ `exportKeywordsToCode` - 自動導出工具 ⭐ 新增
  - URL: `https://exportkeywordstocode-4yprhpbawa-df.a.run.app`
  - 狀態：已部署並通過測試
  - 功能：實現三層同步機制（硬編碼 ←→ Firestore ←→ 網站後台）

**已清理的舊系統：**
- ❌ `lineWebhook` (asia-east2) - 已刪除
- ❌ `migrateKeywords` (asia-east2) - 已刪除
- ❌ `migrateAllKeywords` (asia-east2) - 已刪除
- ❌ `fixLiffUrls` (us-central1) - 已刪除
- ❌ `scripts/migrate-keywords.js` - 已刪除

**Firestore 狀態：**
- ✅ 19 個關鍵字已重建完成
- ✅ 架構：16 個共用 LIFF App + 3 個獨立 LIFF App
- ✅ 雙保險機制已啟動（Firestore + 硬編碼後備）
- ✅ 三層同步機制已啟動（透過 exportKeywordsToCode 工具）

**⚠️ 重要：LINE Webhook URL 設定**

如果您之前使用的是 `lineWebhook`，請更新 LINE Developers Console：

1. 前往：https://developers.line.biz/console/
2. 選擇您的 Messaging API Channel
3. 更新 Webhook URL 為：
   ```
   https://asia-east2-platform-bc783.cloudfunctions.net/lineMessaging
   ```
4. 啟用 Webhook
5. 測試連接

**測試關鍵字：**
- 簽到、打卡 → 奉香簽到
- 點燈、DD → 龜馬山一點靈
- 福田會、FT → 福田會入會
- 福田Young會 → 獨立 LIFF
- 排班、SC → 志工排班

---

## 重要實現記錄 (2025-11-10) - 混合架構關鍵字系統

### 專案目標
建立「龜馬山整合服務平台」混合架構關鍵字管理系統：
- **共享模組**：`functions/src/shared/keywords.js` 統一定義 19 個關鍵字
- **雙保險機制**：
  1. Firestore 動態查詢（優先，5分鐘快取）
  2. 硬編碼後備（使用共享模組，監控使用頻率）
  3. 預設說明訊息
- **混合LIFF架構**：
  - 16 個共用 LIFF App（需轉發器）
  - 3 個獨立 LIFF App（直接URL）

### 系統架構

#### 核心組件
1. **共享關鍵字模組** (`functions/src/shared/keywords.js`)：
   - 定義 19 個關鍵字配置
   - 支援兩種模式：`liffUrl`（獨立）或 `liffApp + path`（共用）
   - 提供 `buildLiffUrl()` 自動生成正確 LIFF URL
   - 提供 `normalizeKeyword()` 正規化關鍵字

2. **重建腳本** (`functions/src/admin/rebuild.js`)：
   - 導入共享模組
   - 清空並重建 Firestore 關鍵字
   - 顯示架構統計（共用/獨立 LIFF App 數量）

3. **訊息處理** (`functions/src/messaging/index.js`)：
   - 3 層查詢機制（Firestore → 硬編碼後備 → 預設訊息）
   - 後備使用計數器（監控 Firestore 健康）
   - 動態硬編碼後備（遍歷共享模組 KEYWORDS）

4. **轉發器** (`public/liff/*.html`)：
   - 簡化版轉發器（支援 `liff.state` 路由）
   - 保持 16 個共用 LIFF App 關鍵字運作

#### 19 個關鍵字配置

**Checkin 簽到（2個）**：
- 奉香簽到 → /checkin/index.html（別名：簽到、奉香、打卡、打卡簽到）
- 簽到管理 → /checkin/history.html（別名：奉香管理、1111）

**Service 神務（11個）**：
- 龜馬山一點靈 → /service/DD.html
- 年斗法會 → /service/ND.html
- 禮斗法會 → /service/LD.html
- 中元法會 → /service/ZY.html
- 普施法會 → /service/PS.html
- 秋祭法會 → /service/QJ.html
- 建宮廟款 → /service/BG.html
- 添香油 → /service/XY.html
- 福田會 → /service/ft.html
- 神務服務 → /service/index.html

**Schedule 排班（4個）**：
- 本週班表 → /schedule/week.html
- 本月班表 → /schedule/month.html
- 班表 → /schedule/roste.html
- 志工排班 → /schedule/schedule.html

**獨立 LIFF App（3個）**：
- 福田Young會 → 獨立 LIFF URL (2008269293-XPgaLra8)
- 企業團體 → 獨立 LIFF URL (2008269293-LKR2Nr2x)
- 信眾個人 → 獨立 LIFF URL (2008269293-71e3y43M)

### 部署步驟（完整重寫版）

**準備工作：**
- ✅ Firebase Admin SDK 已初始化（所有 Cloud Functions）
- ✅ 共享模組架構（keywords.js）
- ✅ 3 層查詢機制（Firestore → 硬編碼後備 → 預設）
- ✅ 舊檔案已清理

**步驟 1：部署 Cloud Functions**
```bash
cd functions
npm run deploy
```

**預期導出的 Functions：**
- `lineMessaging` - LINE Bot Webhook（新）
- `clearKeywords` - 清空關鍵字（新）
- `rebuildKeywords` - 重建關鍵字（使用共享模組）

**步驟 2：清空 Firestore 舊關鍵字**
```
訪問：https://asia-east2-platform-bc783.cloudfunctions.net/clearKeywords
```

**預期輸出：**
```
🗑️  步驟 1：掃描現有關鍵字...
📊 找到 X 個關鍵字

🗑️  步驟 2：批量刪除...
🗑️  已刪除 X/X 筆

🎉 清空完成！
```

**步驟 3：重建 Firestore 關鍵字**
```
訪問：https://asia-east2-platform-bc783.cloudfunctions.net/rebuildKeywords
```

**預期輸出：**
```
📝 步驟 2：批量寫入 19 個關鍵字...
   ⚙️  架構：16 個共用 LIFF App + 3 個獨立 LIFF App

✅ [1/19] [共用] 奉香簽到 → https://liff.line.me/...
✅ [2/19] [共用] 簽到管理 → https://liff.line.me/...
...
✅ [19/19] [獨立] 信眾個人 → https://liff.line.me/...

📊 架構統計：
   🔗 共用 LIFF App：16 個
   ⭐ 獨立 LIFF App：3 個

🎉 所有 19 個關鍵字已成功重建！
```

**步驟 4：測試 LINE Bot**

在 LINE 中測試以下關鍵字：

**簽到系統（共用 LIFF App）：**
- `簽到` / `奉香` / `打卡` → 奉香簽到
- `簽到管理` / `奉香管理` / `1111` → 簽到管理

**神務服務（共用 LIFF App）：**
- `點燈` / `龜馬山一點靈` / `DD` → 龜馬山一點靈
- `年斗` / `年斗法會` / `ND` → 年斗法會
- `福田會` / `福田` / `FT` → 福田會入會

**排班系統（共用 LIFF App）：**
- `排班` / `志工排班` / `SC` → 志工排班
- `本週班表` / `週班表` / `WE` → 本週班表

**獨立 LIFF App：**
- `福田Young會` → 獨立 LIFF URL
- `企業團體` → 獨立 LIFF URL
- `信眾個人` → 獨立 LIFF URL

**預期行為：**
1. 用戶輸入關鍵字
2. LINE Bot 回覆含有按鈕的訊息
3. 用戶點擊按鈕
4. 在 LINE 內開啟對應的 LIFF 表單頁面

**步驟 5：監控系統健康**

查看 Cloud Functions 日誌：
```bash
# 查看 messaging 日誌
firebase functions:log --only lineMessaging

# 關鍵指標：
# ✅ [Firestore] 匹配: XXX - Firestore 成功
# ⚠️  [硬編碼後備] 匹配: XXX - 後備觸發（應極少）
# 💬 用戶訊息: XXX - 收到訊息
```

**故障排除：**

1. **如果關鍵字無回應：**
   - 檢查 Firestore 是否有資料（19 筆）
   - 查看 Cloud Functions 日誌是否有錯誤
   - 確認 LINE Webhook URL 正確設定

2. **如果後備計數器持續增加：**
   - Firestore 可能有問題
   - 重新執行 rebuildKeywords
   - 檢查關鍵字快取是否正常

3. **如果 LIFF URL 無法開啟：**
   - 確認 LIFF App ID 正確
   - 檢查檔案路徑是否存在
   - 確認轉發器（service/checkin/schedule.html）運作正常

---

## 歷史記錄 (2025-11-09) - 雙保險關鍵字管理系統

### 專案目標
建立「龜馬山整合服務平台」雙保險關鍵字管理架構：
- **動態系統（優先）**：Firestore 關鍵字資料庫，透過網站後台 /manage/keywords.html 管理，5分鐘快取
- **硬編碼（後備）**：functions/src/messaging/index.js 內建 18 個關鍵字，保障系統穩定性

### 完整實施流程

#### 步驟 1：重新編寫硬編碼（18 個關鍵字）
- ✅ **Step 2 (Checkin - 2 個關鍵字)**：
  - 奉香簽到（DD/dd）、簽到管理（1111）
- ✅ **Step 3 (Service - 11 個關鍵字)**：
  - 線上點燈（DD/dd）、年斗法會（ND/nd）、禮斗法會（LD/ld）、秋祭法會（QJ/qj）
  - 中元法會（ZY/zy）、普施法會（PS/ps）、建宮廟款（BG/bg）、添香油（XY/xy）
  - 福田會（FT/ft）、奉獻（ON/on）、神務管理（2222）
- ✅ **Step 4 (Schedule - 5 個關鍵字)**：
  - 排班管理（3333）、本週班表（WE/we）、本月班表（MO/mo）、班表（RO/ro）、志工排班（SC/ss）

#### 步驟 2：部署到正式環境
- ✅ Firebase Functions 成功部署（platform-bc783）
- ✅ lineWebhook Function 更新完成

#### 步驟 3：清空 Firestore 舊資料
- ✅ 刪除 lineKeywordMappings collection 中的 12 筆舊資料

#### 步驟 4：批量寫入 Firestore（18 個關鍵字）
- ✅ 建立批量寫入腳本：functions/src/admin/migrate-all-keywords.js
- ✅ 成功寫入 18 個關鍵字：
  - Step 2 (Checkin): 2 個
  - Step 3 (Service): 11 個
  - Step 4 (Schedule): 5 個

#### 步驟 5：修復關鍵順序問題
- ✅ **問題診斷**：Step 4 硬編碼中「志工排班」使用 `includes('排班')`，會錯誤攔截「排班管理」或 3333
- ✅ **修復方案**：重新排序 Step 4，將「排班管理」移到「志工排班」之前
- ✅ **Architect 審查通過**：Pass - 雙保險架構完全一致，所有 18 個關鍵字路由正確

### 技術架構

**雙保險邏輯順序**（messaging/index.js）：
```javascript
// Line 165: 動態關鍵詞比對（Firestore 優先）
const keywordDoc = await getKeywordMapping(text);
if (keywordDoc) {
  return keywordDoc.replyPayload;
}

// Line 203: 硬編碼關鍵詞（後備保險）
// Step 2, 3, 4 總計 18 個關鍵字...
```

**關鍵字資料結構**：
```javascript
{
  keyword: '排班管理',          // 主關鍵字
  aliases: ['3333'],           // 別名陣列
  category: 'schedule',        // 類別
  module: 'schedule',          // 模組
  step: 4,                     // 步驟
  priority: 1,                 // 優先級（排序用）
  liffUrl: 'https://liff.line.me/...',
  replyPayload: { /* LINE 回覆格式 */ }
}
```

**同步機制**：
- 網站後台 /manage/keywords.html → Firestore（即時同步）
- Firestore → LINE Bot（5分鐘快取）
- 硬編碼 → 後備保險（Firestore 找不到時觸發）

### 完整關鍵字列表（18 個）

| 步驟 | 關鍵字 | 別名 | 模組 | LIFF URL |
|------|--------|------|------|----------|
| **Step 2: Checkin** |
| 2.1 | 奉香簽到 | DD, dd | checkin | /liff/checkin/index.html |
| 2.2 | 簽到管理 | 1111 | checkin | /liff/checkin/manage/index.html |
| **Step 3: Service** |
| 3.1 | 線上點燈 | DD, dd | service | /liff/service/DD.html |
| 3.2 | 年斗法會 | ND, nd | service | /liff/service/ND.html |
| 3.3 | 禮斗法會 | LD, ld | service | /liff/service/LD.html |
| 3.4 | 秋祭法會 | QJ, qj | service | /liff/service/QJ.html |
| 3.5 | 中元法會 | ZY, zy | service | /liff/service/ZY.html |
| 3.6 | 普施法會 | PS, ps | service | /liff/service/PS.html |
| 3.7 | 建宮廟款 | BG, bg | service | /liff/service/BG.html |
| 3.8 | 添香油 | XY, xy | service | /liff/service/XY.html |
| 3.9 | 福田會 | FT, ft | service | /liff/service/FTP.html |
| 3.10 | 奉獻 | ON, on | service | /liff/service/ON.html |
| 3.11 | 神務管理 | 2222 | service | /liff/service/manage/index.html |
| **Step 4: Schedule** |
| 4.1 | 排班管理 | 3333 | schedule | /liff/schedule/manage/dashboard.html |
| 4.2 | 本週班表 | WE, we | schedule | /liff/schedule/week.html |
| 4.3 | 本月班表 | MO, mo | schedule | /liff/schedule/month.html |
| 4.4 | 班表 | RO, ro | schedule | /liff/schedule/roste.html |
| 4.5 | 志工排班 | SC, ss | schedule | /liff/schedule/schedule.html |

### 部署狀態
- ✅ Cloud Functions 已部署（2025-11-09）
- ✅ lineWebhook Function 成功更新
- ✅ Firestore 關鍵字資料庫已建立（18 個關鍵字）
- ✅ 網站後台管理介面已就緒（/manage/keywords.html）
- ✅ Architect 審查通過：雙保險架構完全一致

### 檔案更新
- functions/src/messaging/index.js（重新編寫硬編碼 + 修復排序）
- functions/src/admin/migrate-all-keywords.js（批量寫入腳本）
- functions/src/admin/clear-keywords.js（清空腳本）
- functions/index.js（導出新函數）

#### 步驟 6：修復 LINE webhook 簽名驗證（2025-11-09）
- ✅ **問題診斷**：簽名驗證被禁用，因為 rawBody 處理問題
- ✅ **修復方案**：使用 Firebase Functions v2 自動提供的 `req.rawBody`
- ✅ **實作細節**：
  - 加入 crypto 模組計算 HMAC-SHA256
  - 使用 `req.rawBody.toString('utf-8')` 取得原始請求內容
  - 比對簽名，不符則回傳 401 Unauthorized
  - 加入詳細的錯誤日誌和 channelSecret 存在性檢查
- ✅ **Architect 審查通過**：簽名驗證邏輯正確，不會影響現有功能
- ✅ **部署完成**：lineWebhook Function 已更新（2025-11-09）

#### 步驟 7：修復 Firebase Secret Manager 同步問題（2025-11-09）
- ✅ **問題診斷**：LINE Webhook 驗證持續失敗（401 Unauthorized）
- ✅ **根本原因**：Firebase Secret Manager 中的 `LINE_MESSAGING_CHANNEL_SECRET` 仍是舊值 `2008221557`（Channel ID），並非正確的 Channel Secret
- ✅ **修復方案**：
  - 使用 `printf "%s" "$SECRET" | firebase functions:secrets:set --force --data-file -` 強制更新
  - Channel Secret 更新為 version 4（正確值：32 字元十六進位碼）
  - Access Token 同步更新為 version 4
  - Firebase 自動重新部署 lineWebhook Function 使用新 secrets
- ✅ **驗證成功**：LINE Developers Console Webhook 驗證通過（HTTP 200 OK）

### 安全狀態
- ✅ **LINE webhook 簽名驗證已啟用**：保護系統免受偽造請求攻擊
- ✅ **Firebase Secrets 已正確設定**：Channel Secret 和 Access Token 已同步（version 4）
- ✅ **Webhook URL 已驗證**：https://linewebhook-4yprhpbawa-df.a.run.app（HTTP 200 OK）

### 測試指引
等待 5 分鐘讓快取過期，然後從 LINE App 測試：
1. 輸入「排班管理」或「3333」→ 應打開排班管理頁面（不會被志工排班攔截）
2. 輸入「簽到管理」或「1111」→ 應打開簽到管理頁面
3. 輸入「神務管理」或「2222」→ 應打開神務管理頁面
4. 從網站後台 /manage/keywords.html 新增/修改/刪除關鍵字 → 應即時同步到 Firestore
5. 等待 5 分鐘 → LINE Bot 應使用新的關鍵字設定

---

## 重要修復記錄 (2025-11-08) - 完整版

### 問題診斷
用戶報告從 LINE App 點擊關鍵字回覆按鈕後持續收到 404 錯誤。經過全面性系統檢查，發現多處 LIFF URL 格式錯誤。

### 根本原因
1. **functions/src/messaging/index.js**：10 個硬編碼關鍵字使用錯誤格式
2. **scripts/migrate-keywords.js**：LIFF_IDS 定義錯誤 + 4 個平台功能關鍵字格式錯誤

**❌ 錯誤格式 1**（舊代碼）：
```javascript
uri: `https://liff.line.me/${LIFF_IDS.service}/liff/service/DD.html`
```

**❌ 錯誤格式 2**（scripts 腳本）：
```javascript
liffUrl: `https://liff.line.me/${LIFF_IDS.checkin}?liff.state=?module=checkin`
```

**❌ 錯誤格式 3**（LIFF_IDS 定義）：
```javascript
const LIFF_IDS = {
    checkin: '2008269293-Nl2pZBpV',  // ❌ 錯誤！這是 service 的 ID
    service: '2008269293-Nl2pZBpV'   // ✅ 正確
    // ❌ 缺少 schedule!
};
```

**✅ 正確格式**（已修復）：
```javascript
uri: `https://liff.line.me/${LIFF_IDS.service}?liff.state=/liff/service/DD.html`

const LIFF_IDS = {
    checkin: '2008269293-nYBm3JmV',  // 奉香簽到
    service: '2008269293-Nl2pZBpV',  // 神務服務
    schedule: '2008269293-N0wnqknr'  // 排班系統
};
```

### 已修復的檔案
1. ✅ **functions/src/messaging/index.js**（15 個 LIFF URL）
2. ✅ **functions/src/admin/migrate-keywords.js**（14 個 LIFF URL，格式已正確）
3. ✅ **scripts/migrate-keywords.js**（LIFF_IDS 定義 + 18 個 LIFF URL）

### 已修復的關鍵字
1. 點燈相關：龜馬山一點靈、線上點燈、安太歲、元辰燈、文昌燈、財利燈、光明燈、點燈
2. 年斗法會：年斗法會、闔家年斗、元辰年斗、紫微年斗、事業年斗、年斗
3. 禮斗法會：禮斗法會、闔家斗、元辰斗、事業斗、禮斗
4. 中元法會：中元法會、中元、普渡、超拔、歷代祖先、祖先、冤親債主、嬰靈、地基主
5. 普施法會：普施大法會、普施、普桌、白米、隨喜功德
6. 秋祭法會：秋祭法會、文昌帝君拱斗
7. 建宮廟款：建宮廟款、青石板、鋼筋、水泥、琉璃瓦
8. 添香油：添香油
9. 福田會：福田會
10. 奉獻：奉獻
11. 奉香簽到：簽到、奉香簽到、奉香、打卡
12. 簽到管理：管理、簽到管理
13. 神務服務：神務服務、神務、服務、法會
14. 排班系統：排班、排班系統、班表、志工

### 部署狀態
- ✅ Cloud Functions 已重新部署（2025-11-08 21:20）
- ✅ 所有 20 個函數更新成功
- ✅ Firestore 關鍵字資料已強制重新遷移（15 個主關鍵字 + 48 個別名）
- ✅ LINE Developers Console LIFF Endpoint URL 已確認正確
- ✅ Vercel 前端部署正常（所有 LIFF 頁面 HTTP 200）
- ✅ Architect 審查通過：所有修復完整且一致

### LINE Developers Console 確認
| LIFF App | LIFF ID | Endpoint URL | 狀態 |
|----------|---------|--------------|------|
| 奉香簽到 | 2008269293-nYBm3JmV | https://go.guimashan.org.tw/liff/checkin.html | ✅ 正確 |
| 神務服務 | 2008269293-Nl2pZBpV | https://go.guimashan.org.tw/liff/service.html | ✅ 正確 |
| 排班系統 | 2008269293-N0wnqknr | https://go.guimashan.org.tw/liff/schedule.html | ✅ 正確 |

### 測試指引
**等待 60 秒**讓 Cloud Function 關鍵字快取過期，然後從 LINE App 測試：

1. 輸入「點燈」→ 點擊「立即點燈」→ 應打開點燈服務頁面
2. 輸入「年斗」→ 點擊「我要報名」→ 應打開年斗法會頁面
3. 輸入「神務服務」→ 點擊「進入服務」→ 應打開神務服務首頁（6 個服務選項）
4. 輸入「奉香簽到」→ 點擊「開始簽到」→ 應打開簽到頁面
5. 輸入「排班系統」→ 點擊「查看班表」→ 應打開排班頁面

## 專案概述

**品牌名稱：龜馬山整合服務平台**

「龜馬山整合服務平台」是一個整合 LINE 登入的數位化管理系統,為龜馬山紫皇天乙真慶宮提供志工管理、奉香簽到、神務服務和排班系統。

**重要提醒**：
- ✅ 網站品牌名稱統一為「**龜馬山整合服務平台**」
- ✅ 所有網頁 `<title>` 標籤已統一使用此名稱
- ✅ 宮廟全稱為「龜馬山 紫皇天乙真慶宮」（用於訂單成功頁面等正式文件）
- ❌ 舊名稱「龜馬山 goLine」、「龜馬山 LIFF」已全面淘汰

## 技術架構

### 前端
- **框架**: HTML5 + JavaScript (ES6+)
- **部署**: Vercel (主要) / Firebase Hosting (備援)
- **樣式**: Noto Sans TC 字型,響應式設計

### 後端
- **平台**: Firebase Cloud Functions (Node.js 20)
- **資料庫**: Firestore
- **認證**: Firebase Auth + LINE OAuth 2.0
- **區域**: asia-east2

### 四個 Firebase 專案

| 專案 | ID | 用途 | 狀態 |
|------|-----|------|------|
| Platform | platform-bc783 | 登入、角色管理、公告、導流 | ✅ 已部署 |
| Check-in | checkin-76c77 | GPS 簽到、巡邏點管理 | ✅ 已部署 |
| Service | service-b9d4a | 神服服務、法會報名 | 待開發 |
| Schedule | schedule-48ff9 | 志工排班、出勤統計 | 待開發 |

**注意**: Check-in 專案已從 `checkin-29f7f`（已刪除）遷移到 `checkin-76c77`（2025-10-31）

## V3 架構變更

### 角色系統升級為陣列
- **舊版**: `role: "admin"` (字串)
- **新版**: `roles: ["user", "poweruser", "admin_checkin"]` (陣列)

### 新增角色
- `user` - 一般使用者
- `poweruser` - 可建立服務單
- `admin_checkin` - 簽到模組管理員
- `admin_service` - 神服模組管理員
- `admin_schedule` - 排班模組管理員
- `superadmin` - 系統超級管理員

## 專案結構

```
.
├── public/                 # 前端靜態文件
│   ├── index.html         # 統一 LINE Login 入口 + 模組選單
│   ├── callback.html      # LINE OAuth 回調處理
│   ├── manage/            # 後台管理總覽
│   │   └── index.html     # 管理模組選單
│   ├── checkin/           # 奉香簽到模組（第一階段樣本）
│   │   ├── index.html     # 簽到前端
│   │   ├── history.html   # 簽到紀錄
│   │   ├── manage/        # 簽到後台（第二階段樣本）
│   │   │   ├── index.html      # 後台入口
│   │   │   ├── dashboard.html  # 儀表板
│   │   │   ├── patrol.html     # 巡邏點管理
│   │   │   └── user.html       # 使用者管理
│   │   ├── js/            # 簽到 JavaScript
│   │   └── styles/        # 簽到樣式
│   ├── service/           # 神務服務模組（第三階段）
│   │   ├── index.html     # 服務前端（樣板）
│   │   ├── DD.html        # 線上點燈頁面（訂單編號 DD）⭐
│   │   ├── ND.html        # 年斗法會頁面（訂單編號 ND）⭐
│   │   ├── js/            # 服務模組 JavaScript
│   │   └── styles/        # 服務模組樣式
│   ├── schedule/          # 排班系統模組（第四階段）
│   │   └── index.html     # 排班前端（樣板）
│   ├── js/                # 共用 JavaScript
│   │   ├── firebase-init.js    # Firebase 初始化
│   │   ├── auth.js            # LINE Login 處理
│   │   └── auth-guard.js      # 共用認證模組 ⭐
│   └── styles/            # 共用樣式
│       └── common.css     # 通用樣式
├── docs/                  # 📚 文件中心 ⭐ 已整理
│   ├── README.md          # 文件索引總覽
│   ├── 教學手冊/          # 完整教學（00-13章）
│   ├── 部署指南/          # Vercel 部署文件
│   ├── 設定指南/          # LINE/LIFF 設定文件
│   └── 開發文件/          # 技術開發文件
├── functions/             # Cloud Functions
│   ├── src/
│   │   ├── platform/      # Platform Functions
│   │   │   └── index.js   # LINE OAuth + Custom Token
│   │   ├── checkin/       # Check-in Functions
│   │   │   └── index.js   # GPS 簽到驗證
│   │   ├── service/       # Service Functions (待開發)
│   │   └── schedule/      # Schedule Functions (待開發)
│   └── index.js           # Functions 入口點
├── firebase.json          # Firebase 配置
└── package.json           # 專案依賴
```

## 開發環境

### Replit 配置 (.replit)

**已安裝模組：**
- `nodejs-20` - Node.js 20.x (唯一使用的語言)

**已移除的模組：**（2025-11-10 清理）
- ~~`python-3.11`~~ - 未使用，已移除
- ~~`postgresql-16`~~ - 未使用，已移除（專案使用 Firebase Firestore）

**Workflow 配置：**
- **前端伺服器**（frontend）
  - 命令：`cd public && npx http-server -p 5000 --cors -c-1`
  - 端口：5000（對應外部端口 80）
  - 輸出類型：webview（網頁預覽）
  - CORS：已啟用
  - 快取：已禁用（-c-1，便於開發）

**部署配置：**
- 部署目標：`autoscale`（自動擴展）
- 運行命令：`npx http-server public -p 5000 --cors -c-1`

**Nix 配置：**
- Channel：stable-25_05
- 額外套件：vlang, google-cloud-sdk-gce

**整合：**
- GitHub Integration (1.0.0) - 已啟用

### 已安裝工具
- Node.js 20.19.3
- Firebase Tools
- http-server (前端開發伺服器)

### 環境變數 (Replit Secrets)
專案使用 Replit Secrets 管理敏感資訊:
- Firebase 四個專案的配置 (apiKey, appId 等)
- LINE Channel ID 和 Secret
- Service Account 金鑰

### 本地開發
```bash
# 啟動前端開發伺服器
npm run serve

# 啟動 Firebase Emulator
npm run emulators
```

## 功能模組狀態

### ✅ 第一、二階段已完成（樣本）
1. **統一平台架構**
   - LINE OAuth 2.0 登入入口
   - 模組選單系統（角色控制）
   - 後台管理總覽
   - 共用認證守衛 (auth-guard.js)

2. **Platform 模組 (平台層)**
   - LINE OAuth 2.0 登入整合
   - Firebase Auth 認證
   - 角色導向系統
   - updateUserRole Function (支援 roles 陣列)

2. **奉香簽到模組（完整樣本）**
   - **前端（第一階段）**:
     - GPS 雙模式簽到（GPS + QR Code）
     - 巡邏點選擇
     - 簽到紀錄查詢
   - **後台（第二階段）**:
     - 儀表板（統計分析、CSV 匯出）
     - 巡邏點管理（CRUD、測試模式、QR Code）
     - 使用者管理（角色權限）

3. **Cloud Functions**
   - Platform: LINE Token Exchange + Custom Token
   - Check-in: GPS 距離驗證（Haversine）

### 📋 第三、四階段待開發
- **Service 模組（第三階段）**
  - 法會報名系統
  - 服務單管理
  - 參與統計
- **Schedule 模組（第四階段）**
  - 志工排班
  - 出勤統計
  - 班表調整

**注意**: Service 和 Schedule 模組已預留架構，可複製 Check-in 樣板快速開發

## 用戶偏好

### 開發規範
- 使用繁體中文註解
- 遵循 V3 架構 (roles 陣列)
- 所有 API 使用 Firebase ID Token 驗證
- Functions 部署到 asia-east2 區域
- 前端使用 ES6 模組語法

### 設計規範
- 主色系: 紫紅 (#8A2BE2)、金色 (#FFD700)
- 字型: Noto Sans TC
- 手機優先設計 (Mobile First)
- 圓角 12px、陰影 2px

### 響應式設計規範（全站適用）
- ⚠️ **必須針對所有四個階段實施全局響應式設計**
- ✅ **手機版斷點**: `@media (max-width: 480px)`
- ✅ **平板版斷點**: `@media (max-width: 768px)`
- **手機版優化原則（480px以下）**:
  - 日期輸入框縮小：年 70px→50px，月/日 50px→40px
  - 間距縮小：5px → 3px
  - 字體稍微縮小：1rem → 0.95rem
  - 按鈕和卡片內距減少
  - 保持觸控區域最小 36px（符合人體工學）
- **CSS文件狀態**:
  - ✅ `public/styles/common.css` - 全站通用樣式（已完成 768px + 480px）
  - ✅ `public/service/styles/service.css` - 服務模組（已完成 768px + 480px）
  - ⚠️ `public/checkin/styles/checkin.css` - 打卡模組（僅 768px，需添加 480px）
  - ⚠️ `public/checkin/manage/styles/manage.css` - 打卡管理（僅 768px，需添加 480px）
  - ⚠️ `public/service/manage/styles/manage.css` - 服務管理（僅 768px，需添加 480px）

### 資料顯示規範
- **生辰顯示**：所有包含生辰（國曆）的報名資料，後台管理介面必須同時顯示：
  - 國曆生辰（YYYY-MM-DD 格式）
  - 農曆生辰（傳統格式，如：2024年 閏二月初八）
  - 農曆日期使用紫色 (#8A2BE2) 標示區分
  - 使用 lunar-javascript 庫進行國曆轉農曆轉換
  - 適用於：線上點燈、年斗法會等所有神務服務

### 測試與部署偏好
- ⚠️ **不在 Replit 開發環境測試**
- ✅ **所有測試都在正式環境進行**
- 流程：修改代碼 → 推送 GitHub → Vercel 自動部署 → 正式環境測試
- 正式域名：https://go.guimashan.org.tw/

## 部署資訊

### Staging (測試環境)
- 網址: https://guimashan.vercel.app
- 用途: 整合測試

### Production (正式環境)
- 網址: https://go.guimashan.org.tw
- Vercel 團隊: guimashan's projects
- Vercel 專案 ID: prj_FwuUrTa2m4MaMocVnb2wAGB8CPyy

## LINE 整合資訊

### LINE Login (OAuth 2.0)
- Channel ID: 2008269293
- Channel Type: LINE Login
- Callback URLs: 
  - 正式: https://go.guimashan.org.tw/callback.html
  - 備用: https://guimashan.vercel.app/callback.html
  - 測試: http://localhost:5000/callback.html

### LINE LIFF (Front-end Framework)
使用同一個 LINE Login Channel (2008269293)，已建立三個獨立 LIFF App：

| LIFF App | LIFF ID | Endpoint URL | 頁面路徑 |
|---------|---------|--------------|---------|
| 奉香簽到 | 2008269293-nYBm3JmV | https://go.guimashan.org.tw/liff/checkin.html | public/liff/checkin.html |
| 排班系統 | 2008269293-N0wnqknr | https://go.guimashan.org.tw/liff/schedule.html | public/liff/schedule.html |
| 神務服務 | 2008269293-Nl2pZBpV | https://go.guimashan.org.tw/liff/service.html | public/liff/service.html |

**注意**：
- 每個 LIFF App 使用專屬的 LIFF ID，確保獨立的權限管理和錯誤追蹤
- public/liff/index.html 作為通用入口頁面，使用神務服務的 LIFF ID (2008269293-Nl2pZBpV)

### LINE Messaging API (官方帳號)
- 需建立 Messaging API Channel
- Webhook URL: https://asia-east2-platform-bc783.cloudfunctions.net/lineWebhook
- 支援關鍵字觸發 LIFF App

## 最近變更

### 2025-11-08 LIFF App 架構優化 + LINE Login 修復

**LIFF 架構重構**：
- ✅ **建立三個獨立 LIFF App**（LINE Developers Console）：
  - 奉香簽到：2008269293-nYBm3JmV
  - 排班系統：2008269293-N0wnqknr
  - 神務服務：2008269293-Nl2pZBpV
- ✅ **更新所有 LIFF 頁面使用專屬 LIFF ID**：
  - public/liff/checkin.html → 2008269293-nYBm3JmV
  - public/liff/schedule.html → 2008269293-N0wnqknr
  - public/liff/service.html → 2008269293-Nl2pZBpV（保持）
  - public/liff/index.html → 2008269293-Nl2pZBpV（通用入口）

**LINE Login 修復**：
- ✅ **修復 state 參數不匹配錯誤**（sessionStorage 跨域問題）：
  - 強制所有 OAuth 流程在正式域名 (https://go.guimashan.org.tw) 上執行
  - 新增 CANONICAL_ORIGIN 常數
  - 啟動登入前自動檢查並重定向到正式域名
- ✅ **修復 LIFF redirect_uri mismatch 錯誤**：
  - 每個 LIFF App 使用專屬的 LIFF ID
  - Endpoint URL 統一設定為 https://go.guimashan.org.tw

**架構優勢**：
- 🎯 更清楚的權限管理（每個功能獨立追蹤）
- 🎯 更好的錯誤追蹤（可定位到具體模組）
- 🎯 更靈活的功能擴展（可獨立設定 LIFF 參數）
- 🎯 解決跨域 sessionStorage 問題（統一在正式域名執行）

**檔案更新**：
- 前端：public/js/auth.js（LINE Login 域名檢查）
- LIFF：checkin.html, schedule.html（LIFF ID 更新）
- 文件：replit.md（LIFF ID 映射表）

**部署狀態**：
- ✅ Frontend workflow 已重啟並正常運行
- ⏳ 用戶需更新 LINE Developers Console 設定

---

### 2025-11-05 完成全站手機版響應式設計優化

**重大優化**：
- ✅ **統一五個表單的日期格式為三層顯示**（ZY、DD、ND、LD、QJ）
  - 生辰/忌日字段統一格式：國曆（民國年輸入）→ 西曆（自動顯示）→ 農曆（干支年、中文月日）
  - 年份輸入框：70px，支持民國年輸入（3位數）
  - 月/日輸入框：50px
  - 日曆按鈕：🗓️ 統一樣式，40px
  - 完美對齊，所有文字置中

**全站響應式設計**：
- ✅ **service.css 添加完整手機版優化**（@media max-width: 480px）
  - 整體佈局：縮小內距、間距、字體
  - 日期輸入框：年 70px→50px，月/日 50px→40px，間距 5px→3px
  - 日曆按鈕：40px→36px
  - 西曆/農曆顯示：同步縮小，字體 1rem→0.85rem
  - 卡片、按鈕、表單元素全面優化
  - 適用於所有 10 個服務表單

**手機版優化原則**：
- 📱 保持觸控區域最小 36px（符合人體工學）
- 📱 總寬度約 291px，完美適配 iPhone SE (320px)
- 📱 無橫向滾動
- 📱 所有功能正常工作
- 📱 三層日期顯示完整保留

**待完成工作**：
- ⚠️ checkin.css 需添加手機版優化
- ⚠️ checkin/manage/styles/manage.css 需添加手機版優化
- ⚠️ service/manage/styles/manage.css 需添加手機版優化

**影響範圍**：
- CSS：public/service/styles/service.css（新增 192 行手機版樣式）
- JavaScript：DD.js、ND.js、LD.js、QJ.js、ZY.js（日期處理邏輯更新）
- 設計規範：replit.md（新增響應式設計規範章節）

**部署狀態**：
- ⏳ 待推送 GitHub → Vercel 自動部署

---

### 2025-11-04 完成 Phase 3 全部 10 個服務表單

**重大里程碑**：
- 🎉 **Phase 3 服務模組完整上線**：共 10 個神務服務表單全部完成
- ✅ **建立兩個通用模板架構**，可快速複製開發新表單
- ✅ 後端自動支援：訂單編號生成、雙集合架構、資料驗證

**兩個通用模板架構**：

📋 **模板 A：標準多人報名模板**（ND.html / ND.js 為範本）
- 適用表單：DD, ND, LD, QJ, PS, BG, XY（7個）
- 架構特色：
  - 個人/多人報名切換
  - 報名者卡片列表（可折疊、可移除）
  - 服務項目選擇（燈種、斗別、捐款項目等）
  - 即時總金額計算
  - 信用卡付款資訊
  - 感謝狀領取選項
- 可選功能：
  - 農曆轉換（DD, ND, LD, QJ）
  - 生肖/時辰欄位（DD, ND）
  - 事業資訊欄位（ND, LD）

📋 **模板 B：類別卡片模板**（ZY.html / ZY.js 為範本）
- 適用表單：ZY（中元法會）
- 架構特色：
  - 6 種超拔類別區塊
  - 每種類別可新增多筆資料
  - 類別專屬欄位設計
  - 統一價格計算（$1,500/位）
  - 部分類別支援農曆轉換
- 適用情境：需要多種「類別」而非多個「人」的服務

📋 **模板 C：分期付款模板**（FTP.html / FTP.js 為範本）
- 適用表單：FTP, FTY（福田會系列）
- 架構特色：
  - 個人報名（無多人模式）
  - 繳款方式選擇（季繳/半年繳/年繳）
  - 首期金額即時顯示
  - 感謝狀抬頭選擇（同功德主/同持卡人/自訂）
  - 年齡驗證（FTY 專用）
- 適用情境：長期護持、分期捐款

**今日完成表單（8 個）**：

1. **LD - 禮斗法會**（使用模板 A）
   - 服務項目：元辰禮斗、太歲禮斗、光明禮斗、財神禮斗、文昌禮斗、事業禮斗
   - 價格：$1,500/斗
   - 支援農曆轉換、事業資訊欄位

2. **QJ - 秋祭法會**（使用模板 A - 簡化版）
   - 統一價格：$300/人
   - 支援個人+多人報名
   - 無需生辰資料（簡化版）

3. **PS - 普施法會**（使用模板 A - 簡化版）
   - 隨喜功德：自訂金額
   - 支援個人+多人報名
   - 無需生辰資料（簡化版）

4. **BG - 建宮廟款**（使用模板 A - 簡化版）
   - 隨喜捐款：自訂金額
   - 支援個人+多人報名
   - 無需生辰資料（簡化版）

5. **XY - 添香油**（使用模板 A - 簡化版）
   - 服務項目：金紙（$100/份）、隨喜功德
   - 支援個人+多人報名模式
   - 即時金額計算
   - 感謝狀寄發選項

6. **ZY - 中元法會**（使用模板 B - 類別卡片）
   - 超拔類別：歷代祖先、祖先、冤親債主、嬰靈、地基主、其他
   - 每種類別可新增多筆（非傳統多人報名）
   - 統一價格：$1,500/位
   - 部分類別支援農曆轉換（祖先、其他）
   - 6 種超拔類別獨立卡片設計

7. **FTP - 福田會**（使用模板 C - 分期付款）
   - 護持方案：三年期總額 NT$ 30,000
   - 繳款方式：季繳（12期×$2,500）/ 半年繳（6期×$5,000）/ 年繳（3期×$10,000）
   - 感謝狀抬頭選擇：同功德主名/同持卡人/自訂
   - 首期扣款金額即時顯示
   - 個人報名（無多人模式）

8. **FTY - 福田少年會**（使用模板 C - 分期付款）
   - 入會資格：30 歲以下青年
   - 護持方案：五年期總額 NT$ 30,000
   - 繳款方式：季繳（20期×$1,500）/ 半年繳（10期×$3,000）/ 年繳（5期×$6,000）
   - 年齡自動驗證（30歲以下限制）
   - 感謝狀抬頭選擇
   - 個人報名（無多人模式）

**完整服務列表（11 個神務服務）**：

| 代碼 | 服務名稱 | SERVICE_TYPE | 訂單編號格式 | 狀態 |
|------|---------|--------------|--------------|------|
| DD | 線上點燈 | `"dd"` | DD-YYYYMMDD-XXXX | ✅ |
| ND | 年斗法會 | `"nd"` | ND-YYYYMMDD-XXXX | ✅ |
| LD | 禮斗法會 | `"ld"` | LD-YYYYMMDD-XXXX | ✅ |
| QJ | 秋祭法會 | `"qj"` | QJ-YYYYMMDD-XXXX | ✅ |
| PS | 普施法會 | `"ps"` | PS-YYYYMMDD-XXXX | ✅ |
| BG | 建宮廟款 | `"bg"` | BG-YYYYMMDD-XXXX | ✅ |
| XY | 添香油 | `"xy"` | XY-YYYYMMDD-XXXX | ✅ |
| ZY | 中元法會 | `"zy"` | ZY-YYYYMMDD-XXXX | ✅ |
| FTP | 福田會 個人 | `"ftp"` | FTP-YYYYMMDD-XXXX | ✅ |
| FTY | 福田少年會 個人 | `"fty"` | FTY-YYYYMMDD-XXXX | ✅ |
| FTC | 福田會 企業團體 | `"ftc"` | FTC-YYYYMMDD-XXXX | ✅ |

**命名規範說明**：
- 🔹 **SERVICE_TYPE**（內部識別碼）：統一使用**2-3個字母的簡短小寫**（如 `"dd"`, `"ftp"`）
- 🔹 **訂單編號前綴**（用戶可見）：使用**大寫**（如 `DD-`, `FTP-`）
- 🔹 後端 Cloud Functions 透過 typeCodeMap 自動轉換：小寫 key → 大寫前綴
- 🔹 **統一規範**：避免使用中文拼音全拼（如 `lidou`、`xiangyou`），改用簡短代碼（如 `ld`、`xy`）

**技術亮點**：
- ✅ **建立三種可複用模板**：標準多人報名、類別卡片、分期付款
- ✅ 中元法會：創新的 6 種類別卡片架構（模板 B 首創）
- ✅ 福田會系列：完整的分期付款方案設計（模板 C）
- ✅ 福田少年會：年齡驗證功能（30 歲以下限制）
- ✅ 共用樣式：新增繳款方案選項樣式、類別區塊樣式、農曆顯示樣式

**模板複用策略**：
- 📋 新增簡單服務（如：祈福法會）→ 複製模板 A（ND.js），修改價格和項目
- 📋 新增類別型服務（如：祭祀法會）→ 複製模板 B（ZY.js），修改類別和欄位
- 📋 新增分期服務（如：長期護持）→ 複製模板 C（FTP.js），修改期數和金額

**檔案更新**：
- 前端 HTML：XY.html, ZY.html, FTP.html, FTY.html
- JavaScript：XY.js, ZY.js, FTP.js, FTY.js
- 樣式：service.css（新增類別區塊樣式、繳款方案樣式）

**後端支援**：
- ✅ **訂單代碼映射**（Cloud Functions typeCodeMap）：
  - `'dd': 'DD'`, `'nd': 'ND'`, `'ld': 'LD'`, `'qj': 'QJ'`
  - `'ps': 'PS'`, `'bg': 'BG'`, `'xy': 'XY'`, `'zy': 'ZY'`
  - `'ftp': 'FTP'`, `'fty': 'FTY'`, `'ftc': 'FTC'`
- ✅ submitRegistration 函數自動支援所有服務類型
- ✅ 雙集合架構：registrations + temp_payment_secrets
- ✅ 訂單編號自動生成（帶流水號）

**正式環境網址**：
```
https://go.guimashan.org.tw/service/XY.html
https://go.guimashan.org.tw/service/ZY.html
https://go.guimashan.org.tw/service/FTP.html
https://go.guimashan.org.tw/service/FTY.html
```

**部署狀態**：
- ⏳ 待推送 GitHub 並透過 Vercel 部署到正式環境

---

### 2025-11-04 雙向同步功能實作 + Bug 修復

**新增功能**：
- ✅ 實作聯絡人姓名 ↔ 第一個報名者姓名雙向同步
  - DD.js（線上點燈）：完整雙向同步
  - ND.js（年斗法會）：完整雙向同步
  - 單人/多人模式都支援
  - 即時更新，無需重新整理

**Bug 修復**：
- ✅ 修正多人報名時，第二個報名者顯示 "null" 的問題
  - DD.js：新增報名人時傳入空字串而非 null
  - ND.js：新增報名人時傳入空字串而非 null
  - 增加防護：確保 prefillName 永遠不為 null

**程式碼清理**：
- ✅ functions/index.js：刪除 4 個無用的 V2 exports
  - `submitRegistrationV2` → 已刪除（保留 `submitRegistration`）
  - `getRegistrationsV2` → 已刪除（保留 `getRegistrations`）
  - `getRegistrationDetailV2` → 已刪除（保留 `getRegistrationDetail`）
  - `confirmPaymentV2` → 已刪除（保留 `confirmPayment`）
- ✅ functions/src/service/index.js：移除舊命名向下兼容
  - 刪除 `'lightup': 'DD'`（已無用）
  - 刪除 `'niandou': 'ND'`（已無用）
  - 只保留新命名：`'dd': 'DD'` 和 `'nd': 'ND'`

**影響範圍**：
- 前端：public/service/js/DD.js、public/service/js/ND.js
- 後端：functions/index.js、functions/src/service/index.js

**部署狀態**：
- ✅ 前端已推送 GitHub → Vercel 自動部署
- ⏳ 後端待部署到 service-b9d4a 專案

**系統清理狀態**：
- ✅ 舊檔案完全清空（無 lightup.html/niandou.html）
- ✅ 舊命名完全移除（無 'lightup'/'niandou' 資料庫代碼）
- ✅ 測試檔案已刪除（checkin-old.html, test-token.html, test.html）
- ✅ Service 模組只有 10 個檔案，結構乾淨
- ⚠️ 建議部署後手動清空 Firestore 測試訂單（registrations、temp_payment_secrets）

**新表單開發標準流程**：

開發新的神務服務表單（例如：禮斗法會、中元法會）時，遵循以下流程：

1. **複製樣板檔案**
   ```bash
   # 以禮斗法會（LD）為例
   cp public/service/ND.html public/service/LD.html
   cp public/service/js/ND.js public/service/js/LD.js
   ```

2. **修改 JS 檔案常數**
   ```javascript
   // LD.js
   const SERVICE_TYPE = "lidou";  // 使用預留的服務代碼
   const DOU_PRICE = 36000;       // 修改為該服務的價格
   ```

3. **修改 HTML 檔案**
   ```html
   <!-- LD.html -->
   <script src="js/LD.js"></script>
   <h1>禮斗法會</h1>
   <!-- 修改表單欄位... -->
   ```

4. **完成！** 後端自動支援
   - ✅ 訂單編號自動生成：`LD-YYYYMMDD-XXXX`
   - ✅ 資料庫 serviceType：`"lidou"`
   - ✅ 後台 orders.js 自動支援所有服務類型

**預留的服務代碼**（functions/src/service/index.js）：
```javascript
'dd': 'DD',               // 線上點燈 ✅ 已實作
'nd': 'ND',               // 年斗法會 ✅ 已實作
'lidou': 'LD',            // 禮斗法會 ⏳ 可開發
'zhongyuan': 'ZY',        // 中元法會 ⏳ 可開發
'pushi': 'PS',            // 普施法會 ⏳ 可開發
'futian': 'FT',           // 福田會 ⏳ 可開發
'futian_youth': 'FTY',    // 福田少年會 ⏳ 可開發
'xiangyou': 'XY',         // 添香油 ⏳ 可開發
'build_temple': 'BG'      // 建宮廟款 ⏳ 可開發
```

**檔案命名規則**：
- HTML：`{訂單代碼}.html`（例如：LD.html、ZY.html）
- JavaScript：`{訂單代碼}.js`（例如：LD.js、ZY.js）
- 資料庫：serviceType 使用小寫英文（例如："lidou", "zhongyuan"）
- 訂單編號：使用大寫代碼（例如："LD-20251104-0001"）

---

### 2025-11-04 API 重構：移除 V1/V2 命名混淆

**重構目的**：
統一 API 命名，移除不必要的版本後綴，提升可維護性。

**清理工作**：
- ✅ 刪除無用的 V1 API（3 個）：
  - `getRegistrations` (onCall) - 前端從未使用
  - `getRegistrationDetail` (onCall) - 前端從未使用
  - `confirmPayment` (onCall) - 前端從未使用
- ✅ 重命名 V2 API 去掉後綴（4 個）：
  - `submitRegistrationV2` → `submitRegistration`
  - `getRegistrationsV2` → `getRegistrations`
  - `getRegistrationDetailV2` → `getRegistrationDetail`
  - `confirmPaymentV2` → `confirmPayment`

**最終 API 清單**：
```
Service 模組 API（4 個）：
1. submitRegistration      - 接收神務報名
2. getRegistrations        - 查詢訂單列表（管理後台）
3. getRegistrationDetail   - 查詢訂單詳情（含信用卡）
4. confirmPayment          - 確認收款並刪除機密
```

**前端更新**：
- ✅ DD.js：更新 API 呼叫 + 修正認證方式
- ✅ ND.js：更新 API 呼叫 + 修正認證方式 + 修正 API URL
- ✅ orders.js：更新所有 API 呼叫

**程式碼改善**：
- ✅ ND.js 認證方式統一：`platformAuth.currentUser.getIdToken()`
- ✅ ND.js API URL 修正：使用正確的 Cloud Functions URL
- ✅ 移除約 150 行冗余代碼

**測試檔案清理**：
- ✅ 刪除 `public/liff/checkin-old.html`
- ✅ 刪除 `public/liff/test-token.html`
- ✅ 刪除 `public/liff/test.html`

---

### 2025-11-04 統一檔案命名規則：全面改用訂單編號命名

**重大架構調整**：
為了方便長期維護和管理，將所有神務服務相關檔案改用訂單編號（ND/DD）命名，實現**完全統一**的命名規則。

**檔案重新命名**：
- ✅ HTML 檔案：
  - `niandou.html` → `ND.html` （年斗法會）
  - `lightup.html` → `DD.html` （線上點燈）
- ✅ JavaScript 檔案：
  - `niandou.js` → `ND.js`
  - `lightup.js` → `DD.js`
- ✅ CSS 檔案：
  - `lightup.css` → `service.css` （兩個服務共用）

**資料庫欄位統一**：
- ✅ `serviceType: "niandou"` → `serviceType: "nd"`
- ✅ `serviceType: "lightup"` → `serviceType: "dd"`

**完整對應關係**：
```
年斗法會 (ND):
  - 前端頁面: /service/ND.html
  - JavaScript: /service/js/ND.js
  - 訂單編號: ND-YYYYMMDD-XXXX
  - 資料庫: serviceType: "nd"

線上點燈 (DD):
  - 前端頁面: /service/DD.html
  - JavaScript: /service/js/DD.js
  - 訂單編號: DD-YYYYMMDD-XXXX
  - 資料庫: serviceType: "dd"

共用樣式: /service/styles/service.css
```

**後台管理更新**：
- ✅ 訂單篩選器新增「年斗法會」選項
- ✅ 更新 serviceType 判斷邏輯（'nd' / 'dd'）
- ✅ 服務類型名稱對應表更新

**日期格式優化**：
- ✅ 國曆格式：`2012年06月11日`（加上年月日單位）
- ✅ 農曆格式：`壬辰年 闰四月廿二日`（加上日字）

**影響範圍**：
- 前端：public/service/ND.html、DD.html
- JavaScript：public/service/js/ND.js、DD.js
- 樣式：public/service/styles/service.css
- 後台：public/service/manage/js/orders.js、orders.html

**重要提醒**：
- ⚠️ 舊訂單（serviceType 為 "niandou" 或 "lightup"）將無法被新系統讀取
- ✅ 測試訂單已全部清除，從全新開始
- ✅ counters 集合已重置，訂單編號從 0001 開始

---

### 2025-11-04 後台管理新增農曆顯示功能 + 本地化農曆庫

**新增功能**：
- ✅ 整合 lunar-javascript 農曆轉換庫（本地化版本）
- ✅ 後台訂單詳情同時顯示國曆和農曆生辰
- ✅ 支援舊資料格式（bazi 字串）和新資料格式（bazi 物件）
- ✅ 農曆日期使用紫色標示，易於區分

**農曆格式**：
- 格式範例：甲辰年 閏二月初八
- 使用天干地支紀年（甲子、乙丑...）
- 包含閏月標示
- 使用傳統月份名稱（正、二、三...冬、臘）
- 使用傳統日期名稱（初一、初二...廿一...三十）

**技術實作**（2025-11-04 更新）：
- ✅ **本地化方案**：lunar-javascript@1.7.3 下載到專案中（426KB）
- ✅ **本地路徑**：public/lib/lunar.js
- ✅ **真正的動態載入**：
  - 頁面載入時：**完全不載入** lunar.js
  - LINE 登入成功：載入訂單列表（**仍不載入** lunar.js）
  - 第一次查看訂單詳情：**才動態載入** lunar.js
  - 使用 JavaScript 動態創建 `<script>` 標籤載入
- ✅ **100% 可靠**：不依賴 CDN，農曆顯示永遠可用
- ✅ 轉換函數：convertToLunar() in orders.js
- ✅ 自動處理轉換錯誤，優雅降級
- ✅ 統一視覺排版：新舊資料皆使用灰色背景網格排版

**效能優化**：
- ⚡ **LINE 登錄速度完全不受影響**（頁面載入時不下載 426KB 的農曆庫）
- ⚡ **訂單列表載入快速**（不需要等待農曆庫）
- ⚡ **第一次查看訂單時才下載**（真正的按需載入）
- ⚡ **後續查看訂單不重複下載**（載入一次後重複使用）
- ⚡ 本地檔案速度快，無 CDN 依賴問題

**相關檔案**：
- public/lib/lunar.js - 農曆轉換庫（本地版本 1.7.3）
- public/service/manage/orders.html - 引入本地農曆庫
- public/service/manage/js/orders.js - 農曆轉換與顯示邏輯

### 2025-11-04 服務模組表單優化與資料收集改進

**表單欄位優化**：
- ✅ 標題更新：「斗主名單/點燈名單」→「報名名單」
- ✅ 性別欄位：文字輸入 → 單選按鈕（男/女）
- ✅ 生肖欄位：文字輸入 → 下拉選單（12生肖）
- ✅ 時辰欄位：文字輸入 → 下拉選單（吉時 + 12時辰）
- ✅ 生辰欄位：雙輸入模式（手動輸入 + 日期選擇器）
  - 手動輸入框：placeholder 顯示 "____年__月__日"
  - 日期選擇器：點擊圖示快速選擇
  - 雙向同步：任一方式輸入都會自動同步到另一欄位

**表單驗證增強**：
- ✅ 連絡電話必填驗證
- ✅ 感謝狀寄發時，通訊地址必填驗證
- ✅ 即時表單驗證回饋

**資料收集改進**：
- ✅ 年斗法會：正確收集性別單選按鈕值
- ✅ 線上點燈：新增性別、生肖、時辰欄位收集
- ✅ bazi 物件結構統一：`{gender, birthDate, shengxiao, time}`

**UI/UX 改進**：
- ✅ 按鈕文字：「新增一位斗主/點燈人」→「新增報名者」
- ✅ 卡片標題：「斗主本人」→「報名者本人」
- ✅ 欄位間距與排版優化

**影響範圍**：
- 年斗法會：public/service/ND.html、public/service/js/niandou.js
- 線上點燈：public/service/DD.html、public/service/js/lightup.js

**視覺優化**（2025-11-04）：
- ✅ 線上點燈：新增「燈種選擇」標題，增加時辰欄位與燈種之間的視覺間距
- ✅ 改善表單層次結構，讓基本資料與燈種選擇明確區分
- ✅ 生辰欄位改為三個獨立輸入框 + 日曆圖示按鈕
  - 年欄位：52px，4 位數（____）
  - 月欄位：34px，2 位數（__）
  - 日欄位：34px，2 位數（__）
  - 日曆圖示：金色按鈕（🗓️），點擊開啟日期選擇器
  - 日期選擇器：隱藏（opacity: 0），僅透過圖示按鈕觸發
  - 瀏覽器兼容性：支援 Chrome/Edge (showPicker) 和 Safari/iOS (click)
  - 單行布局設計（桌面和手機一致）
  - 雙向同步：手動輸入 ↔ 日期選擇器自動同步
  - 自動限制只能輸入數字
  - 緊湊型設計：完美解決手機螢幕溢出問題

### 2025-11-04 年斗法會服務模組實作

**新增功能**：
- ✅ 建立年斗法會報名頁面
  - `/service/niandou.html` - 年斗法會報名前端
  - `/service/js/niandou.js` - 年斗法會功能邏輯
  - 完全一致的 UI 設計（與點燈服務相同風格）
  - LINE 登入保護（未登入無法看到表單）

**斗主資料欄位**：
- 斗主姓名、性別、生辰（國曆）、生肖、時辰
- 單人/多人模式切換
- 自動同步報名姓名到斗主姓名（單人模式）

**年斗項目選擇**（可複選）：
- 闔家年斗
- 元辰年斗
- 紫微年斗
- 事業年斗（額外欄位：抬頭名稱、所在地址）

**定價與計算**：
- 每斗 NT$ 36,000
- 即時計算總斗數與總金額
- 自動格式化金額顯示

**訂單編號格式**：
- 格式：`ND-YYYYMMDD-XXXX`
- 範例：`ND-20251104-0001`
- 每日重置流水號

**後端整合**：
- 使用 V2 API：`submitRegistrationV2`
- 雙集合架構：`registrations` + `temp_payment_secrets`
- 自動驗證登入身份與資料完整性

**管理後台優化**：
- ✅ 修正年斗資料顯示（不再顯示 "[object Object]"）
- ✅ 正確解析 bazi 物件（性別、生日、生肖、時辰）
- ✅ 顯示年斗項目清單（闔家、元辰、紫微、事業）
- ✅ 顯示事業年斗額外資訊（抬頭、地址）
- ✅ 動態標題：點燈服務顯示「🕯️ 點燈名單」、年斗服務顯示「🎯 報名者名單」
- ✅ 統一標籤：年斗服務使用「報名者」、點燈服務使用「點燈人」

**正式環境網址**：
```
https://go.guimashan.org.tw/service/ND.html
```

**相關檔案**：
- 前端：public/service/ND.html、public/service/js/niandou.js
- 後端：functions/src/service/index.js（共用 submitRegistrationV2）
- 管理：public/service/manage/js/orders.js（新增年斗資料處理）

### 2025-11-03 線上點燈「登入保護」功能修復

**問題**：
- ❌ 未登入使用者可以直接看到完整報名表單
- ❌ 表單資料曝露給所有訪客
- ❌ 沒有登入提示畫面

**修正內容**：
- ✅ 新增登入提示畫面（預設顯示）
  - 金黃色漸層背景
  - 白色卡片設計
  - LINE 登入按鈕
- ✅ 主要內容預設隱藏（display: none）
  - 只有登入後才顯示
  - 包含完整報名表單
- ✅ JavaScript 認證檢查
  - 使用 `onAuthStateChanged` 檢查登入狀態
  - 登入成功：隱藏登入畫面，顯示表單
  - 未登入：保持顯示登入畫面
- ✅ LINE 登入整合
  - 使用與 auth.js 相同的登入邏輯
  - CSRF 防護（random state）
  - 記住返回頁面

**安全改善**：
- 🔒 未登入使用者無法看到任何表單內容
- 🔒 表單資料受到登入保護
- 🔒 防止未授權訪問

**相關檔案**：
- 前端：public/service/DD.html、js/lightup.js
- 樣式：public/service/styles/lightup.css

### 2025-11-03 線上點燈「即時同步」功能修復

**問題**：
- ❌ 「報名姓名」和「點燈人姓名」不同步
- ❌ 載入時「點燈人姓名」顯示空白
- ❌ 手動修改「報名姓名」時，下方不會自動更新

**修正內容**：
- ✅ 新增 `syncNameToSingleCard()` 函數
  - 監聽「報名姓名」的 input 事件
  - 即時同步到第一張卡片的「點燈人姓名」
  - 只在單人模式下生效（多人模式不影響）
- ✅ 修正載入順序
  - 在 `onAuthStateChanged` 確認登入後才初始化卡片
  - 確保 `userData` 已載入才填入預設姓名
- ✅ 加強表單驗證
  - 驗證所有必填欄位
  - 檢查信用卡格式（16 碼卡號、MM/YY 有效期限、3 碼 CVV）
  - 自動檢查卡片是否過期

**使用體驗改善**：
- 🎯 單人模式：修改報名姓名時，點燈人姓名會**即時同步**
- 🎯 多人模式：每個人的姓名獨立填寫，互不影響
- 🎯 自動格式化：卡號自動加空格、有效期限自動加斜線

**相關檔案**：
- 前端：public/service/js/lightup.js

### 2025-11-03 神務服務管理後台實作（訂單管理系統）

**功能概述**:
- ✅ 建立 service/manage/ 後台架構
  - /service/manage/index.html - 後台入口（角色檢查、導航選單）
  - /service/manage/orders.html - 訂單管理頁面
  - /service/manage/js/orders.js - 訂單管理邏輯
  - /service/manage/styles/manage.css - 後台樣式

**訂單管理功能**:
- ✅ 訂單列表顯示
  - 顯示最近 100 筆訂單
  - 狀態標籤（pending, paid_offline）
  - 金額顯示與時間戳記
- ✅ 訂單詳情查看
  - Modal 彈窗顯示完整訂單資料
  - **信用卡資訊顯示**（卡號、持卡人、有效期限、CVV）
  - 報名人資訊（姓名、電話、地址）
  - 燈座選擇與備註
- ✅ 手動確認收款
  - 一鍵確認付款狀態
  - 自動刪除機密信用卡資料
  - 記錄確認人員與時間

**後端 API (已部署到 service-b9d4a)**:
- ✅ `getRegistrations` - 查詢訂單列表
- ✅ `getRegistrationDetail` - 查看訂單詳情（含信用卡）
- ✅ `confirmPayment` - 確認收款並刪除機密資料

**三層安全架構**:
1. **前端權限檢查** (auth-guard.js)
   - 檢查使用者是否登入
   - 驗證是否具有 poweruser_service、admin_service 或 superadmin 角色
   - 未授權使用者無法存取管理頁面
   
2. **後端伺服器端驗證** (checkServiceRole 函數)
   - 跨專案查詢：從 platform-bc783/users 讀取使用者角色
   - 使用 Admin SDK 確保資料真實性
   - 所有管理 API 都必須通過角色檢查才能執行
   
3. **Firestore Security Rules 完全鎖定**
   - 所有集合禁止直接讀寫（allow read, write: if false）
   - 強制所有操作必須通過 Cloud Functions
   - 防止使用者繞過 API 直接存取資料

**安全考量與未來改進**:
- ⚠️ 目前架構：使用跨專案 Firestore 查詢來驗證角色
  - 優點：集中管理角色（platform-bc783/users）
  - 依賴：platform 專案的 updateUserRole 必須有正確的權限控制
- 🎯 建議未來升級為 Custom Claims
  - 在 Firebase Auth Token 中直接包含角色資訊
  - 更安全，無需額外查詢
  - 需要修改 platform 專案的登入流程

**相關檔案**:
- 前端：public/service/manage/index.html、orders.html、js/orders.js
- 後端：functions/src/service/index.js (checkServiceRole + 管理 API)
- 共用：public/js/auth-guard.js

### 2025-11-03 線上點燈信用卡收集功能實作（過渡方案）

⚠️ **重要安全警告**: 此方案為過渡期解決方案，複製舊系統流程以便快速上線。

**架構決策**:
- ✅ 實作雙集合設計（資料分離）
  - `registrations` 集合：儲存報名訂單資料（安全資料）
  - `temp_payment_secrets` 集合：儲存信用卡資訊（機密資料）
  - 兩集合透過 `paymentSecretId` 和 `registrationId` 互相關聯
- ✅ 前端信用卡欄位與驗證
  - 持卡人姓名、16 碼卡號、有效期限（MM/YY）、CVV
  - 自動格式化：卡號每 4 碼加空格、有效期限自動加斜線
  - 完整驗證：卡號長度、CVV 長度、過期檢查
- ✅ 後端 API (submitRegistration)
  - 使用 Callable Function 自動驗證登入
  - 三層驗證：登入檢查、資料完整性、使用者 ID 一致性
  - 使用 batch 同時寫入兩集合確保資料一致性
- ✅ 安全措施
  - Firestore Security Rules 完全鎖定（所有直接存取禁止）
  - 只有 Cloud Functions 可存取資料
  - HTTPS 傳輸（Vercel 自動）

**已知風險**:
- ⚠️ 儲存完整信用卡資料（包括 CVV）違反 PCI-DSS 規範
- ⚠️ 使用者已明確確認風險並接受責任
- ⚠️ 此為複製舊系統流程的過渡方案

**後續計劃**:
- 🎯 待 LINE Pay 申請通過後，將升級為合規的自動化金流
- 🎯 屆時將移除信用卡收集功能，改用安全的重定向支付

**相關檔案**:
- 前端：public/service/DD.html、public/service/js/lightup.js
- 後端：functions/src/service/index.js
- 規則：firestore.rules

### 2025-11-03 文件整理 + 線上點燈 UI 重新設計
- ✅ 整理根目錄文件結構
  - 建立 docs/部署指南/ - 收納部署相關文件
  - 建立 docs/設定指南/ - 收納 LINE/LIFF 設定文件
  - 建立 docs/開發文件/ - 收納技術開發文件
  - 建立 docs/README.md - 文件索引總覽
  - 根目錄保持乾淨：僅保留 README.md、replit.md、LICENSE
- ✅ 重新設計線上點燈頁面 (public/service/lightup.html)
  - 採用網站統一金黃色主題
  - Header 導航欄（與其他頁面一致）
  - 卡片式設計佈局
  - 改進的表單樣式（大輸入框、金色焦點效果）
  - 美化的單選按鈕（卡片樣式）
  - 浮動總結欄位（金黃色漸層背景）
  - 完整響應式設計（手機版友善）
  - 統一的 CSS 變數使用（--primary-gold, --primary-gold-dark）

### 2025-11-01 LIFF 整合（LINE Front-end Framework）
- ✅ 建立 LIFF 專用頁面
  - /liff/checkin.html - 奉香簽到 LIFF App
  - /liff/service.html - 神務服務 LIFF App
  - /liff/schedule.html - 排班系統 LIFF App
- ✅ 建立 LIFF 初始化模組 (liff-init.js)
  - LIFF SDK 整合
  - 自動 LINE 用戶認證
  - Firebase Authentication 整合
  - 支援發送訊息到聊天室
- ✅ 建立 LINE Messaging API Webhook
  - functions/src/messaging/index.js
  - lineWebhook Function 已部署 (asia-east2)
  - Webhook URL: https://asia-east2-platform-bc783.cloudfunctions.net/lineWebhook
  - 支援關鍵字回覆 LIFF URL
  - 關鍵字：奉香簽到、神務服務、排班系統、幫助
- ✅ 配置完成
  - LIFF ID: 2008269293-Nl2pZBpV（已更新到代碼）
  - Messaging API Channel ID: 2008221557
  - Firebase Secrets 已設定（LINE_MESSAGING_CHANNEL_SECRET, LINE_MESSAGING_ACCESS_TOKEN）
- ✅ 完整設定文件
  - LIFF_SETUP_GUIDE.md - 詳細設定步驟
  - LINE_配置清單.md - 簡易配置清單
  - 包含測試和疑難排解指南

### 2025-11-01 完整平台架構重構（第一、二階段樣本）
- ✅ 重構統一 LINE Login 入口頁面 (/index.html)
  - 登入後顯示模組選單（根據角色控制可見性）
  - 顯示使用者資訊和頭像
  - 支援四個模組：奉香簽到、神務服務、排班系統、系統管理
- ✅ 建立後台管理總覽 (/manage/index.html)
  - 根據管理員角色顯示可管理的模組
  - 提供快速導航至各模組管理頁面
- ✅ 建立共用認證模組 (auth-guard.js)
  - 提供 checkAuth 函數進行統一認證檢查
  - 支援角色權限驗證
  - 可複製至其他模組使用
- ✅ 重構奉香簽到模組
  - 前端 (/checkin/index.html) 整合 auth-guard
  - 後台入口 (/checkin/manage/index.html) 使用統一認證
  - 後台包含：儀表板、巡邏點管理、使用者管理
- ✅ 建立模組樣板
  - Service 模組前端 (/service/index.html)
  - Schedule 模組前端 (/schedule/index.html)
  - 為第三、四階段預留標準架構
- ✅ 優化共用樣式 (common.css)
  - 新增管理頁面樣式
  - 新增功能卡片樣式
  - 支援響應式設計

### 2025-10-31 LINE Login Web API 整合（方案 B）
- ✅ 實作安全的 LINE Login Web API 整合
  - 使用 crypto.randomUUID() 生成 CSRF-resistant state
  - 在 callback 驗證 state 參數防止 CSRF 攻擊
  - State 使用後立即清除防止重複使用
- ✅ 更新 generateCustomToken Function
  - 支援 LINE 授權碼交換
  - 自動取得 LINE 使用者資料
  - 產生 Firebase Custom Token
  - 自動建立/更新 Firestore 使用者資料（roles 陣列）
- ✅ 新增 callback.html 處理 LINE 授權回調
- ✅ 更新 auth.js 使用 LINE Login Web API
- ✅ 移除 Firebase OAuthProvider 依賴
- ✅ 整合 LINE Secrets 管理（LINE_CHANNEL_ID, LINE_CHANNEL_SECRET）

### 2025-10-31 部署到生產環境
- ✅ 前端推送到 GitHub (guimashan/platfrom)
- ✅ Vercel 自動部署 (https://guimashan.vercel.app)
- ✅ Platform Functions 部署到 platform-bc783
  - generateCustomToken (LINE Login Web API 整合)
  - updateUserRole (角色管理)
- ✅ Check-in Functions 部署到 checkin-76c77
  - verifyCheckinDistance (GPS 簽到驗證)
- ⚠️ Check-in 專案遷移: checkin-29f7f → checkin-76c77
- ✅ Firebase 專案升級到 Blaze 方案
- ✅ 初始化專案,完成 Platform 和 Check-in 模組基礎功能

## 注意事項
- 嚴禁將 API Key 硬編碼在程式碼中
- 使用 Replit Secrets 管理所有敏感資訊
- Check-in 簽到資料啟用 TTL,保留 6 個月
- GPS 容許誤差預設 30 公尺,可由管理員自訂
