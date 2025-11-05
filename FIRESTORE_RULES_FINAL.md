# ✅ Firebase Firestore 最終安全規則

## 🔧 platform-bc783 規則

**位置**：Firebase Console → 專案 `platform-bc783` → Firestore Database → Rules

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // 輔助函數：檢查用戶是否已認證
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // 輔助函數：檢查是否為超級管理員
    function isSuperAdmin() {
      return isAuthenticated() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.roles.hasAny(['superadmin']);
    }
    
    // 輔助函數：檢查是否為任何管理員或幹部
    function isAdminOrPowerUser() {
      return isAuthenticated() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.roles.hasAny([
               'superadmin',
               'admin_checkin',
               'admin_service',
               'admin_schedule',
               'poweruser_checkin',
               'poweruser_service',
               'poweruser_schedule'
             ]);
    }
    
    // 用戶資料 (users)
    match /users/{userId} {
      // 所有已登入用戶可以讀取所有用戶資料（管理頁面需要）
      // 幹部(poweruser)也可以查看所有用戶資料以便篩選和匯出
      allow read: if isAuthenticated();
      // 只有本人可以更新自己的基本資料
      allow update: if isAuthenticated() && userId == request.auth.uid;
      // 只有超級管理員可以創建和刪除用戶
      allow create, delete: if isSuperAdmin();
    }
    
    // LINE 登入資料 (lineUsers)
    match /lineUsers/{lineId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated();
    }
  }
}
```

---

## 🔧 checkin-76c77 規則

**位置**：Firebase Console → 專案 `checkin-76c77` → Firestore Database → Rules

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // 輔助函數：檢查用戶是否已認證
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // 巡邏點 (patrols)
    match /patrols/{patrolId} {
      // 所有已登入用戶可以讀取巡邏點（簽到時需要）
      allow read: if isAuthenticated();
      // 所有已登入用戶可以寫入（由前端 JavaScript 控制實際權限）
      allow write: if isAuthenticated();
    }
    
    // 簽到紀錄 (checkins)
    match /checkins/{checkinId} {
      // 所有已登入用戶可以讀取簽到記錄
      // poweruser_checkin 可以查看所有記錄以便篩選和匯出
      allow read: if isAuthenticated();
      // 允許創建簽到記錄
      allow create: if isAuthenticated();
      // 允許更新和刪除（由前端 JavaScript 控制實際權限）
      allow update, delete: if isAuthenticated();
    }
    
    // 系統設定 (settings)
    match /settings/{settingId} {
      // 所有已登入用戶可以讀取設定（例如測試模式狀態）
      allow read: if isAuthenticated();
      // 允許寫入（由前端 JavaScript 控制實際權限）
      allow write: if isAuthenticated();
    }
  }
}
```

---

## 📊 新的角色體系

```
🔴 superadmin (超級管理員)
   └─ 所有權限 + 管理用戶角色

🟠 admin_checkin (簽到管理員)
   └─ 管理巡邏點 + 查看所有記錄 + 修改設定

🟠 admin_service (神務管理員)
   └─ 管理法會服務相關功能

🟠 admin_schedule (排班管理員)
   └─ 管理志工排班功能

🟡 poweruser_checkin (簽到幹部)
   └─ 查看所有簽到記錄 + 篩選匯出 + 免GPS驗證

🟡 poweruser_service (神務幹部)
   └─ 查看所有神務記錄 + 篩選匯出

🟡 poweruser_schedule (排班幹部)
   └─ 查看所有排班記錄 + 篩選匯出

🟢 user (一般用戶)
   └─ 基本簽到 + 查看自己的記錄
```

---

## ⚠️ 更新您的帳號角色

在 **platform-bc783** 的 Firestore Database → 數據 → users → (您的 UID) 中：

將 `roles` 陣列從：
```
["user", "poweruser", "admin_checkin", "superadmin"]
```

更新為：
```
["user", "poweruser_checkin", "admin_checkin", "superadmin"]
```

---

## ✅ 更新步驟

1. **更新 platform-bc783 規則** → 發布
2. **更新 checkin-76c77 規則** → 發布
3. **更新您的帳號角色**（在 Firestore 數據中手動編輯）
4. **清除瀏覽器快取** (Ctrl+Shift+R)
5. **重新登入網站**
6. **測試所有功能**
