# LINE Login 測試指南

## 🎯 測試目的

驗證 LINE Login Web API 整合是否正常運作，包括：
- ✅ 授權流程
- ✅ CSRF 防護（state 驗證）
- ✅ Firebase 登入
- ✅ 使用者資料建立/更新
- ✅ 角色導向

---

## 📋 測試前檢查清單

### 1. LINE Developers Console 設定
訪問：https://developers.line.biz/console/

確認以下設定：

#### Callback URL（LINE Login 標籤）
```
✅ https://go.guimashan.org.tw/callback.html (正式網址)
✅ https://guimashan.vercel.app/callback.html (備用)
✅ http://localhost:5000/callback.html (本地測試)
```

#### Channel 資訊（Basic settings）
```
✅ Channel ID: 2008269293
✅ Channel Secret: (已設定)
✅ Channel Type: LINE Login
```

### 2. Firebase Console 設定
訪問：https://console.firebase.google.com/project/platform-bc783

#### 授權域名（Authentication → Settings → Authorized domains）
```
✅ go.guimashan.org.tw (正式網址)
✅ guimashan.vercel.app (備用)
✅ localhost (預設)
```

#### Cloud Functions（Functions → Dashboard）
```
✅ generateCustomToken (asia-east2) - 已部署
✅ updateUserRole (asia-east2) - 已部署
```

#### Secrets（Functions → Secrets）
```
✅ LINE_CHANNEL_ID
✅ LINE_CHANNEL_SECRET
```

### 3. Vercel 部署狀態
訪問：https://vercel.com/guimashans-projects/platfrom

確認：
```
✅ 最新部署狀態: Ready
✅ 包含 callback.html
✅ 包含更新的 auth.js
```

---

## 🧪 測試案例

### TC-001: 正常登入流程（Happy Path）

#### 步驟
1. 清除瀏覽器快取和 Cookie
2. 訪問：https://go.guimashan.org.tw 或 https://guimashan.vercel.app
3. 打開瀏覽器開發者工具（F12）→ Console 標籤
4. 點擊「LINE 登入」按鈕

#### 預期結果
- ✅ 導向 LINE 授權頁面：`https://access.line.me/oauth2/v2.1/authorize?...`
- ✅ URL 包含參數：
  - `response_type=code`
  - `client_id=2008269293`
  - `redirect_uri=https://guimashan.vercel.app/callback.html`
  - `state=[隨機 UUID]`
  - `scope=profile%20openid`

#### 步驟（續）
5. 在 LINE 授權頁面點擊「同意」
6. 觀察瀏覽器 Console

#### 預期結果
- ✅ 導回：`https://guimashan.vercel.app/callback.html?code=...&state=...`
- ✅ Console 顯示：「State 驗證通過，準備交換 Firebase Token...」
- ✅ Console 顯示：「Firebase 登入成功！」
- ✅ 自動導向儀表板或簽到頁面
- ✅ 使用者已登入（可以看到使用者資訊）

#### 驗證 Firestore
1. 訪問：https://console.firebase.google.com/project/platform-bc783/firestore
2. 查看 `users` collection
3. 確認有新文件，包含：
   - `displayName`: LINE 顯示名稱
   - `lineUserId`: LINE User ID
   - `pictureUrl`: 大頭照網址
   - `roles`: ["user"]
   - `active`: true
   - `createdAt`: timestamp
   - `lastLogin`: timestamp

---

### TC-002: CSRF 防護測試（State 驗證）

#### 步驟
1. 訪問：https://guimashan.vercel.app
2. 打開開發者工具 → Application/應用程式 → Session Storage
3. 點擊「LINE 登入」
4. **在導向 LINE 之前**，複製 `line_login_state` 的值
5. 完成 LINE 授權
6. **手動修改 URL 的 state 參數**為不同的值
7. 按 Enter 重新載入

