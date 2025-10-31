# 啟用 Secret Manager API 指南

## 問題說明
部署 Cloud Functions 時出現錯誤：
```
Secret Manager API has not been used in project platform-bc783 before or it is disabled.
```

## 解決方法

### 選項 1：使用 Firebase CLI 自動啟用（最簡單）

在您的本機執行：

```bash
cd functions
firebase deploy --only functions:generateCustomToken --project platform-bc783
```

Firebase CLI 會自動詢問是否要啟用 Secret Manager API，選擇「Yes」即可。

### 選項 2：手動在 Google Cloud Console 啟用

1. **訪問此連結**（會自動開啟正確的專案和 API 頁面）：
   https://console.developers.google.com/apis/api/secretmanager.googleapis.com/overview?project=platform-bc783

2. **點擊「啟用」(Enable) 按鈕**

3. **等待 1-2 分鐘讓 API 生效**

4. **重新部署**：
   ```bash
   cd functions
   firebase deploy --only functions:generateCustomToken --project platform-bc783
   ```

---

## 為什麼需要 Secret Manager？

我們在 Cloud Function 中使用 Firebase Secrets 來安全儲存：
- `LINE_CHANNEL_ID`
- `LINE_CHANNEL_SECRET`

這些憑證會透過 Google Cloud Secret Manager 加密儲存，比環境變數更安全。

---

## 啟用後的下一步

1. **上傳 Secrets 到 Firebase**：
   ```bash
   firebase functions:secrets:set LINE_CHANNEL_ID --project platform-bc783
   firebase functions:secrets:set LINE_CHANNEL_SECRET --project platform-bc783
   ```
   
   系統會提示您輸入值：
   - LINE_CHANNEL_ID: `2008269293`
   - LINE_CHANNEL_SECRET: （從 LINE Developers Console 取得）

2. **重新部署 Function**：
   ```bash
   firebase deploy --only functions:generateCustomToken --project platform-bc783
   ```

---

**請告訴我當您完成這個步驟後，我會繼續協助部署！**
