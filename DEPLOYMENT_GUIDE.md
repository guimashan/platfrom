# 龜馬山 goLine 平台 - 部署指南

## 📋 部署概述

本指南將協助您完成前端（Vercel）和後端（Firebase）的部署，讓系統上線供 UAT 測試使用。

---

## 第一步：推送代碼到 GitHub ✅

### 使用 Replit UI（推薦）

1. **點擊左側的 Git 圖標**（版本控制圖標）
2. **點擊 "Connect Existing" 按鈕**
3. **選擇您的 GitHub 倉庫**：`guimashan/platform`
4. **授權 Replit 訪問您的 GitHub**
5. **確認連接**

連接完成後，Replit 會自動將最新代碼推送到 GitHub `main` 分支。

### 驗證推送成功

前往 https://github.com/guimashan/platform 確認最新的 commit 已出現。

### 🎯 結果

Vercel 會自動偵測到 GitHub 更新，並自動部署到：
- **Staging**: https://guimashan.vercel.app

---

## 第二步：部署 Firebase Functions 🚀

### 方式 A：獲取 Firebase Token（推薦）

1. **在 Replit Shell 執行**：
```bash
firebase login:ci
```

2. **跟隨指示完成登入**（會開啟瀏覽器）

3. **複製返回的 Token**

4. **將 Token 儲存到 Replit Secrets**：
   - 在 Replit 左側點擊「Secrets」
   - 新增 Secret：
     - Key: `FIREBASE_TOKEN`
     - Value: [貼上您的 Token]

5. **執行部署腳本**：
```bash
bash deploy-all.sh
```

### 方式 B：手動部署（如果 Token 方式失敗）

1. **在 Replit Shell 執行**：
```bash
# 登入 Firebase
firebase login

# 部署 Platform Functions
firebase use platform-bc783
firebase deploy --only functions:generateCustomToken,functions:updateUserRole

# 部署 Check-in Functions
firebase use checkin-29f7f
firebase deploy --only functions:verifyCheckinDistance
```

### 驗證部署成功

部署完成後，您應該看到：
```
✔  functions[generateCustomToken] Successful create operation.
✔  functions[updateUserRole] Successful create operation.
✔  functions[verifyCheckinDistance] Successful create operation.
```

---

## 第三步：測試前後端連接 ✅

### 1. 測試前端

訪問：https://guimashan.vercel.app

您應該看到：
- 龜馬山 goLine 平台首頁
- LINE 登入按鈕

### 2. 測試 Platform Functions

```bash
# 測試 generateCustomToken（需要在 LINE 登入後測試）
curl https://asia-east2-platform-bc783.cloudfunctions.net/generateCustomToken
```

### 3. 測試 Check-in Functions

登入後訪問：
- https://guimashan.vercel.app/checkin/

嘗試 GPS 簽到功能

---

## 📊 部署檢查清單

- [ ] GitHub 倉庫已連接並推送最新代碼
- [ ] Vercel 自動部署完成（檢查 guimashan.vercel.app）
- [ ] Firebase Platform Functions 部署成功
- [ ] Firebase Check-in Functions 部署成功
- [ ] 前端可正常訪問
- [ ] LINE 登入功能正常
- [ ] GPS 簽到功能正常

---

## 🔧 故障排除

### 問題 1：GitHub 推送失敗

**解決方案**：
- 確認您的 GitHub 倉庫 `guimashan/platform` 已創建
- 檢查 Replit 是否有 GitHub 訪問權限

### 問題 2：Firebase 部署失敗

**解決方案**：
```bash
# 重新登入 Firebase
firebase logout
firebase login

# 檢查專案設定
firebase projects:list

# 檢查 Functions 目錄
cd functions
npm install
```

### 問題 3：Functions 找不到

**解決方案**：
- 確認 `functions/index.js` 有正確 export Functions
- 檢查 `functions/package.json` 依賴已安裝

---

## 📞 需要協助？

如有任何問題，請聯繫開發團隊或查看：
- Firebase Console: https://console.firebase.google.com/
- Vercel Dashboard: https://vercel.com/guimashans-projects

---

**最後更新**: 2025-10-31
