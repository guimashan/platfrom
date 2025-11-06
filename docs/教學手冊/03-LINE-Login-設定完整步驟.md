# 03 - LINE Login 設定完整步驟

> LINE Login 讓使用者可以用 LINE 帳號登入您的網站，就像用 Facebook 或 Google 登入一樣方便。

## 🎯 本章目標

完成本章後，您將：
- 建立一個 LINE Login Channel
- 取得 Channel ID 和 Channel Secret
- 設定 Callback URL
- 測試 LINE Login 是否正常運作

## 📋 前置要求

- ✅ 已註冊 LINE Developers 帳號（第 02 章）
- ✅ 準備好筆記本，記錄 Channel ID 和 Secret

## 🛠️ 步驟一：登入 LINE Developers Console

### 1-1. 開啟 LINE Developers Console

打開瀏覽器，前往：
```
https://developers.line.biz/console/
```

### 1-2. 用 LINE 帳號登入

1. 點擊「Log in」
2. 用您的 LINE 掃描 QR Code 或輸入帳號密碼
3. 登入成功後會看到主畫面

## 🏢 步驟二：建立 Provider（提供者）

### 什麼是 Provider？
Provider 就像一個「公司」或「組織」，可以管理多個 Channel。
例如：龜馬山可以是一個 Provider，底下有 Login Channel、Messaging Channel 等。

### 2-1. 建立新的 Provider

如果您是第一次使用，需要先建立 Provider：

1. 點擊「Create a new provider」
2. 輸入 Provider 名稱：`龜馬山紫皇天乙真慶宮`（或您偏好的名稱）
3. 點擊「Create」

✅ **完成！**您現在有一個 Provider 了。

### 2-2. （如果已有 Provider）

如果您之前已經建立過 Provider，就直接選擇它。

## 📱 步驟三：建立 LINE Login Channel

### 3-1. 進入 Provider 頁面

1. 點擊您剛剛建立的 Provider
2. 您會看到這個 Provider 底下的所有 Channels

### 3-2. 建立新的 Channel

1. 點擊「Create a new channel」或「Create」按鈕
2. 選擇 Channel 類型：**「LINE Login」**
3. 填寫 Channel 資訊：

#### 基本資訊
| 欄位 | 填什麼 | 範例 |
|------|--------|------|
| Channel name | 系統名稱 | `龜馬山 goLine 平台` |
| Channel description | 簡單描述 | `龜馬山廟務管理系統` |
| App types | 選擇 Web app | ✅ Web app |

#### 地區和語言
| 欄位 | 填什麼 |
|------|--------|
| Region | Taiwan |
| Primary language | Chinese (Traditional) |

#### Email address
填寫廟方的 Email（用來接收通知）

### 3-3. 同意條款

1. 勾選「I have read and agreed to the LINE Developers Agreement」
2. 點擊「Create」

✅ **完成！**您的 LINE Login Channel 建立成功了！

## 🔑 步驟四：取得 Channel ID 和 Channel Secret

### 4-1. 進入 Channel 設定

1. 點擊剛剛建立的 LINE Login Channel
2. 切換到「Basic settings」分頁

### 4-2. 找到並記錄 Channel ID

```
Channel ID: 2008269293（範例）
```

**⚠️ 請把這個 ID 記在筆記本裡！**

### 4-3. 找到並記錄 Channel Secret

1. 往下捲動，找到「Channel secret」
2. 點擊「Show」顯示 Secret
3. 複製 Secret

```
Channel Secret: 1234567890abcdef（範例，實際會更長）
```

**⚠️⚠️⚠️ 超級重要！**
- 這個 Secret 千萬不要分享給別人
- 不要放在程式碼裡
- 不要上傳到 GitHub
- 記在安全的地方（例如密碼管理工具）

## 🔗 步驟五：設定 Callback URL

### 什麼是 Callback URL？
使用者在 LINE 登入後，LINE 會把使用者送回您的網站。Callback URL 就是「送回哪裡」的網址。

