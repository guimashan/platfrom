# 05 - LINE Messaging API 設定

> Messaging API 讓您建立 LINE 官方帳號（機器人），可以自動回覆訊息、發送通知給使用者。

## 🎯 本章目標

完成本章後，您將：
- 建立 LINE Messaging API Channel（官方帳號）
- 設定自動回覆和關鍵字觸發
- 連接 Webhook（讓機器人智能回覆）
- 取得官方帳號的 QR Code 和 ID

## 📋 前置要求

- ✅ 已完成第 03 章（LINE Login）
- ✅ 已完成第 04 章（LIFF）

## 🤖 Messaging API 是什麼？

### 什麼是 LINE 官方帳號？
就像一般的 LINE 好友，但是：
- 可以自動回覆訊息
- 可以群發訊息給所有好友
- 可以設定選單和按鈕
- 可以透過程式控制

### 龜馬山怎麼用？
```
使用者在 LINE 聊天室輸入：「奉香簽到」
    ↓
機器人自動回覆：LIFF 連結
    ↓
使用者點擊連結，開啟 LIFF 簽到頁面
```

## 🛠️ 步驟一：建立 Messaging API Channel

### 1-1. 進入 LINE Developers Console

1. 前往：https://developers.line.biz/console/
2. 選擇您的 Provider（龜馬山）

### 1-2. 建立新的 Channel

1. 點擊「Create a new channel」
2. 選擇 Channel 類型：**「Messaging API」**

### 1-3. 填寫 Channel 資訊

#### 基本資訊
| 欄位 | 填什麼 | 範例 |
|------|--------|------|
| Channel name | 官方帳號名稱 | `龜馬山紫皇天乙真慶宮` |
| Channel description | 簡短描述 | `廟務管理服務平台` |
| Category | 選擇分類 | `Community & Culture` |
| Subcategory | 選擇子分類 | `Religious Organizations` |

#### Channel icon（官方帳號頭像）
上傳廟的 Logo 或照片
- 建議尺寸：1024x1024 像素
- 格式：JPG 或 PNG

#### Email address
填寫廟方的 Email

### 1-4. 同意條款並建立

1. 勾選所有同意項目
2. 點擊「Create」

✅ **完成！**Messaging API Channel 建立成功！

## 📱 步驟二：取得官方帳號資訊

### 2-1. 找到 Channel ID

1. 進入剛建立的 Messaging API Channel
2. 在「Basic settings」找到：
```
Channel ID: 2008221557（範例）
```

**記錄到筆記本！**

### 2-2. 找到 Channel Secret

1. 在同一頁面往下捲動
2. 找到「Channel secret」
3. 點擊「Show」並複製

```
Channel Secret: abcdef1234567890（範例）
```

**⚠️ 超級機密！妥善保管！**

### 2-3. 取得 Channel Access Token

1. 切換到「Messaging API」分頁
2. 往下捲動找到「Channel access token (long-lived)」
3. 點擊「Issue」（發行）
4. 複製 Token

```
Channel Access Token: eyJhbGciOiJ...（很長一串）
```

**⚠️⚠️⚠️ 最機密！千萬不要分享！**

## 🔗 步驟三：設定官方帳號基本資訊

### 3-1. 進入 LINE Official Account Manager

1. 在 Messaging API 設定頁面
2. 找到「LINE Official Account features」
3. 點擊「Edit」或直接前往：https://manager.line.biz/

### 3-2. 設定問候訊息

1. 點擊「回應設定」
2. 設定「加入好友的問候訊息」：

```
歡迎來到龜馬山 goLine 平台！🏯

您可以使用以下功能：
• 輸入「奉香簽到」- 進入簽到系統
• 輸入「神務」- 進入神務服務
• 輸入「排班」- 進入排班系統
• 輸入「幫助」- 查看使用說明
```

### 3-3. 取得 QR Code 和官方帳號 ID

1. 點擊「主頁」
2. 找到「Basic ID」（官方帳號 ID）

```
官方帳號 ID: @495fdqrw
```

3. 下載 QR Code（分享給使用者加入）

## 🔌 步驟四：設定 Webhook

### 什麼是 Webhook？
當使用者傳訊息給機器人時，LINE 會通知您的伺服器，您的程式可以決定要回覆什麼。

### 4-1. 準備 Webhook URL

您的 Webhook URL 會是：
```
https://asia-east2-platform-bc783.cloudfunctions.net/lineWebhook
```

**格式說明**：
- `https://` - 必須是 HTTPS
- `asia-east2` - Firebase 區域
- `platform-bc783` - 您的 Firebase 專案 ID
- `lineWebhook` - Function 名稱

**⚠️ 重要**：這個 URL 要等到第 07 章部署 Firebase Functions 後才會生效！

### 4-2. 在 LINE Developers 設定 Webhook

1. 回到 LINE Developers Console
2. 進入 Messaging API Channel
3. 切換到「Messaging API」分頁
4. 找到「Webhook settings」
5. 點擊「Edit」
6. 輸入 Webhook URL
7. 點擊「Update」
8. 啟用「Use webhook」（開啟開關）

