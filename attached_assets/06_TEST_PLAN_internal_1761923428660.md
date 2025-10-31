---
Document ID: DOC-TEST-06
Version: 1.0-internal
Last Updated: 2025-10-30
Maintainer: guimashan-dev
Visibility: internal-only
---

# 龜馬山 goLine 平台  
## 測試計畫 (Test Plan)

本文件描述「龜馬山 goLine 平台」之測試策略、測試項目、環境設定與驗收條件，確保系統在上線前具備穩定性與安全性。

---

## 1. 測試目標

- 驗證核心模組功能正常：登入、簽到、服務申請、排班。
- 確保跨模組資料一致性。
- 確保權限控制符合 Firestore Rules。
- 驗證 GPS、網路異常時的容錯行為。
- 確保跨裝置（手機、平板、桌機）操作一致性。

---

## 2. 測試範圍

| 模組 | 功能項目 | 測試對象 |
|------|-----------|-----------|
| Platform | LINE 登入、角色導向、公告 | 全員 |
| Check-in | GPS 簽到、巡邏點距離驗證 | 志工 / 幹部 |
| Service | 服務單建立、審核、查詢 | 香客服務員 / 廟務 / 管理員 |
| Schedule | 排班建立、出勤統計 | 管理員 / 志工 |
| Admin | 角色變更、公告管理 | admin / superadmin |

---

## 3. 測試分類

| 測試類型 | 說明 |
|-----------|------|
| **單元測試 (Unit Test)** | 測試 Cloud Functions 輸入 / 輸出正確性 |
| **整合測試 (Integration Test)** | 驗證前端與 Firestore / Functions 串接行為 |
| **相容性測試 (Compatibility Test)** | 不同瀏覽器與裝置顯示一致性 |
| **壓力測試 (Stress Test)** | 模擬多使用者同時簽到 / 查詢行為 |
| **安全測試 (Security Test)** | 驗證權限與 Rules 防護是否正確 |
| **驗收測試 (UAT)** | 依專案需求驗收標準手動檢測 |

---

## 4. 測試環境設定

| 環境 | 用途 | 範例專案 |
|------|------|-----------|
| **Local** | 開發測試 | Firebase Emulator (`firebase emulators:start`) |
| **Staging** | 整合測試 | 🔴<span style="color:red">填入 staging 專案與域名</span> |
| **Production** | 上線驗收 | `https://go.guimashan.org.tw` |

測試資料庫建議：
- Firestore 使用 `staging` 專案避免污染正式資料。
- 測試帳號請建立專屬測試用 LINE 帳號。

---

## 5. 測試工具與模擬器

| 工具 | 功能 |
|------|------|
| Firebase Emulator Suite | 模擬 Firestore / Functions / Auth |
| Chrome DevTools | 模擬不同裝置與網速 |
| Postman | 測試 API 呼叫與驗證 Token |
| Lighthouse | 檢測性能與 PWA 相容性 |
| Jest / Mocha | 單元測試框架（Functions） |

---

## 6. 主要測試案例

### 6.1 登入與導向測試
| 測試編號 | 測試項目 | 預期結果 |
|-----------|-----------|-----------|
| T-001 | 使用 LINE 登入後能建立 Firebase user | 登入成功，Firestore `users/{uid}` 建立 |
| T-002 | 不同角色登入導向正確頁面 | user → `/checkin/`；admin → `/admin/` |
| T-003 | 無權限訪問管理頁面 | 顯示「權限不足」提示 |

### 6.2 簽到模組 (checkin)
| 編號 | 測試項目 | 預期結果 |
|------|-----------|-----------|
| T-101 | GPS 在範圍內簽到 | 回傳 `{ok:true}` 並寫入 `checkins/` |
| T-102 | GPS 超出距離 | 回傳 `{ok:false, code:"1001_OUT_OF_RANGE"}` |
| T-103 | 網路中斷重試 | 顯示錯誤提示，重試後恢復 |

### 6.3 神服服務 (service)
| 編號 | 測試項目 | 預期結果 |
|------|-----------|-----------|
| T-201 | 建立服務單 | Firestore 新增 `services/` 文件 |
| T-202 | 審核服務單 | 狀態由 pending → approved |
| T-203 | 權限不足修改 | 回傳 `{ok:false, code:"2001_NOT_AUTHORIZED"}` |

### 6.4 排班系統 (schedule)
| 編號 | 測試項目 | 預期結果 |
|------|-----------|-----------|
| T-301 | 新增班表 | 新文件寫入 `schedules/` |
| T-302 | 出勤更新 | attendance 狀態改變 |
| T-303 | 非管理員修改班表 | 禁止操作，顯示錯誤 |

---

## 7. 錯誤處理與例外測試

| 狀況 | 預期行為 |
|------|------------|
| GPS 關閉 | 顯示提示「請開啟定位」 |
| LINE Token 過期 | 自動登出並重新導向登入頁 |
| Firestore 寫入失敗 | 顯示錯誤提示並重試 |
| Functions 超時 | 顯示「伺服器忙碌，請稍後再試」 |

---

## 8. 驗收條件 (UAT Criteria)

| 項目 | 驗收標準 |
|------|-----------|
| 登入成功率 | ≧ 98% |
| 簽到距離準確率 | ±10 公尺誤差 |
| 服務單處理正確率 | ≧ 95% |
| 系統穩定性 (連續 8 小時運行) | 無重大錯誤 |
| 權限控制正確性 | 所有未授權操作均被拒絕 |
| 相容性 | Chrome / Safari / Edge 皆正常運作 |

---

## 9. 測試報告與追蹤

測試完成後須產出：

- 測試報告（Test Report）  
  - 測試日期  
  - 測試人員  
  - 通過 / 失敗項目  
  - 錯誤截圖  

- 錯誤追蹤表（Bug Tracking）  
  - 編號、模組、嚴重性、狀態（Open / Fixed / Verified）
🔴<span style="color:red">建議使用 Google Sheets 或 Jira 建立測試追蹤表</span>

---

## 10. 尚待補填項目
- 🔴<span style="color:red">Staging 專案 ID 與測試網址</span>  
- 🔴<span style="color:red">是否需自動化測試（CI 流程中執行 Jest）</span>  
- 🔴<span style="color:red">最終驗收負責人名單</span>