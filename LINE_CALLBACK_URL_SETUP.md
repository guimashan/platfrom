# LINE Login Callback URL 設定指南

## 📋 需要設定的 Callback URL

根據您的專案，需要加入以下兩個網址：

```
https://guimashan.vercel.app/callback.html
http://localhost:5000/callback.html
```

**說明**：
- 第一個用於**正式環境**（Vercel 部署）
- 第二個用於**開發測試**（本機測試）

---

## 🔧 詳細設定步驟

### 步驟 1：登入 LINE Developers Console

訪問：https://developers.line.biz/console/

### 步驟 2：選擇您的 Provider 和 Channel

1. 在首頁選擇您的 **Provider**
2. 點擊您的 **LINE Login channel**（Channel ID: 2008269293）

### 步驟 3：找到 LINE Login 設定

1. 在 Channel 頁面中，找到頂部的**標籤列**
2. 點擊 **「LINE Login」** 標籤（不是 Basic settings）

### 步驟 4：設定 Callback URL

在 **LINE Login** 標籤頁面中：

1. 找到 **「Callback URL」** 欄位
2. 在欄位中輸入（**每個網址一行**）：
   ```
   https://guimashan.vercel.app/callback.html
   http://localhost:5000/callback.html
   ```

### 步驟 5：儲存設定

點擊頁面下方的 **「Update」** 或 **「儲存」** 按鈕

---

## ✅ 設定完成後的檢查

設定完成後，您應該會看到：

```
✅ Callback URL (已設定)
   https://guimashan.vercel.app/callback.html
   http://localhost:5000/callback.html
```

---

## 📸 視覺化步驟

```
LINE Developers Console
│
├─ 選擇 Provider
│
├─ 選擇 LINE Login Channel (2008269293)
│
├─ 點擊「LINE Login」標籤
│
├─ 找到「Callback URL」欄位
│
├─ 輸入兩個網址（每行一個）
│   ├─ https://guimashan.vercel.app/callback.html
│   └─ http://localhost:5000/callback.html
│
└─ 點擊「Update」儲存
```

---

## ⚠️ 常見問題

### Q1: 找不到「LINE Login」標籤？
**A**: 確認您選擇的是 **LINE Login channel**，不是 Messaging API channel。如果還是找不到，請確認 Channel 類型是否正確。

### Q2: 可以設定多個 Callback URL 嗎？
**A**: 可以！LINE Login 支援最多 **400 個** Callback URL，每個 URL 一行。

### Q3: HTTP 和 HTTPS 都可以嗎？
**A**: 
- **正式環境**：只能用 HTTPS
- **開發測試**：可以用 HTTP localhost

### Q4: 網址要完全一致嗎？
**A**: 是的！包括：
- ✅ 協議（http/https）
- ✅ 域名（guimashan.vercel.app）
- ✅ 路徑（/callback.html）
- ❌ Query parameters（可以不同，例如 `?state=xxx`）

---

## 🎯 下一步

設定完 Callback URL 後：

1. ✅ 在 Firebase 啟用 Secret Manager API
2. ✅ 設定 Firebase Secrets（LINE_CHANNEL_ID, LINE_CHANNEL_SECRET）
3. ✅ 部署更新的 Cloud Function
4. ✅ 推送前端更新到 GitHub/Vercel
5. ✅ 測試 LINE 登入流程

---

**設定完成後請告訴我，我會繼續協助後續的部署步驟！** 🚀