#### 預期結果
- ❌ 登入失敗
- ✅ 顯示錯誤：「安全驗證失敗：state 參數不匹配。可能遭受 CSRF 攻擊。」
- ✅ 3 秒後自動導回登入頁

---

### TC-003: 重複使用授權碼（Code Replay）

#### 步驟
1. 完成一次正常登入（TC-001）
2. 複製成功登入後的 callback URL（包含 code 和 state）
3. 登出
4. 將複製的 URL 貼到瀏覽器並訪問

#### 預期結果
- ❌ 登入失敗
- ✅ 顯示錯誤（來自 Cloud Function）：「LINE token exchange failed」
- ✅ 原因：LINE 授權碼只能使用一次

---

### TC-004: 本機開發環境測試

#### 步驟
1. 確認 Replit 前端 workflow 正在運行
2. 訪問：http://localhost:5000（或 Replit Preview URL）
3. 點擊「LINE 登入」
4. 完成授權

#### 預期結果
- ✅ 與正式環境相同的登入流程
- ✅ Callback URL 為：`http://localhost:5000/callback.html`

---

### TC-005: 角色導向測試

#### 準備
設定測試帳號的角色（需要 superadmin 權限）

#### 步驟
1. 登入後觀察導向頁面

#### 預期結果（根據角色）
- `superadmin` → `/admin/dashboard.html`
- `admin_checkin` → `/admin/index.html`
- `poweruser` → `/service/service.html`
- `user` → `/checkin/index.html`

---

## 🔍 疑難排解

### 問題 1: 點擊登入沒反應
**可能原因**：
- JavaScript 錯誤
- LINE Channel ID 不正確

**解決方法**：
1. 打開 Console 查看錯誤訊息
2. 檢查 `auth.js` 中的 `LINE_CHANNEL_ID` 是否為 `2008269293`

---

### 問題 2: 導向 LINE 後出現錯誤
**常見錯誤**：
- `invalid_request` - Callback URL 不匹配
- `unauthorized_client` - Channel ID 或 Secret 錯誤

**解決方法**：
1. 檢查 LINE Developers Console 的 Callback URL 設定
2. 確認 Callback URL 完全一致（包括 https/http、域名、路徑）

---

### 問題 3: Callback 頁面顯示錯誤
**常見原因**：
- State 驗證失敗 → 正常的安全防護
- LINE Token 交換失敗 → Channel Secret 錯誤或授權碼過期

**解決方法**：
1. 查看錯誤訊息
2. 檢查 Firebase Functions 日誌：
   https://console.firebase.google.com/project/platform-bc783/functions/logs
3. 搜尋 `generateCustomToken` 的錯誤日誌

---

### 問題 4: 登入成功但沒有導向
**可能原因**：
- `auth.js` 的角色導向邏輯問題
- 使用者資料未正確建立

**解決方法**：
1. 查看 Console 是否有錯誤
2. 檢查 Firestore 使用者資料是否建立
3. 確認 `roles` 欄位存在且為陣列

---

## 📊 測試報告範本

### 測試執行記錄

| 測試案例 | 狀態 | 備註 |
|---------|------|------|
| TC-001: 正常登入流程 | ⬜ Pass / ⬜ Fail | |
| TC-002: CSRF 防護測試 | ⬜ Pass / ⬜ Fail | |
| TC-003: 重複使用授權碼 | ⬜ Pass / ⬜ Fail | |
| TC-004: 本機開發環境 | ⬜ Pass / ⬜ Fail | |
| TC-005: 角色導向測試 | ⬜ Pass / ⬜ Fail | |

### 測試環境
- **測試日期**：2025-10-31
- **測試網址**：https://guimashan.vercel.app
- **瀏覽器**：
- **LINE 帳號**：

### 發現的問題
（記錄測試過程中發現的任何問題）

---

**準備好了嗎？開始測試！** 🚀

完成測試後，請告訴我結果，我會協助解決任何問題。
