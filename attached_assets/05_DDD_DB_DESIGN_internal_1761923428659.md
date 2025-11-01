---
Document ID: DOC-DDD-05
Version: 1.0-internal
Last Updated: 2025-10-30
Maintainer: guimashan-dev
Visibility: internal-only
---

# 龜馬山 goLine 平台  
## 資料模型與領域設計 (DDD / DB Design)

本文件描述 Firestore 資料模型、集合結構、欄位命名規範及各模組領域間關聯。  

---

## 1. 整體資料庫設計理念

- 採用 **Firebase Firestore** 文件型結構。
- 各模組（checkin、service、schedule）擁有獨立的專案與集合。
- Platform 專案負責共用使用者資料與設定。
- 遵循 **DDD（Domain-Driven Design）** 原則：
  - 各領域模組相互獨立。
  - 共用資料透過 `platform-bc783` 提供。

---

## 2. 主要集合一覽表

| 模組 | 集合名稱 | 說明 | 所屬專案 |
|------|-----------|------|-----------|
| 使用者 | `users` | 儲存 LINE 登入者資訊、角色與狀態 | **platform-bc783** |
| 奉香簽到 | `checkins` | 使用者簽到紀錄 | **checkin-76c77** |
| 巡邏點 | `patrols` | 奉香地點座標 | **checkin-76c77** |
| 神服服務 | `services` | 點燈 / 法會報名資料 | **service-b9d4a** |
| 排班 | `schedules` | 志工班表與出勤狀況 | **schedule-48ff9** |
| 系統公告 | `globalConfig` | 全域設定與公告 | **platform-bc783** |

---

## 3. 集合與文件結構

### 3.1 users（平台層）
**Firestore 路徑：** `users/{uid}`  
**所屬專案：** `platform-bc783`

| 欄位 | 型別 | 說明 |
|------|------|------|
| `displayName` | string | 使用者暱稱 |
| `lineUserId` | string | LINE 使用者 ID |
| `role` | string | user / poweruser / admin / superadmin |
| `email` | string | 🔴<span style="color:red">若啟用 Email 登入則必填</span> |
| `lastLogin` | timestamp | 最後登入時間 |
| `createdAt` | timestamp | 帳號建立時間 |
| `active` | boolean | 是否啟用 |

---

### 3.2 checkins（奉香簽到）
**Firestore 路徑：** `checkins/{checkinId}`  
**所屬專案：** `checkin-76c77`

| 欄位 | 型別 | 說明 |
|------|------|------|
| `userId` | string | 對應 `users/{uid}` |
| `patrolId` | string | 對應 `patrols/{id}` |
| `lat` | number | 緯度 |
| `lng` | number | 經度 |
| `distance` | number | 與巡邏點距離（公尺） |
| `timestamp` | timestamp | 簽到時間 |
| `mode` | string | normal / test |
| `device` | string | 使用裝置資訊（可選） |

---

### 3.3 patrols（巡邏點）
**Firestore 路徑：** `patrols/{patrolId}`  
**所屬專案：** `checkin-76c77`

| 欄位 | 型別 | 說明 |
|------|------|------|
| `name` | string | 巡邏點名稱 |
| `lat` | number | 緯度 |
| `lng` | number | 經度 |
| `tolerance` | number | 容許距離（預設 30 公尺） |
| `createdAt` | timestamp | 建立時間 |

---

### 3.4 services（神服服務）
**Firestore 路徑：** `services/{serviceId}`  
**所屬專案：** `service-b9d4a`

| 欄位 | 型別 | 說明 |
|------|------|------|
| `userId` | string | 建立者 UID |
| `serviceType` | string | light / ritual / donation |
| `applicantName` | string | 申請人姓名 |
| `wishFor` | string | 願望（如家宅平安） |
| `amount` | number | 金額 |
| `status` | string | pending / approved / rejected |
| `note` | string | 備註 |
| `createdAt` | timestamp | 建立時間 |
| `updatedAt` | timestamp | 更新時間 |
| `approvedBy` | string | 審核人 UID（若有） |

---

### 3.5 schedules（排班系統）
**Firestore 路徑：** `schedules/{scheduleId}`  
**所屬專案：** `schedule-48ff9`

| 欄位 | 型別 | 說明 |
|------|------|------|
| `date` | string (YYYY-MM-DD) | 班表日期 |
| `userId` | string | 志工 UID |
| `shift` | string | morning / afternoon / evening |
| `attendance` | string | present / absent / leave |
| `note` | string | 備註 |
| `createdAt` | timestamp | 建立時間 |
| `updatedAt` | timestamp | 更新時間 |

---

### 3.6 globalConfig（全域設定與公告）
**Firestore 路徑：** `globalConfig/{configId}`  
**所屬專案：** `platform-bc783`

| 欄位 | 型別 | 說明 |
|------|------|------|
| `type` | string | announcement / setting |
| `title` | string | 標題 |
| `content` | string | 內容 |
| `createdAt` | timestamp | 建立時間 |
| `createdBy` | string | superadmin UID |
| `active` | boolean | 是否啟用 |

---

## 4. 關聯與領域模型概念圖（文字版）

```text
users (platform-bc783)
 ├── checkins (checkin-76c77)
 │      ↳ patrols (checkin-76c77)
 ├── services (service-b9d4a)
 └── schedules (schedule-48ff9)
 ```
 - users 為共用核心，跨模組以 UID 為關聯鍵。
- 各模組資料僅透過 Functions 存取，避免跨專案寫入衝突。

## **5. 欄位命名慣例**
|**類型**|**慣例**|**範例**|
|---|---|---|
|集合名稱|複數形式|checkins, services|
|文件 ID|UUID 或自動生成|SV20251030001|
|欄位命名|camelCase|createdAt, userId|
|角色欄位|字串固定值|user, admin, superadmin|
|狀態欄位|小寫英文字母|pending, approved, rejected|
## **6. 安全與規則關聯**
| **規則項目** | **限制**                                   |
| -------- | ---------------------------------------- |
| 使用者角色    | 只能由 Cloud Function updateUserRole() 修改   |
| 服務單狀態    | 僅 admin 可改變 status                       |
| 簽到距離     | 由 verifyCheckinDistance() 判定，client 不可覆寫 |
| 全域公告     | 僅 superadmin 可新增與啟用                      |
## **7. 索引建議**
| **對象**    | **索引組合**           | **用途**    |
| --------- | ------------------ | --------- |
| checkins  | userId + timestamp | 查詢使用者近期簽到 |
| services  | status + createdAt | 審核與歷史查詢   |
| schedules | date + userId      | 月報表與出勤統計  |
| users     | role               | 角色列表      |
> 🔴完成第一輪開發後，請檢查 Firestore console 是否自動提示索引需求。

## **8. 尚待補填項目**
- 🔴是否啟用 Firestore TTL 自動清除歷史簽到資料
- 🔴確定全域公告是否需要多語系（zh / en）欄位
- 🔴Storage 結構（若開啟收據上傳功能）