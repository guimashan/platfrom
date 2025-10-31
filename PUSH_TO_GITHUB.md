# 推送更新到 GitHub 指南

## 📋 已修改的檔案

我已經完成以下檔案的修改，準備推送到 GitHub：

### 後端 (已部署)
- ✅ `functions/src/platform/index.js` - 更新 generateCustomToken Function 支援 LINE 授權碼交換
- ✅ 已部署到 platform-bc783

### 前端 (待推送)
- ✅ `public/callback.html` - 新增 LINE 授權回調處理頁面
- ✅ `public/js/auth.js` - 修改登入流程使用 LINE Login Web API

---

## 🚀 推送步驟

請在 **Replit Shell** 或您的**本機終端**執行：

```bash
# 1. 查看變更
git status

# 2. 加入所有變更
git add public/callback.html public/js/auth.js functions/src/platform/index.js

# 3. 提交變更
git commit -m "Implement LINE Login Web API integration (方案 B)

- 更新 generateCustomToken Function 支援 LINE 授權碼交換
- 新增 callback.html 處理 LINE 授權回調
- 修改 auth.js 使用 LINE Login Web API 替代 Firebase OAuthProvider
- 整合 LINE Secrets 管理（LINE_CHANNEL_ID, LINE_CHANNEL_SECRET）"

# 4. 推送到 GitHub
git push origin main
```

---

## ✅ 推送後 Vercel 會自動部署

推送成功後：
1. GitHub 會收到更新
2. Vercel 會自動偵測並開始部署
3. 約 1-2 分鐘後，新版本會上線

---

## 🧪 部署完成後的測試步驟

### 1. 訪問首頁
https://guimashan.vercel.app

### 2. 點擊「LINE 登入」按鈕
應該會導向 LINE 授權頁面

### 3. 授權登入
- 使用您的 LINE 帳號授權
- 授權後會導回 `/callback.html`
- 自動處理登入並導向儀表板

### 4. 確認登入成功
- 檢查是否成功登入
- 確認使用者資料已儲存到 Firestore

---

## 🔍 如果遇到問題

### 檢查清單

1. **LINE Callback URL 是否已設定**
   - ✅ `https://guimashan.vercel.app/callback.html`
   - ✅ `http://localhost:5000/callback.html`

2. **Firebase 授權域名是否已加入**
   - ✅ `guimashan.vercel.app`

3. **Cloud Function 是否部署成功**
   - ✅ generateCustomToken 已部署

4. **Secrets 是否已設定**
   - ✅ LINE_CHANNEL_ID
   - ✅ LINE_CHANNEL_SECRET

### 查看錯誤訊息

**瀏覽器 Console**：
- 按 F12 打開開發者工具
- 查看 Console 標籤的錯誤訊息

**Firebase Functions 日誌**：
- 訪問：https://console.firebase.google.com/project/platform-bc783/functions/logs
- 查看 generateCustomToken 的執行日誌

---

## 📞 需要協助

如果遇到任何問題，請提供：
1. 錯誤訊息截圖
2. 瀏覽器 Console 日誌
3. Firebase Functions 日誌

我會協助您排查問題！

---

**準備好了嗎？執行上面的推送指令開始部署！** 🚀
