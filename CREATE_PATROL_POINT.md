# 建立辦公室巡邏點資料

## 🎯 快速建立巡邏點

### 方法 1：使用 Firebase Console（推薦 - 最快）

#### 步驟 1：訪問 Firestore

直接點擊：  
👉 https://console.firebase.google.com/project/checkin-76c77/firestore

#### 步驟 2：建立 Collection

1. 點擊 **「+ 開始集合」** 或 **「+ 新增集合」**
2. 集合 ID 輸入：`patrols`
3. 點擊 **「下一步」**

#### 步驟 3：建立第一個巡邏點文件

**文件 ID**：自動產生（或輸入 `office`）

**欄位設定**：

| 欄位名稱 | 類型 | 值 |
|---------|------|-----|
| name | string | 辦公室 |
| lat | number | 24.1375 |
| lng | number | 120.6736 |
| tolerance | number | 50 |
| active | boolean | true |
| description | string | 龜馬山辦公室 |
| createdAt | timestamp | （點擊時間戳記圖示選擇當前時間） |

#### 步驟 4：儲存

點擊 **「儲存」** 按鈕

---

## ⚠️ 重要提醒

### 更新實際座標

目前使用的座標（24.1375, 120.6736）是龜馬山附近的臨時座標。

**請更新為實際的辦公室 GPS 座標**：

1. 打開 Google Maps
2. 找到辦公室位置
3. 右鍵點擊 → 選擇「這是哪裡？」
4. 複製經緯度（格式：24.xxxxx, 120.xxxxx）
5. 在 Firestore 中更新 `lat` 和 `lng` 欄位

---

## 📱 取得精確座標的方法

### 方法 A：使用 Google Maps（電腦版）
1. 訪問：https://www.google.com/maps
2. 搜尋：龜馬山辦公室
3. 右鍵點擊辦公室位置
4. 選擇「這是哪裡？」
5. 底部會顯示座標（可直接複製）

### 方法 B：使用手機 GPS
1. 在辦公室使用手機打開 Google Maps
2. 點擊藍色圓點（您的位置）
3. 向上滑動資訊卡
4. 複製座標

### 方法 C：使用測試頁面
訪問：https://guimashan.vercel.app/checkin/index.html

1. 允許定位權限
2. 點擊「開始簽到」
3. 查看 Console 日誌中的座標

---

## ✅ 完成後測試

### 1. 重新整理簽到頁面

訪問：https://guimashan.vercel.app/checkin/index.html

### 2. 確認巡邏點出現

下拉選單應該顯示：
```
請選擇巡邏點
  辦公室
```

### 3. 測試簽到功能

1. 選擇「辦公室」
2. 點擊「開始簽到」
3. 允許定位權限
4. 確認簽到成功或查看距離資訊

---

## 🚀 未來新增更多巡邏點

在 Firestore 的 `patrols` collection 中，點擊 **「+ 新增文件」**，使用相同的欄位格式即可。

---

**建立完成後請重新整理簽到頁面測試！** 🎉
