# 修復 IAM 權限問題

## 🔴 錯誤說明

```
Permission 'iam.serviceAccounts.signBlob' denied
```

這個錯誤表示 Cloud Functions 的服務帳號沒有足夠的權限來產生 Firebase Custom Token。

---

## ✅ 解決方案（選擇其一）

### 方案 A：授予 Service Account Token Creator 角色（推薦）

#### 步驟 1：找到服務帳號郵件地址

您的服務帳號是：
```
971307854623-compute@developer.gserviceaccount.com
```

#### 步驟 2：在 Google Cloud Console 授予權限

1. **訪問 IAM 頁面**：
   https://console.cloud.google.com/iam-admin/iam?project=platform-bc783

2. **找到服務帳號**：
   - 在列表中找到：`971307854623-compute@developer.gserviceaccount.com`
   - 或搜尋：`compute@developer`

3. **編輯權限**：
   - 點擊該服務帳號旁邊的「✏️ 編輯」（鉛筆圖示）

4. **新增角色**：
   - 點擊「+ 新增其他角色」
   - 搜尋並選擇：**Service Account Token Creator**
   - 或直接輸入：`roles/iam.serviceAccountTokenCreator`

5. **儲存**：
   - 點擊「儲存」按鈕

#### 步驟 3：等待權限生效

- 權限變更通常立即生效
- 建議等待 1-2 分鐘後再測試

---

### 方案 B：使用 Service Account Key（不推薦，僅供備用）

如果方案 A 無法執行，可以使用服務帳號金鑰檔案。

**注意**：這種方式安全性較低，不建議在生產環境使用。

---

## 🧪 測試修復

### 完成上述步驟後：

1. **清除瀏覽器快取**
2. **重新訪問**：https://guimashan.vercel.app
3. **點擊 LINE 登入**
4. **完成授權**

### 預期結果

- ✅ 成功導回 callback.html
- ✅ 成功產生 Firebase Custom Token
- ✅ 成功登入 Firebase
- ✅ Firestore 自動建立使用者資料

---

## 🔍 驗證權限已生效

### 方法 1：查看 IAM 頁面

訪問：https://console.cloud.google.com/iam-admin/iam?project=platform-bc783

確認服務帳號有以下角色：
- ✅ Editor（或 Owner）
- ✅ **Service Account Token Creator** ← 新增的

### 方法 2：查看 Functions 日誌

訪問：https://console.firebase.google.com/project/platform-bc783/functions/logs

過濾：`generateCustomToken`

成功的日誌應該顯示：
- ✅ "LINE 使用者資料已取得"
- ✅ "新使用者已建立" 或 "使用者登入時間已更新"

---

## 💡 為什麼需要這個權限？

Firebase Admin SDK 使用 `admin.auth().createCustomToken()` 時，需要：
1. 產生 JWT（JSON Web Token）
2. 使用服務帳號的私鑰簽署 JWT

`iam.serviceAccountTokenCreator` 角色允許服務帳號：
- 簽署 JWT tokens
- 產生 custom authentication tokens

這是 Firebase 官方建議的權限設定。

---

## 📚 相關文件

- [Firebase Custom Tokens 官方文件](https://firebase.google.com/docs/auth/admin/create-custom-tokens)
- [IAM Service Account Permissions](https://cloud.google.com/iam/docs/service-account-permissions)

---

**完成權限設定後，請告訴我測試結果！** 🚀
