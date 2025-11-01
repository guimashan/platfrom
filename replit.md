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
│   │   └── index.html     # 服務前端（樣板）
│   ├── schedule/          # 排班系統模組（第四階段）
│   │   └── index.html     # 排班前端（樣板）
│   ├── js/                # 共用 JavaScript
│   │   ├── firebase-init.js    # Firebase 初始化
│   │   ├── auth.js            # LINE Login 處理
│   │   └── auth-guard.js      # 共用認證模組 ⭐
│   └── styles/            # 共用樣式
│       └── common.css     # 通用樣式
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
  - lineWebhook Function (asia-east2)
  - 支援關鍵字回覆 LIFF URL
  - 關鍵字：奉香簽到、神務服務、排班系統、幫助
- ✅ 完整設定文件
  - LIFF_SETUP_GUIDE.md - 詳細設定步驟
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
