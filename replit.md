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
│   ├── index.html         # 登入首頁
│   ├── checkin/           # 奉香簽到模組
│   ├── service/           # 神服服務模組 (待開發)
│   ├── schedule/          # 排班系統模組 (待開發)
│   ├── admin/             # 管理後台
│   ├── js/                # 共用 JavaScript
│   └── styles/            # 共用樣式
├── functions/             # Cloud Functions
│   ├── src/
│   │   ├── platform/      # Platform Functions
│   │   ├── checkin/       # Check-in Functions
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

### ✅ 已完成
1. **專案架構設定**
   - Node.js 20.x 環境
   - Firebase 配置
   - 前端目錄結構
   - Functions 基礎架構

2. **Platform 模組 (平台層)**
   - LINE OAuth 2.0 登入整合
   - Firebase Auth 認證
   - 角色導向系統
   - updateUserRole Function (支援 roles 陣列)

3. **Check-in 模組 (奉香簽到)**
   - GPS 簽到前端介面
   - 巡邏點選擇
   - verifyCheckinDistance Function
   - Haversine 距離計算
   - 簽到紀錄查詢

4. **管理後台**
   - 動態儀表板 (根據 roles 顯示模組)
   - 基本導航結構

### 🚧 進行中
- 巡邏點管理介面 (admin_checkin 可新增/編輯巡邏點)

### 📋 待開發
- Service 模組 (神服服務)
- Schedule 模組 (排班系統)
- 使用者角色管理介面
- Firebase Emulator 完整設定

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
- 網址: guimashan.vercel.app
- 用途: 整合測試

### Production (正式環境)
- 網址: https://go.guimashan.org.tw
- Vercel 團隊: guimashan's projects
- Vercel 專案 ID: prj_FwuUrTa2m4MaMocVnb2wAGB8CPyy

## LINE 登入資訊
- Channel ID: 2008269293
- Callback URL: https://go.guimashan.org.tw/__/auth/handler

## 最近變更

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
