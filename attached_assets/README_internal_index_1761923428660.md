---
Document ID: DOC-INDEX
Version: 1.0-internal
Last Updated: 2025-10-30
Maintainer: guimashan-dev
Visibility: internal-only
---

# 🧭 龜馬山 goLine 平台 — 內部開發文件索引 (R 社用)

本文件為「龜馬山 goLine 平台」開發文件的導覽索引，  
用於協助 R 社內部開發、架構、測試與維運人員快速理解文件結構與使用順序。

---

## 📁 文件總覽

| 編號 | 文件名稱 | 用途簡述 |
|------|-----------|-----------|
| 01 | **SRS / PRD** (`01_SRS_PRD_internal.md`) | 定義系統需求、目標與模組功能範圍 |
| 02 | **SAD / HLD** (`02_SAD_HLD_internal.md`) | 系統架構設計、Firebase 專案對應、前端路徑規劃 |
| 03 | **UI / UX** (`03_UI_UX_internal.md`) | 前端畫面結構、角色導向導覽與互動邏輯 |
| 04 | **API 規格** (`04_API_SPEC_internal.md`) | Functions 端點、Request / Response、錯誤代碼定義 |
| 05 | **DDD / DB 設計** (`05_DDD_DB_DESIGN_internal.md`) | Firestore 結構、欄位設計、領域模型關聯 |
| 06 | **測試計畫** (`06_TEST_PLAN_internal.md`) | 測試流程、案例、驗收條件與報告格式 |
| 07 | **專案計畫 (PMP)** (`07_PMP_Project_Plan_internal.md`) | 專案時程、組織分工、風險與維運規劃 |

---

## 📌 使用順序建議

1. **從 01_SRS_PRD_internal.md 開始**  
   了解系統目標與模組範圍。

2. **閱讀 02_SAD_HLD_internal.md**  
   釐清整體架構、Firebase 專案與前端路徑。

3. **開發前端 / UI 時，對照 03_UI_UX_internal.md。**

4. **串接 API 或 Functions 前，詳閱 04_API_SPEC_internal.md。**

5. **設計或修改資料結構時，請對照 05_DDD_DB_DESIGN_internal.md。**

6. **測試與驗收請遵循 06_TEST_PLAN_internal.md。**

7. **專案經理與維運人員請依 07_PMP_Project_Plan_internal.md 作為管理依據。**

---

## ⚙️ 開發環境建議

- **Node.js 版本：** 20.x  
- **Firebase CLI：** 最新版  
- **部署地區：** `asia-east2`  
- **主要登入來源：** LINE OAuth (OIDC)  
- **主要專案：**
  - `platform-bc783` (登入 / 管理)
  - `checkin-76c77`
  - `service-b9d4a`
  - `schedule-48ff9`

---

## 🧩 文件維護規範

| 責任角色 | 任務 |
|-----------|------|
| 架構師 | 維護 SAD / API / DB 文件 |
| 前端開發 | 維護 UI / UX 文件 |
| 測試人員 | 維護 TEST 文件與報告 |
| 專案經理 | 維護 PMP 與進度表 |

> 🔴<span style="color:red">任何文件修改後，請更新版本號與最後更新日期。</span>

---

## 📞 聯絡與回報
- Slack 頻道：`#goline-dev`
- 維運支援：`dev-support@guimashan.org.tw`
- 文件維護負責人：**🔴<span style="color:red">填入負責人姓名</span>**

---

📘 **文件結語**  
本套文件為內部開發依據，請勿公開分享或上傳至公開儲存庫。  
任何外部展示或簡報請使用對外「公開可讀版（去敏化版本）」。