/**
 * LINE Messaging API Webhook - 簡化版本
 * 
 * 功能：接收 LINE 訊息並回覆固定的服務資訊
 * 註：關鍵字自動回覆功能已停用（2025-11-10）
 */

const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { logger } = require('firebase-functions');
const crypto = require('crypto');

// LINE Messaging API 密鑰
const lineChannelSecret = defineSecret('LINE_MESSAGING_CHANNEL_SECRET');
const lineChannelAccessToken = defineSecret('LINE_MESSAGING_ACCESS_TOKEN');

/**
 * 處理文字訊息
 */
function handleTextMessage(text) {
  logger.info(`收到訊息: ${text}`);
  
  return {
    type: 'text',
    text: '🙏 感謝您聯繫龜馬山整合服務平台\n\n' +
          '請直接瀏覽我們的網站：\n' +
          'https://go.guimashan.org.tw\n\n' +
          '或聯繫服務人員獲取協助。'
  };
}

/**
 * 回覆訊息給用戶
 */
async function replyMessage(replyToken, messages, accessToken) {
  const response = await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      replyToken,
      messages
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    logger.error('❌ 回覆失敗:', error);
    throw new Error('Failed to reply message');
  }
  
  return await response.json();
}

/**
 * 驗證 LINE Webhook 簽名
 */
function validateSignature(body, signature, channelSecret) {
  const hash = crypto
    .createHmac('sha256', channelSecret)
    .update(body)
    .digest('base64');
  
  return hash === signature;
}

/**
 * Webhook 處理器
 */
async function handleWebhook(req, res, channelSecret, accessToken) {
  try {
    // 只接受 POST
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }
    
    // 驗證簽名
    const signature = req.headers['x-line-signature'];
    if (!signature) {
      logger.error('❌ 缺少簽名');
      res.status(401).send('Unauthorized: Missing signature');
      return;
    }
    
    const bodyString = JSON.stringify(req.body);
    if (!validateSignature(bodyString, signature, channelSecret)) {
      logger.error('❌ 簽名驗證失敗');
      res.status(403).send('Forbidden: Invalid signature');
      return;
    }
    
    // 處理事件
    const events = req.body.events || [];
    
    for (const event of events) {
      logger.info('事件類型:', event.type);
      
      // 只處理文字訊息
      if (event.type === 'message' && event.message.type === 'text') {
        const message = handleTextMessage(event.message.text);
        
        if (message && event.replyToken) {
          await replyMessage(event.replyToken, [message], accessToken);
          logger.info('✅ 已回覆訊息');
        }
      } else {
        // 其他類型的事件，記錄但不回覆
        logger.info(`忽略非文字訊息事件: ${event.type}`);
      }
    }
    
    res.status(200).send('OK');
  } catch (error) {
    logger.error('❌ Webhook 處理失敗:', error);
    res.status(500).send('Internal Server Error');
  }
}

/**
 * LINE Messaging API Webhook
 */
exports.lineMessaging = onRequest({
  secrets: [lineChannelSecret, lineChannelAccessToken],
  region: 'asia-east1',
  timeoutSeconds: 60,
  memory: '256MiB'
}, async (req, res) => {
  const channelSecret = lineChannelSecret.value();
  const accessToken = lineChannelAccessToken.value();
  
  if (!channelSecret || !accessToken) {
    logger.error('❌ 缺少 LINE 密鑰');
    res.status(500).send('Server configuration error');
    return;
  }
  
  await handleWebhook(req, res, channelSecret, accessToken);
});
