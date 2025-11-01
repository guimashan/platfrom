# LINE 配置清单 ✅

## ✅ 已完成的设置

### 1. Firebase Secrets（已设置）
- ✅ LINE_MESSAGING_CHANNEL_SECRET
- ✅ LINE_MESSAGING_ACCESS_TOKEN

### 2. Cloud Functions（已部署）
- ✅ lineWebhook Function 已部署
- **Webhook URL**: `https://asia-east2-platform-bc783.cloudfunctions.net/lineWebhook`

### 3. LIFF App（已配置 1/3）
- ✅ LIFF ID: `2008269293-Nl2pZBpV`
- ✅ 已更新到所有页面（暂时三个模块共用）

---

## ⚠️ 需要您完成的设置

### 步骤 1：设置 LIFF Endpoint URL

前往 [LINE Developers Console](https://developers.line.biz/console/)

1. 选择您的 **LINE Login Channel** (ID: 2008269293)
2. 点击 **LIFF** 标签
3. 找到 LIFF ID `2008269293-Nl2pZBpV`
4. 点击 **Edit** 编辑
5. 设置 **Endpoint URL**:
   ```
   https://go.guimashan.org.tw/liff/checkin.html
   ```
6. 点击 **Update** 保存

### 步骤 2：设置 Messaging API Webhook ✅ 已修复

1. 前往您的 **Messaging API Channel** (ID: 2008221557)
2. 点击 **Messaging API** 标签
3. 在 **Webhook settings** 区域：
   - **Webhook URL**: 输入以下任一 URL（两个都可以使用）：
     ```
     https://asia-east2-platform-bc783.cloudfunctions.net/lineWebhook
     ```
     或
     ```
     https://linewebhook-4yprhpbawa-df.a.run.app
     ```
   - 点击 **Update**
   - 点击 **Verify** 验证（应该显示成功 ✅）
   - **Use webhook**: 切换为 **开启** 🟢

4. 在同页面底部的 **Response settings**：
   - **Auto-reply messages**: 切换为 **关闭** 🔴
   - **Greeting messages**: 保持开启或关闭（可选）

### 步骤 3：（建议）创建另外两个 LIFF Apps

为了让三个模块有独立的 LIFF App，建议再创建两个：

#### 创建「神务服务」LIFF App

1. 在 LINE Login Channel (2008269293) 的 LIFF 标签
2. 点击 **Add** 新增
3. 填写：
   - **LIFF app name**: 神务服务
   - **Size**: Full
   - **Endpoint URL**: `https://go.guimashan.org.tw/liff/service.html`
   - **Scopes**: ☑ profile, ☑ openid
4. 点击 **Add**
5. **记录新的 LIFF ID**

#### 创建「排班系统」LIFF App

1. 重复上述步骤
2. 填写：
   - **LIFF app name**: 排班系统
   - **Endpoint URL**: `https://go.guimashan.org.tw/liff/schedule.html`
   - **Scopes**: ☑ profile, ☑ openid
3. **记录新的 LIFF ID**

#### 创建后更新代码

如果您创建了新的 LIFF Apps，请告诉我新的 LIFF IDs，我会帮您更新代码。

---

## 🧪 测试步骤

### 测试 1：验证 Webhook

设置完 Webhook URL 后，在 LINE Developers Console 点击 **Verify** 按钮。

**预期结果**: ✅ Success

### 测试 2：测试官方账号

1. 在 LINE App 中搜索您的 Bot: `@495fdqrw`
2. 加入好友
3. 发送讯息：「奉香簽到」

**预期结果**: 
- 收到按钮讯息
- 点击按钮后开启 LIFF App
- 自动登入并显示签到页面

### 测试 3：测试其他关键字

试试这些关键字：
- 「神務」→ 开启神务服务
- 「排班」→ 开启排班系统
- 「幫助」→ 显示帮助讯息

---

## 🎯 支援的关键字

| 关键字 | 触发功能 |
|--------|---------|
| 奉香、簽到、打卡 | 开启奉香签到 LIFF App |
| 神務、服務、法會 | 开启神务服务 LIFF App |
| 排班、班表、志工 | 开启排班系统 LIFF App |
| 幫助、help、? | 显示帮助讯息 |
| 其他任何讯息 | 显示功能选单（三个按钮） |

---

## 📊 架构流程

```
用户在 LINE 输入：「奉香簽到」
         ↓
LINE Official Account (@495fdqrw)
         ↓
发送 Webhook 到 Cloud Function
         ↓
https://asia-east2-platform-bc783.cloudfunctions.net/lineWebhook
         ↓
解析关键字，回覆 LIFF URL 按钮
         ↓
用户点击「開始簽到」按钮
         ↓
LIFF App 在 LINE 内开启
https://liff.line.me/2008269293-Nl2pZBpV
         ↓
LIFF SDK 自动登入
         ↓
Firebase Authentication
         ↓
显示签到页面 ✅
```

---

## 🐛 疑难排解

### Q: Webhook 验证失败
**A**: 检查：
1. Webhook URL 是否正确
2. Cloud Function 是否部署成功
3. Secrets 是否正确设置

### Q: LIFF App 显示错误
**A**: 检查：
1. Endpoint URL 是否正确
2. LIFF ID 是否正确
3. 域名是否已添加到 Firebase Authorized Domains

### Q: 发送讯息无回应
**A**: 检查：
1. Webhook 是否已启用
2. Auto-reply 是否已关闭
3. 查看 Firebase Functions Logs

---

## ✅ 完成检查清单

- [ ] 步骤 1：设置 LIFF Endpoint URL
- [ ] 步骤 2：设置 Messaging API Webhook URL
- [ ] 步骤 2：验证 Webhook（点击 Verify）
- [ ] 步骤 2：启用 Webhook（Use webhook = ON）
- [ ] 步骤 2：关闭 Auto-reply messages
- [ ] 测试：发送「奉香簽到」收到回覆
- [ ] 测试：点击按钮开启 LIFF App
- [ ] （可选）步骤 3：创建另外两个 LIFF Apps

---

完成以上步骤后，您的 LINE 官方账号就能完美运作了！🎉
