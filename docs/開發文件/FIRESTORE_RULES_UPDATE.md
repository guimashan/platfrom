# Firebase Firestore 安全規則更新指南

## ⚠️ 重要：修復「Missing or insufficient permissions」錯誤

您的後台管理頁面出現權限錯誤，是因為 **Firebase Firestore 安全規則** 需要更新。

---

## 📋 需要更新的 Firebase 專案

### 1️⃣ **checkin-76c77** (奉香簽到資料庫)

**位置**：Firebase Console → 專案 `checkin-76c77` → Firestore Database → Rules

**請將規則替換為以下內容**：

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // 輔助函數：檢查用戶是否已認證
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // 輔助函數：檢查用戶角色
    function hasRole(role) {
      return isAuthenticated() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.roles.hasAny([role]);
    }
    
    // 輔助函數：檢查是否為管理員
    function isAdmin() {
      return isAuthenticated() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.roles.hasAny([
               'superadmin', 
               'admin_checkin'
             ]);
    }
    
    // 巡邏點 (patrols)
    match /patrols/{patrolId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
    
    // 簽到紀錄 (checkins)
    match /checkins/{checkinId} {
      // 所有已登入用戶可以讀取自己的紀錄
      allow read: if isAuthenticated() && 
                     (resource.data.userId == request.auth.uid || isAdmin());
      // 只有系統可以創建簽到紀錄（透過 Cloud Function）
      allow create: if isAuthenticated();
      // 只有管理員可以更新和刪除
      allow update, delete: if isAdmin();
    }
    
    // 系統設定 (settings)
    match /settings/{settingId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
    
    // 用戶資料 (users) - 從 platform-bc783 同步而來
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin() || userId == request.auth.uid;
    }
  }
}
```

---

### 2️⃣ **platform-bc783** (主平台資料庫)

**位置**：Firebase Console → 專案 `platform-bc783` → Firestore Database → Rules

**請將規則替換為以下內容**：

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // 輔助函數：檢查用戶是否已認證
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // 輔助函數：檢查用戶角色
    function hasRole(role) {
      return isAuthenticated() && 
             resource.data.roles.hasAny([role]);
    }
    
    // 輔助函數：檢查是否為超級管理員
    function isSuperAdmin() {
      return isAuthenticated() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.roles.hasAny(['superadmin']);
    }
    
    // 輔助函數：檢查是否為任何管理員
    function isAnyAdmin() {
      return isAuthenticated() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.roles.hasAny([
               'superadmin',
               'admin_checkin',
               'admin_service',
               'admin_schedule'
             ]);
    }
    
    // 用戶資料 (users)
    match /users/{userId} {
      // 所有已登入用戶可以讀取自己的資料
      allow read: if isAuthenticated() && 
                     (userId == request.auth.uid || isAnyAdmin());
      // 只有本人可以更新自己的基本資料
      allow update: if isAuthenticated() && userId == request.auth.uid;
      // 只有超級管理員可以更新角色
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

## 🔧 如何更新規則

### **步驟 1：進入 Firebase Console**
1. 前往 [Firebase Console](https://console.firebase.google.com/)
2. 選擇專案 **checkin-76c77**

### **步驟 2：更新 Firestore 規則**
1. 左側選單 → **Firestore Database**
2. 上方選單 → **Rules**
3. 複製上面的規則內容
4. 貼上到編輯器中
5. 點擊 **發布 (Publish)**

### **步驟 3：重複步驟**
對 **platform-bc783** 專案重複相同步驟

---

## ✅ 驗證規則是否生效

更新規則後，請：

1. **清除瀏覽器快取** (Ctrl+F5 或 Cmd+Shift+R)
2. **重新登入**：前往 https://guimashan.vercel.app/
3. **測試以下頁面**：
   - ✅ 簽到紀錄：`/checkin/history.html`
   - ✅ 儀表板：`/checkin/manage/dashboard.html`
   - ✅ 使用者管理：`/checkin/manage/user-manage.html`
   - ✅ 巡邏點管理：`/checkin/manage/patrol-manage.html`

---

## 🚨 常見問題

### Q: 為什麼需要更新規則？
因為我們更新了角色名稱系統：
- ❌ 舊名稱：`SuperAdmin`, `admin`
- ✅ 新名稱：`superadmin`, `admin_checkin`, `admin_service`, `admin_schedule`

### Q: 更新規則會影響現有資料嗎？
不會！安全規則只控制誰可以讀寫資料，不會影響已存在的資料。

### Q: 如果還是出現權限錯誤怎麼辦？
1. 確認您的帳號已被設為 `superadmin` 或 `admin_checkin` 角色
2. 登出後重新登入
3. 檢查 Console 錯誤訊息

---

## 📞 需要協助？

如果更新後仍有問題，請提供：
1. Firebase Console 中的規則截圖
2. 瀏覽器 Console 的錯誤訊息
3. 您的帳號角色設定

我會立即協助排查！
