---
Document ID: DOC-SRS-01
Version: 1.0-internal
Last Updated: 2025-10-30
Maintainer: guimashan-dev
Visibility: internal-only
---

# 龜馬山 goLine 平台 — 系統需求與產品規格書 (SRS / PRD)

## 1. 專案簡介
「龜馬山 goLine 平台」旨在建立一個整合 LINE 登入的數位化管理系統，
服務對象為龜馬山紫皇天乙真慶宮的工作人員、志工與信眾。

本系統包含四個主要模組：

| 模組 | Firebase 專案 ID | 功能概述 |
|------|------------------|-----------|
| 平台層（Platform） | **platform-bc783** | 提供 LINE 登入、角色管理、全域設定、公告及跨模組導流。 |
| 奉香簽到（Check-in） | **checkin-29f7f** | GPS 驗證簽到、巡邏點管理、簽到紀錄與查詢。 |
| 神服服務（Service） | **service-b9d4a** | 點燈、法會報名、香油錢登錄與報表。 |
| 排班系統（Schedule） | **schedule-48ff9** | 志願者排班、出勤統計、表單匯出。 |

---

## 2. 專案目標
- 透過 LINE 登入與 Firebase Auth 整合，達成統一帳號。
- 自動化奉香簽到流程，減少紙本登記。
- 提供線上法會報名、香油錢記錄查詢。
- 建立志願者排班管理與出勤統計。
- 支援多裝置操作（手機 / 平板 / 桌機）。
- 建立可視化報表與管理後台。

---

## 3. 系統範圍與邊界
- 不包含金流與收款功能（僅記錄香油錢）。
- 不支援 LINE 內建瀏覽器登入。
- 平台僅供內部人員與授權志工使用。

---

## 4. 功能需求摘要

| 編號   | 模組       | 功能描述                     | 主要使用者      |
| ---- | -------- | ------------------------ | ---------- |
| F-01 | Check-in | 使用者以 LINE 登入，透過 GPS 驗證簽到 | 志工 / 幹部    |
| F-02 | Service  | 使用者可線上報名法會、登錄香油錢         | 香客服務員 / 廟務 |
| F-03 | Schedule | 管理志工排班、查詢出勤              | 管理員 / 幹部   |
| F-04 | Platform | 管理角色、設定公告與導流             | superadmin |

---

## 5. 非功能需求
| 分類 | 說明 |
|------|------|
| 效能 | 單筆簽到回應時間 < 2 秒 |
| 相容性 | 支援 Chrome、Safari、Edge |
| 安全性 | Firebase Auth 驗證 + Firestore Rules |
| 維護性 | 雲端部署、可自動化 CI/CD |
| 可擴充性 | 模組獨立，可獨立部署 |

---

## 6. 主要環境設定
| 項目 | 值 |
|------|----|
| Firebase Auth 登入來源 | LINE OIDC |
| 資料庫 | Firestore |
| Functions 部署區域 | **asia-east2** |
| 前端託管 | Vercel / Firebase Hosting（備援） |

---

## 7. 開發與上線目標
| 時程 | 里程碑 | 備註 |
|------|----------|------|
| 2025/02 | 完成需求與設計文件 | SRS + SAD |
| 2025/04 | Check-in 模組上線 | MVP |
| 2025/07 | Service 模組上線 | |
| 2025/09 | Schedule 模組上線 | |
| 2025/10 | 整合測試 | |
| 2025/12 | 正式上線 | |

---

## 8. 欄位命名與代碼規範
- Firestore 文件 ID 一律使用隨機 UUID。
- 欄位命名：camelCase。
- 角色命名：
  - `user`
  - `poweruser`
  - `admin`
  - `superadmin`

---

## 9. 尚待補填項目
- 🔴<span style="color:red">填入 LINE Developers Channel ID / Secret</span>  
- 🔴<span style="color:red">填入各專案 API Key、App ID</span>  
- 🔴<span style="color:red">確認各模組 Firebase Hosting URL</span>