# LIFF 快速測試指南

## 問題診斷

您遇到的 "系統初始化失敗" 錯誤可能由以下原因造成：

1. **LIFF Endpoint URL 未設定**
2. **LIFF ID 配置錯誤**
3. **模組載入問題**（ES6 modules 在 LINE 瀏覽器中的兼容性）
4. **Firebase 初始化失敗**

## 測試步驟

### 第一步：測試基本 LIFF 功能

我已創建一個簡化的測試頁面，不依賴 Firebase 和複雜模組：

**測試頁面 URL**:
```
https://go.guimashan.org.tw/liff/test.html
```

#### 在 LINE Developers Console 設定：

1. 前往 [LINE Developers Console](https://developers.line.biz/console/)
2. 選擇 **LINE Login Channel** (2008269293)
3. 點擊 **LIFF** 標籤
4. 找到 LIFF App `2008269293-Nl2pZBpV`
5. 點擊 **Edit**
6. **Endpoint URL** 改為:
   ```
   https://go.guimashan.org.tw/liff/test.html
   ```
7. 點擊 **Update**

#### 測試方法：

**方法 A - 通過 LINE Bot 觸發**:
1. 在 LINE 中對話官方帳號 `@495fdqrw`
2. 發送訊息：「**奉香簽到**」
3. 點擊回覆中的按鈕

**方法 B - 直接開啟 LIFF URL**:
1. 複製此 URL 到 LINE 聊天室中：
   ```
   https://liff.line.me/2008269293-Nl2pZBpV
   ```
2. 點擊該 URL

### 第二步：檢查測試結果

測試頁面會顯示詳細的診斷信息：

✅ **如果成功**：
- 會看到 "LIFF 測試成功" 的綠色訊息
- 顯示您的 LINE 用戶資料
- 所有檢查項目都通過

❌ **如果失敗**：
- 截圖錯誤訊息
- 檢查日誌中的具體錯誤
- 回報給我以便進一步診斷

---

## 常見問題排查

### 問題 1: LIFF ID 無效
**錯誤**: `Invalid liffId`

**解決方案**:
- 確認 LIFF ID: `2008269293-Nl2pZBpV` 是否正確
- 檢查 LINE Developers Console 中的 LIFF App 是否存在

### 問題 2: Endpoint URL 不匹配
**錯誤**: `Endpoint URL does not match`

**解決方案**:
- Endpoint URL 必須完全一致（包括 https://）
- 確認設定為: `https://go.guimashan.org.tw/liff/test.html`

### 問題 3: LIFF SDK 未載入
**錯誤**: `liff is not defined`

**解決方案**:
- 檢查網路連線
- 確認可以訪問 `https://static.line-scdn.net/liff/edge/2/sdk.js`

### 問題 4: 模組載入失敗
**錯誤**: `Failed to load module` 或 `import not defined`

**解決方案**:
- 這是 ES6 modules 在某些環境中的兼容性問題
- 測試頁面使用傳統 script，不會有此問題

---

## 下一步

### 如果測試頁面成功：

表示 LIFF 基本功能正常，問題出在：
- Firebase 初始化
- ES6 模組載入
- 或者 checkin.html 的其他邏輯

我會修復 checkin.html 使其更加穩定。

### 如果測試頁面失敗：

表示 LIFF 基本配置有問題：
- 檢查 LIFF App 設定
- 確認 Endpoint URL
- 檢查 Channel 權限

---

## 需要協助？

請將以下信息提供給我：

1. ✅ 測試頁面能否正常載入
2. ✅ 是否看到 "LIFF 初始化成功"
3. ✅ 日誌中的完整錯誤訊息
4. ✅ 截圖（如果有錯誤）

我會根據測試結果進行下一步修復！
