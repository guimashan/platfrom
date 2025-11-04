# 龜馬山 goLine 平台 - 開發專案

## 專案概述

「龜馬山 goLine 平台」是一個整合 LINE 登入的數位化管理系統,為龜馬山紫皇天乙真慶宮提供志工管理、奉香簽到、神服服務和排班系統。

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
│   │   ├── lightup.html   # 線上點燈頁面 ⭐ NEW
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

### 已安裝
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
使用同一個 LINE Login Channel (2008269293)
- 奉香簽到 LIFF App: /liff/checkin.html
- 神務服務 LIFF App: /liff/service.html
- 排班系統 LIFF App: /liff/schedule.html
- LIFF IDs: 需在 LINE Developers Console 建立後更新

### LINE Messaging API (官方帳號)
- 需建立 Messaging API Channel
- Webhook URL: https://asia-east2-platform-bc783.cloudfunctions.net/lineWebhook
- 支援關鍵字觸發 LIFF App

## 最近變更

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
- ✅ 動態標題：點燈服務顯示「🕯️ 點燈名單」、年斗服務顯示「🎯 斗主名單」

**正式環境網址**：
```
https://go.guimashan.org.tw/service/niandou.html
```

**相關檔案**：
- 前端：public/service/niandou.html、public/service/js/niandou.js
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
- 前端：public/service/lightup.html、js/lightup.js
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
- 前端：public/service/lightup.html、public/service/js/lightup.js
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
