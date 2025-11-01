# LINE Webhook 调试指南

## 当前状态

### ✅ 已完成
- LIFF页面已创建并配置好 LIFF ID  
- LINE Messaging API Secrets 已设置到 Firebase
- lineWebhook Cloud Function 已部署

### ⚠️ 待解决问题
**签名验证失败（401 Unauthorized）**

## 问题分析

LINE Webhook 签名验证需要使用**完全相同的原始请求体**来计算 HMAC-SHA256 签名。

Firebase Functions v2 会自动解析 JSON 请求体，导致：
1. 原始请求体无法直接访问
2. 使用 `JSON.stringify(req.body)` 重新序列化会改变格式（空格、换行符等）
3. 签名验证失败

## 解决方案选项

### 方案 A：使用 @line/bot-sdk（推荐）

安装 LINE 官方 SDK：
```bash
cd functions
npm install @line/bot-sdk
```

修改代码使用 SDK 的签名验证：
```javascript
const line = require('@line/bot-sdk');

const config = {
  channelSecret: lineChannelSecret.value(),
  channelAccessToken: lineChannelAccessToken.value()
};

const client = new line.Client(config);

// 在请求处理中
if (!line.validateSignature(bodyString, channelSecret, signature)) {
  res.status(401).send('Invalid signature');
  return;
}
```

### 方案 B：暂时跳过签名验证（仅用于测试）

在测试期间，可以临时注释掉签名验证：

```javascript
// 暂时跳过验证以测试其他功能
// const isValid = validateSignature(bodyString, signature, channelSecret);
// if (!isValid) {
//   res.status(401).send('Unauthorized');
//   return;
// }
logger.warn('⚠️  签名验证已禁用（仅用于测试）');
```

**警告**: 生产环境必须启用签名验证！

### 方案 C：修改 Firebase Functions 配置

使用自定义中间件保存原始请求体：

```javascript
exports.lineWebhook = onRequest({
  region: 'asia-east2',
  secrets: [lineChannelSecret, lineChannelAccessToken],
  cors: true,
  // 禁用自动 JSON 解析
  bodyParser: false
}, async (req, res) => {
  // 手动解析并保存原始体
  const rawBody = await getRawBody(req);
  const body = JSON.parse(rawBody);
  
  // 使用 rawBody 验证签名
  const isValid = validateSignature(rawBody, signature, channelSecret);
});
```

## 下一步

### 选项 1：快速测试（推荐）

1. 暂时禁用签名验证
2. 在 LINE Console 再次点击 Verify
3. 如果成功（200），说明其他部分正常
4. 然后再解决签名问题

### 选项 2：使用官方 SDK

1. 安装 `@line/bot-sdk`
2. 使用 SDK 的签名验证方法
3. 重新部署并测试

## 测试步骤

1. **部署最新代码**
   ```bash
   cd functions
   firebase deploy --only functions:lineWebhook --project platform-bc783
   ```

2. **在 LINE Console 测试**
   - Messaging API → Webhook settings
   - 点击 Verify 按钮

3. **查看日志**
   - 访问 [Firebase Console](https://console.firebase.google.com/project/platform-bc783/functions/logs)
   - 选择 lineWebhook 函数
   - 查看错误详情

4. **健康检查**
   ```bash
   curl https://linewebhook-4yprhpbawa-df.a.run.app
   ```
   应该返回 200 OK

## 快速修复建议

由于签名验证问题较复杂，建议：

1. **立即行动**: 安装并使用 LINE Bot SDK
2. **测试验证**: 确保 Webhook 能通过 LINE 验证
3. **继续开发**: 完成其他功能测试

---

**需要帮助?**

告诉我您想用哪个方案，我会立即实施并测试！
