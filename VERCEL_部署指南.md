# 🚀 Vercel 正式环境部署指南

## 📋 部署前准备

### ✅ 确认已完成项目
- [x] LIFF 签到功能已在 Replit 测试通过
- [x] LINE Login 网页端配置完成
- [x] Firebase Cloud Functions 已部署
- [x] Webhook 已配置（待启用签名验证）

---

## 🔧 第一步：部署到 Vercel

### 方法 1：使用 Vercel CLI（推荐）

1. **安装 Vercel CLI**（如果尚未安装）
   ```bash
   npm install -g vercel
   ```

2. **登录 Vercel**
   ```bash
   vercel login
   ```

3. **在项目根目录执行部署**
   ```bash
   vercel --prod
   ```

4. **设置自定义域名**
   - 部署完成后，前往 Vercel Dashboard
   - 选择项目 → Settings → Domains
   - 添加域名：`go.guimashan.org.tw`
   - 按照提示配置 DNS 记录

### 方法 2：使用 Vercel Dashboard（网页界面）

1. 前往 [Vercel Dashboard](https://vercel.com/dashboard)
2. 点击 **"New Project"**
3. 选择 **"Import Git Repository"**
4. 连接您的 GitHub 仓库
5. 配置设置：
   - **Framework Preset**: Other
   - **Root Directory**: `./`
   - **Build Command**: 留空
   - **Output Directory**: `public`
6. 点击 **"Deploy"**
7. 部署完成后，添加自定义域名 `go.guimashan.org.tw`

---

## 📝 第二步：更新 LINE Developers Console 配置

部署完成后，需要更新以下配置：

### 1️⃣ 更新 LIFF Endpoint URL

**前往**：[LINE Developers Console](https://developers.line.biz/console/)

1. 选择 **LINE Login Channel** (2008269293)
2. 点击 **LIFF** → 选择 `2008269293-Nl2pZBpV`
3. 点击 **Edit**
4. 更新 **Endpoint URL**：
   ```
   旧: https://bcf7b88a-d8f0-4a2a-8924-0044e5aa9be7-00-2dpyat3ruy3xb.spock.replit.dev/liff/checkin.html
   新: https://go.guimashan.org.tw/liff/checkin.html
   ```
5. 点击 **Update**

### 2️⃣ 更新 LINE Login Callback URL

1. 在同一个 Channel (2008269293)
2. 点击 **LINE Login** 标签
3. 点击 **Callback URL** 的 **Edit**
4. 添加新的 Callback URL：
   ```
   https://go.guimashan.org.tw/callback.html
   ```
5. **保留或移除 Replit URL**（建议保留用于测试）
6. 点击 **Update**

### 3️⃣ 验证 Webhook URL（不需修改）

Webhook URL 指向 Firebase Cloud Function，无需更改：
```
https://asia-east2-platform-bc783.cloudfunctions.net/lineMessagingWebhook
```

---

## 🔐 第三步：启用 Webhook 签名验证

部署到正式环境后，必须启用签名验证以确保安全性。

### 修改 Cloud Function 代码

编辑 `functions/src/messaging/index.js`：

**找到第 29-32 行**：
```javascript
// ⚠️ CRITICAL SECURITY: 生产环境必须启用签名验证
// const signature = req.headers['x-line-signature'];
// const isValid = validateSignature(req.body, signature, LINE_CHANNEL_SECRET);
// if (!isValid) {
```

**改为**：
```javascript
// ✅ 生产环境已启用签名验证
const signature = req.headers['x-line-signature'];
const isValid = validateSignature(req.body, signature, LINE_CHANNEL_SECRET);
if (!isValid) {
```

**找到第 39-41 行**：
```javascript
//   return;
// }
// logger.info('✅ Webhook 簽名驗證成功');
```

**改为**：
```javascript
  logger.error('❌ Webhook 簽名驗證失敗');
  res.status(401).send('Unauthorized');
  return;
}
logger.info('✅ Webhook 簽名驗證成功');
```

### 重新部署 Cloud Functions

```bash
cd functions
firebase deploy --only functions:lineMessagingWebhook --project platform-bc783
```

---

## ✅ 第四步：完整测试

### 测试 LIFF 签到功能

1. 在 LINE 中对话官方账号 `@495fdqrw`
2. 发送：「**奉香簽到**」
3. 点击「開始簽到」按钮
4. 选择巡邏點
5. 点击「開始 GPS 簽到」
6. 确认签到成功

### 测试 LINE Login 网页端

1. 在电脑浏览器打开：`https://go.guimashan.org.tw`
2. 点击「LINE 登入」
3. 使用 LINE 帐号授权登录
4. 确认跳转回网站并显示模组选单

### 测试 Webhook 消息触发

1. 在 LINE 中发送：「**神務**」
2. 应该收到：「神務功能開發中...」
3. 在 LINE 中发送：「**排班**」
4. 应该收到：「排班功能開發中...」

---

## 📊 部署检查清单

- [ ] Vercel 部署成功
- [ ] 自定义域名 `go.guimashan.org.tw` 配置完成
- [ ] LIFF Endpoint URL 已更新
- [ ] LINE Login Callback URL 已更新
- [ ] Webhook 签名验证已启用
- [ ] LIFF 签到功能测试通过
- [ ] LINE Login 登录功能测试通过
- [ ] Webhook 关键词触发测试通过

---

## 🎯 后续开发建议

### 1. 为其他模组创建独立 LIFF App

目前所有模组共用一个 LIFF App，建议为每个模组创建独立的 LIFF App：

- **奉香簽到**: `https://go.guimashan.org.tw/liff/checkin.html`
- **神務服務**: `https://go.guimashan.org.tw/liff/service.html`（待创建）
- **排班系統**: `https://go.guimashan.org.tw/liff/schedule.html`（待创建）

### 2. 开发神務服務模组

实现法会报名与服务管理功能。

### 3. 开发排班系統模组

实现志工排班与出勤统计功能。

### 4. 添加推送通知

使用 LINE Messaging API 发送重要通知给用户。

---

## 🆘 故障排除

### 问题：LIFF 无法打开
- 确认 LIFF Endpoint URL 已更新为 Vercel 域名
- 检查 HTTPS 是否正常工作

### 问题：LINE Login 回调失败
- 确认 Callback URL 已添加到 LINE Developers Console
- 检查浏览器控制台是否有错误

### 问题：Webhook 无响应
- 确认 Cloud Function 已部署
- 检查签名验证是否正确启用
- 查看 Firebase Console 的 Function Logs

---

## 📞 技术支持

如有问题，请查看：
- Firebase Console Logs
- Vercel Deployment Logs
- LINE Developers Console 配置
- 浏览器开发者工具控制台

---

**部署完成后，龜馬山 goLine 平台即正式上线！** 🎉