### 5-1. 切換到 LINE Login 分頁

1. 點擊上方的「LINE Login」分頁
2. 找到「Callback URL」設定

### 5-2. 新增 Callback URLs

**開發階段**（本機測試）：
```
http://localhost:5000/callback.html
```

**測試環境**（Vercel 測試網址）：
```
https://您的專案名稱.vercel.app/callback.html
```

**正式環境**（自訂網域）：
```
https://go.guimashan.org.tw/callback.html
```

### 5-3. 新增方法

1. 點擊「Edit」
2. 輸入網址
3. 點擊「Add」
4. 重複以上步驟，加入所有需要的網址
5. 點擊「Update」儲存

✅ **完成！**Callback URLs 設定完成。

## 📝 步驟六：設定其他選項

### 6-1. App types（應用程式類型）

確認已勾選：
- ✅ Web app

### 6-2. Email address permission（Email 權限）

如果您需要取得使用者的 Email：
1. 往下捲動找到「Email address permission」
2. 點擊「Apply」
3. 等待 LINE 審核（通常幾小時內會通過）

**注意**：龜馬山系統目前**不需要** Email 權限。

### 6-3. OpenID Connect

建議保持啟用（預設就是啟用的）。

## 📊 步驟七：記錄所有資訊

請在您的筆記本記錄以下資訊：

```
=== LINE Login Channel 資訊 ===

Provider: 龜馬山紫皇天乙真慶宮
Channel 名稱: 龜馬山 goLine 平台
Channel ID: [您的 Channel ID]
Channel Secret: [您的 Channel Secret] ⚠️ 加密保存！

Callback URLs:
- 開發: http://localhost:5000/callback.html
- 測試: https://您的專案.vercel.app/callback.html
- 正式: https://go.guimashan.org.tw/callback.html

建立日期: [今天的日期]
```

## 🧪 步驟八：測試 LINE Login（稍後進行）

**現在還不能測試！**

因為我們還需要：
1. 設定 Firebase（第 06 章）
2. 部署程式碼（第 11 章）

在第 11 章部署完成後，我們會回來測試 LINE Login 是否正常運作。

## ⚠️ 常見錯誤和解決方法

### 錯誤 1：找不到「Create a new provider」
**原因**：您可能已經有 Provider 了
**解決**：直接選擇現有的 Provider，然後建立 Channel

### 錯誤 2：無法建立 Channel
**原因**：可能沒有勾選同意條款
**解決**：確認有勾選「I have read and agreed to...」

### 錯誤 3：Callback URL 錯誤
**原因**：網址格式不正確
**解決**：
- 確保以 `http://` 或 `https://` 開頭
- 結尾要加上 `/callback.html`
- 不要有多餘的空格

### 錯誤 4：忘記 Channel Secret
**原因**：沒有記錄下來
**解決**：
- 回到 Channel 設定頁面
- 點擊「Reissue」重新產生（但舊的 Secret 會失效）

## ✅ 完成檢查清單

請確認您已經：
- [ ] 建立 LINE Login Provider
- [ ] 建立 LINE Login Channel
- [ ] 記錄 Channel ID
- [ ] 記錄 Channel Secret（加密保存！）
- [ ] 設定所有需要的 Callback URLs
- [ ] 把所有資訊記在筆記本裡

## 🎓 下一步

恭喜！LINE Login 設定完成了！接下來我們要設定 LIFF：

➡️ **下一章：04-LIFF-設定完整步驟.md**

在下一章，我們會設定 LIFF，讓使用者可以在 LINE 聊天室裡直接使用您的系統，不用跳出 LINE！

---

💡 **小提示**：
- LINE Login 和 LIFF 雖然都是 LINE 的功能，但是兩個不同的 Channel
- LINE Login 用在網頁（需要跳出 LINE）
- LIFF 用在 LINE 內（不用跳出 LINE）
- 兩個都需要設定，缺一不可！
