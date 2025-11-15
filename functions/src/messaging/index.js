/**
 * LINE Messaging API Webhook - 智能關鍵字回覆版本
 * 
 * 功能：接收 LINE 訊息，根據關鍵字回覆對應的 LIFF 應用
 * 更新日期：2025-11-15
 */

const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { logger } = require('firebase-functions');
const crypto = require('crypto');
const admin = require('firebase-admin');

// LINE Messaging API 密鑰
const lineChannelSecret = defineSecret('LINE_MESSAGING_CHANNEL_SECRET');
const lineChannelAccessToken = defineSecret('LINE_MESSAGING_ACCESS_TOKEN');

/**
 * 從 Firestore 載入關鍵字設定
 */
async function loadKeywords() {
  try {
    const doc = await admin.firestore().doc('line_bot_settings/keywords').get();
    if (doc.exists) {
      return doc.data();
    }
    return {};
  } catch (error) {
    logger.error('載入關鍵字設定失敗:', error);
    return {};
  }
}

/**
 * 匹配關鍵字
 */
function matchKeyword(text, keywords) {
  const normalizedText = text.trim().toLowerCase();
  
  for (const [key, config] of Object.entries(keywords)) {
    if (!config.enabled) continue;
    
    // 檢查主要關鍵字
    if (config.keyword.toLowerCase() === normalizedText) {
      return config;
    }
    
    // 檢查別名
    if (config.aliases && Array.isArray(config.aliases)) {
      if (config.aliases.some(alias => alias.toLowerCase() === normalizedText)) {
        return config;
      }
    }
  }
  
  return null;
}

/**
 * 建立 LIFF 按鈕訊息
 */
function createLiffButtonMessage(config) {
  const liffUrl = `https://liff.line.me/${config.liffId}`;
  
  return {
    type: 'template',
    altText: config.replyMessage,
    template: {
      type: 'buttons',
      text: config.replyMessage,
      actions: [
        {
          type: 'uri',
          label: config.buttonText || '開始使用',
          uri: liffUrl
        }
      ]
    }
  };
}

/**
 * 處理文字訊息
 */
async function handleTextMessage(text) {
  logger.info(`收到訊息: ${text}`);
  
  // 載入關鍵字設定
  const keywords = await loadKeywords();
  
  // 匹配關鍵字
  const matchedKeyword = matchKeyword(text, keywords);
  
  if (matchedKeyword) {
    logger.info(`匹配到關鍵字: ${matchedKeyword.keyword}`);
    return createLiffButtonMessage(matchedKeyword);
  }
  
  // 沒有匹配到關鍵字，回覆預設訊息
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
  
  // LINE API 成功回覆時返回空 body，所以只讀取 text
  const responseText = await response.text();
  logger.info('✅ LINE API 回應:', responseText || '(empty)');
  return responseText ? JSON.parse(responseText) : {};
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
    
    // 使用 rawBody（Buffer）進行簽名驗證，這是 LINE 發送的原始 payload
    if (!validateSignature(req.rawBody, signature, channelSecret)) {
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
        const message = await handleTextMessage(event.message.text);
        
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
