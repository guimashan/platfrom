# Firebase 授權網域設定指南

## 問題說明
錯誤訊息：`Firebase: Error (auth/unauthorized-domain)`

**原因**：Vercel 部署網址 `guimashan.vercel.app` 尚未加入 Firebase Authentication 的授權域名清單。

---

## 🔧 解決方法

### 步驟 1：前往 Firebase Console

1. 訪問 Firebase Authentication 設定頁面：
   - **Platform 專案**：https://console.firebase.google.com/project/platform-bc783/authentication/settings
   - **Check-in 專案**：https://console.firebase.google.com/project/checkin-76c77/authentication/settings

### 步驟 2：找到授權網域區塊

在設定頁面中，找到：
- **英文介面**：「Authorized domains」
- **中文介面**：「授權網域」

### 步驟 3：新增域名

1. 點擊「**新增網域**」(Add domain) 按鈕
2. 輸入：`guimashan.vercel.app`
3. 點擊「**新增**」(Add)

### 步驟 4：驗證設定

設定完成後，您應該會看到域名清單包含：
- ✅ `localhost`（預設）
- ✅ `platform-bc783.firebaseapp.com`（預設）
- ✅ `platform-bc783.web.app`（預設）
- ✅ `guimashan.vercel.app`（剛剛新增）

---

## 📋 建議的完整域名清單

### Platform 專案 (platform-bc783)
需要在此專案加入，因為 LINE Login 使用這個專案的 Authentication：

```
localhost
platform-bc783.firebaseapp.com
platform-bc783.web.app
guimashan.vercel.app
go.guimashan.org.tw
```

### Check-in 專案 (checkin-76c77)
目前不需要加入（因為 Check-in 功能不需要跨域名驗證）

---

## ⚠️ 注意事項

1. **不需要加 https://**  
   只輸入域名，不要加協議：
   - ✅ 正確：`guimashan.vercel.app`
   - ❌ 錯誤：`https://guimashan.vercel.app`

2. **不需要加路徑**  
   只輸入主域名：
   - ✅ 正確：`guimashan.vercel.app`
   - ❌ 錯誤：`guimashan.vercel.app/index.html`

3. **Vercel 自動域名已包含**  
   Vercel 的部署預覽域名（例如 `platfrom-xyz.vercel.app`）如果也要使用，需要個別加入

4. **未來正式域名**  
   當設定 `go.guimashan.org.tw` 時，記得也要加入此域名

---

## 🧪 測試步驟

設定完成後：

1. **清除瀏覽器快取**（或使用無痕模式）
2. **重新訪問**：https://guimashan.vercel.app
3. **點擊 LINE 登入**
4. **確認可以正常登入**

---

## 📞 如果還是有問題

1. **檢查域名拼寫**：確認沒有打錯字
2. **等待幾分鐘**：Firebase 設定可能需要幾分鐘生效
3. **清除快取**：使用 Ctrl+Shift+Delete 清除瀏覽器快取
4. **檢查 Console**：打開瀏覽器開發者工具查看詳細錯誤

---

**設定完成後，LINE 登入功能就可以正常使用了！** 🎉
