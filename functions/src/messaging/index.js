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
 * 取得 LIFF 應用名稱
 */
async function getLiffAppName(liffId) {
  try {
    const liffDoc = await admin.firestore().doc('line_bot_settings/liff_apps').get();
    if (liffDoc.exists()) {
      const apps = liffDoc.data().apps || [];
      const app = apps.find(a => a.liffId === liffId);
      return app ? app.name : null;
    }
    return null;
  } catch (error) {
    logger.error('取得 LIFF 名稱失敗:', error);
    return null;
  }
}

/**
 * 記錄訊息日誌到 Firestore
 */
async function logMessage(messageText, matchedKeyword, replyContent, status, error = null) {
  try {
    const liffApp = matchedKeyword && matchedKeyword.liffId 
      ? await getLiffAppName(matchedKeyword.liffId)
      : null;
    
    const logEntry = {
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      messageText,
      matchedKeyword: matchedKeyword ? matchedKeyword.keyword : null,
      liffId: matchedKeyword ? matchedKeyword.liffId : null,
      liffApp: liffApp,
      replyContent: replyContent ? JSON.stringify(replyContent) : null,
      status, // 'success', 'error', or 'ignored'
      error: error ? (error.stack || error.message || error.toString()) : null
    };
    
    // 寫入 Firestore，使用時間戳記作為文檔 ID
    const logId = `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await admin.firestore().collection('line_bot_logs').doc(logId).set(logEntry);
    
    logger.info('✅ 日誌已記錄:', logId);
  } catch (logError) {
    logger.error('❌ 記錄日誌失敗:', logError);
    // 不要因為日誌失敗而中斷主流程
  }
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
    const replyMessage = createLiffButtonMessage(matchedKeyword);
    return { message: replyMessage, matchedKeyword };
  }
  
  // 沒有匹配到關鍵字，回覆預設訊息
  const defaultMessage = {
    type: 'text',
    text: '🙏 感謝您聯繫龜馬山整合服務平台\n\n' +
          '請直接瀏覽我們的網站：\n' +
          'https://go.guimashan.org.tw\n\n' +
          '或聯繫服務人員獲取協助。'
  };
  
  return { message: defaultMessage, matchedKeyword: null };
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
    // 設置 CORS headers 允許前端訪問
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, x-line-signature');
    
    // 處理 OPTIONS 預檢請求
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }
    
    // 處理 GET 請求（用於健康檢查和測試）
    if (req.method === 'GET') {
      res.status(200).json({
        status: 'ok',
        message: 'LINE Messaging Webhook is running',
        timestamp: new Date().toISOString(),
        service: 'Guimashan LINE Bot'
      });
      return;
    }
    
    // 只接受 POST 進行實際的 Webhook 處理
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }
    
    // 驗證簽名
    const signature = req.headers['x-line-signature'];
    if (!signature) {
      logger.error('❌ 缺少簽名');
      await logMessage('(signature missing)', null, null, 'error', new Error('Missing signature header'));
      res.status(401).send('Unauthorized: Missing signature');
      return;
    }
    
    // 使用 rawBody（Buffer）進行簽名驗證，這是 LINE 發送的原始 payload
    if (!validateSignature(req.rawBody, signature, channelSecret)) {
      logger.error('❌ 簽名驗證失敗');
      await logMessage('(invalid signature)', null, null, 'error', new Error('Signature validation failed'));
      res.status(403).send('Forbidden: Invalid signature');
      return;
    }
    
    // 處理事件
    const events = req.body.events || [];
    
    for (const event of events) {
      logger.info('事件類型:', event.type);
      
      // 只處理文字訊息
      if (event.type === 'message' && event.message.type === 'text') {
        let result = null;
        try {
          result = await handleTextMessage(event.message.text);
          
          if (result && result.message && event.replyToken) {
            await replyMessage(event.replyToken, [result.message], accessToken);
            logger.info('✅ 已回覆訊息');
            
            // 在成功回覆後記錄日誌
            await logMessage(event.message.text, result.matchedKeyword, result.message, 'success');
          }
        } catch (error) {
          // 記錄錯誤日誌（包含關鍵字資訊如果有的話）
          logger.error('❌ 處理訊息失敗:', error);
          await logMessage(
            event.message.text, 
            result ? result.matchedKeyword : null, 
            null, 
            'error', 
            error
          );
        }
      } else {
        // 其他類型的事件，記錄但不回覆
        const eventType = event.type === 'message' ? `message/${event.message.type}` : event.type;
        logger.info(`忽略非文字訊息事件: ${eventType}`);
        await logMessage(
          `(${eventType} event)`, 
          null, 
          null, 
          'ignored', 
          null
        );
      }
    }
    
    res.status(200).send('OK');
  } catch (error) {
    logger.error('❌ Webhook 處理失敗:', error);
    await logMessage('(webhook handler error)', null, null, 'error', error);
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