### 4-3. 驗證 Webhook

等第 07 章部署完 Functions 後：
1. 點擊「Verify」
2. 如果成功會顯示「Success」

❌ 如果失敗：
- 請先完成第 07 章（部署 Firebase Functions）
- 再回來驗證

## ⚙️ 步驟五：設定自動回應

### 5-1. 關閉自動回應訊息

1. 在 LINE Official Account Manager
2. 點擊「回應設定」
3. **關閉「自動回應訊息」**（我們要用 Webhook 自己控制）
4. **開啟「Webhook」**

### 5-2. 設定關鍵字回覆（可選）

如果 Webhook 還沒設定好，可以先用關鍵字回覆：

1. 點擊「自動回應訊息」
2. 新增關鍵字：

| 關鍵字 | 回覆內容 |
|--------|---------|
| 奉香簽到 | 請點擊此連結：https://liff.line.me/您的LIFF_ID |
| 幫助 | 輸入「奉香簽到」進入簽到系統 |

**⚠️ 注意**：
- 這只是臨時方案
- 建議完成 Webhook 後改用程式控制
- 程式控制更靈活，可以自訂回覆內容

## 📊 步驟六：測試官方帳號

### 6-1. 加入官方帳號

**方法 1：掃描 QR Code**
1. 用手機 LINE 掃描官方帳號 QR Code
2. 點擊「加入」

**方法 2：搜尋 ID**
1. 打開 LINE
2. 點擊「加入好友」
3. 搜尋：`@495fdqrw`
4. 點擊「加入」

### 6-2. 測試問候訊息

加入後應該會收到問候訊息。

### 6-3. 測試關鍵字（如果有設定）

輸入「奉香簽到」，看是否收到回覆。

### 6-4. 測試 Webhook（等第 07 章完成後）

輸入任何訊息，檢查機器人是否智能回覆。

## 🔐 步驟七：將密鑰儲存到 Firebase

### 7-1. 需要儲存的密鑰

```
LINE_MESSAGING_CHANNEL_SECRET
LINE_MESSAGING_ACCESS_TOKEN
```

### 7-2. 儲存到 Firebase Secret Manager

在終端機執行：

```bash
# 儲存 Channel Secret
firebase functions:secrets:set LINE_MESSAGING_CHANNEL_SECRET

# 貼上您的 Channel Secret，按 Enter

# 儲存 Access Token
firebase functions:secrets:set LINE_MESSAGING_ACCESS_TOKEN

# 貼上您的 Access Token，按 Enter
```

**⚠️ 或者在 Replit Secrets 設定**：
1. 點擊左側「Secrets」
2. 新增：
   - `LINE_MESSAGING_CHANNEL_SECRET`
   - `LINE_MESSAGING_ACCESS_TOKEN`
3. 貼上對應的值

## 📝 記錄所有資訊

請在筆記本記錄：

```
=== LINE Messaging API 資訊 ===

官方帳號名稱: 龜馬山紫皇天乙真慶宮
官方帳號 ID: @495fdqrw
Channel ID: 2008221557
Channel Secret: [加密保存]
Channel Access Token: [加密保存]

Webhook URL: https://asia-east2-platform-bc783.cloudfunctions.net/lineWebhook

QR Code: [已下載]
建立日期: [今天的日期]
```

## ⚠️ 常見錯誤和解決方法

### 錯誤 1：Webhook 驗證失敗
**原因**：Functions 還沒部署或 URL 錯誤

**解決**：
1. 完成第 07 章部署 Functions
2. 確認 URL 格式正確
3. 確認 HTTPS（不是 HTTP）

### 錯誤 2：機器人沒有回覆
**原因**：自動回應訊息沒關閉或 Webhook 沒啟用

**解決**：
1. 確認「自動回應訊息」已關閉
2. 確認「Webhook」已啟用
3. 檢查 Function 的 Log

### 錯誤 3：無法發送訊息
**原因**：Access Token 錯誤

**解決**：
1. 重新產生 Access Token
2. 更新 Firebase Secrets
3. 重新部署 Functions

## ✅ 完成檢查清單

請確認您已經：
- [ ] 建立 Messaging API Channel
- [ ] 取得官方帳號 ID 和 QR Code
- [ ] 設定 Webhook URL
- [ ] 將 Channel Secret 和 Access Token 儲存到 Firebase
- [ ] 加入官方帳號測試
- [ ] 記錄所有資訊到筆記本

## 🎓 下一步

LINE 的所有設定都完成了！接下來要設定 Firebase：

➡️ **下一章：06-Firebase-專案建立.md**

在下一章，我們會建立四個 Firebase 專案，準備好後端系統。

---

💡 **小提示**：
- LINE 官方帳號有免費和付費方案
- 免費方案足夠龜馬山使用
- 如果未來使用者很多，可以考慮升級

現在我們完成了 LINE 平台的所有設定：
✅ LINE Login - 網頁登入
✅ LIFF - LINE 內使用
✅ Messaging API - 官方帳號機器人

接下來要設定後端系統（Firebase）了！
