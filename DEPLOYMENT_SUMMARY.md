# 龜馬山 goLine 平台 - 部署摘要報告

**部署日期**: 2025-10-31  
**部署狀態**: ✅ 成功

---

## 📦 部署內容

### 1️⃣ 前端 (Frontend)
- **平台**: GitHub + Vercel
- **倉庫**: https://github.com/guimashan/platfrom
- **Staging URL**: https://guimashan.vercel.app
- **狀態**: ✅ 已推送到 GitHub，Vercel 自動部署中

### 2️⃣ 後端 (Backend) - Platform 模組
- **Firebase 專案**: platform-bc783
- **部署區域**: asia-east2
- **已部署 Functions**:
  - ✅ `generateCustomToken` - LINE OAuth 登入支援
  - ✅ `updateUserRole` - 角色管理（superadmin 專用）
- **API URL**: https://asia-east2-platform-bc783.cloudfunctions.net/

### 3️⃣ 後端 (Backend) - Check-in 模組
- **Firebase 專案**: checkin-76c77（新專案）
- **部署區域**: asia-east2
- **已部署 Functions**:
  - ✅ `verifyCheckinDistance` - GPS 簽到距離驗證
- **API URL**: https://asia-east2-checkin-76c77.cloudfunctions.net/

---

## 🎯 已實現功能

### Platform 模組
- ✅ LINE OAuth 2.0 登入
- ✅ Firebase 自訂 Token 生成
- ✅ 角色系統 V3（支援多重角色陣列）
- ✅ 使用者角色管理

### Check-in 模組
- ✅ GPS 簽到功能
- ✅ Haversine 距離計算
- ✅ 自訂容許距離（預設 30 公尺）
- ✅ 巡邏點管理介面

### 前端介面
- ✅ 登入頁面
- ✅ GPS 簽到頁面
- ✅ 巡邏點管理後台
- ✅ 動態儀表板（基於角色顯示）

---

## 🧪 UAT 測試指南

### 測試環境
- **前端**: https://guimashan.vercel.app
- **測試帳號**: 使用您的 LINE 帳號登入

### 測試項目

#### 1. 登入功能
1. 訪問 https://guimashan.vercel.app
2. 點擊「LINE 登入」按鈕
3. 使用 LINE 帳號授權登入
4. 確認成功跳轉到儀表板

#### 2. GPS 簽到功能
1. 登入後訪問 `/checkin/`
2. 允許瀏覽器獲取位置權限
3. 選擇巡邏點
4. 點擊「簽到」按鈕
5. 確認簽到成功或距離提示

#### 3. 巡邏點管理（需要 admin_checkin 或 superadmin 角色）
1. 訪問 `/checkin/admin.html`
2. 點擊「新增巡邏點」
3. 填寫巡邏點資訊
4. 確認儲存成功

#### 4. 角色管理（需要 superadmin 角色）
1. 測試角色更新功能
2. 確認角色權限正確生效

---

## ⚠️ 已知限制

1. **Firebase 專案變更**
   - 原 Check-in 專案 `checkin-29f7f` 已刪除
   - 改用新專案 `checkin-76c77`
   - 前端配置已更新

2. **待開發模組**
   - Service 模組（神服服務）
   - Schedule 模組（排班系統）

3. **Blaze 方案**
   - Platform 和 Check-in 專案已升級到 Blaze 方案
   - 建議設定預算警報

---

## 📊 成本預估

### Firebase Blaze 方案免費額度
- **Cloud Functions**: 每月 200 萬次呼叫免費
- **Cloud Build**: 每天 120 分鐘免費
- **Firestore**: 每天 50,000 次讀取、20,000 次寫入免費

### 預期使用量
對於初期 UAT 測試，**預計不會產生額外費用**。

建議設定預算警報：
- Platform: https://console.firebase.google.com/project/platform-bc783/usage/details
- Check-in: https://console.firebase.google.com/project/checkin-76c77/usage/details

---

## 🔗 重要連結

### 管理控制台
- **GitHub**: https://github.com/guimashan/platfrom
- **Vercel Dashboard**: https://vercel.com/guimashans-projects
- **Firebase Platform**: https://console.firebase.google.com/project/platform-bc783
- **Firebase Check-in**: https://console.firebase.google.com/project/checkin-76c77

### 前端網址
- **Staging**: https://guimashan.vercel.app
- **Production**: https://go.guimashan.org.tw（需在 Vercel 設定）

### API 端點
- **Platform Functions**: https://asia-east2-platform-bc783.cloudfunctions.net/
- **Check-in Functions**: https://asia-east2-checkin-76c77.cloudfunctions.net/

---

## 📝 後續步驟

1. ✅ **立即可進行 UAT 測試**
2. 🔄 設定 Firebase 預算警報
3. 🔄 在 Vercel 設定正式域名 `go.guimashan.org.tw`
4. 🔄 測試完成後開發 Service 和 Schedule 模組
5. 🔄 設定監控和日誌分析

---

**部署完成！您現在可以開始 UAT 測試了** 🎉

如有任何問題，請查看相關控制台或聯繫開發團隊。
