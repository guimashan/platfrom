/**
 * LINE Messaging API Webhook - 簡化版（移除 LIFF 功能）
 * 
 * 功能：
 * - 接收 LINE 訊息
 * - 驗證 Webhook 簽名
 * - 回覆靜態訊息
 * 
 * 注意：LIFF 關鍵字功能已移除，如需重新啟用請先設定 LIFF Apps
 */

const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const crypto = require('crypto');

// 初始化 Firebase Admin（只初始化一次）
if (admin.apps.length === 0) {
  admin.initializeApp();
}

// LINE Messaging API 密鑰
const lineChannelSecret = defineSecret('LINE_MESSAGING_CHANNEL_SECRET');
const lineChannelAccessToken = defineSecret('LINE_MESSAGING_ACCESS_TOKEN');

/**
 * 處理文字訊息
 */
async function handleTextMessage(text) {
  const userInput = text.trim().toLowerCase();
  
  // 幫助訊息
  if (userInput === '幫助' || userInput === 'help' || userInput === '?') {
    return {
      type: 'text',
      text: '📱 龜馬山 goLine 平台\n\n' +
            '歡迎使用龜馬山整合服務平台！\n\n' +
            '🙏 服務項目：\n' +
            '• 神務服務\n' +
            '• 福田會入會\n' +
            '• 奉香簽到\n\n' +
            '💡 LINE Bot 關鍵字功能正在維護中\n' +
            '請直接訪問網站：https://go.guimashan.org.tw'
    };
  }
  
  // 預設回覆
  return {
    type: 'text',
    text: '🙏 歡迎使用龜馬山 goLine 平台\n\n' +
          '目前 LINE Bot 關鍵字功能正在維護中。\n\n' +
          '請訪問我們的網站：\n' +
          'https://go.guimashan.org.tw\n\n' +
          '或輸入「幫助」查看更多資訊'
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
    
    const body = req.rawBody.toString('utf-8');
    if (!validateSignature(body, signature, channelSecret)) {
      logger.error('❌ 簽名驗證失敗');
      res.status(401).send('Unauthorized: Invalid signature');
      return;
    }
    
    // 處理事件
    const events = req.body.events || [];
    logger.info(`📥 收到 ${events.length} 個事件`);
    
    for (const event of events) {
      try {
        if (event.type === 'message' && event.message.type === 'text') {
          const userMessage = event.message.text;
          logger.info(`💬 用戶訊息: ${userMessage}`);
          
          const replyMsg = await handleTextMessage(userMessage);
          
          if (replyMsg) {
            await replyMessage(event.replyToken, [replyMsg], accessToken);
            logger.info('✅ 已回覆訊息');
          }
        } else {
          logger.info(`ℹ️  忽略非文字訊息: ${event.type}`);
        }
      } catch (error) {
        logger.error('❌ 處理事件失敗:', error);
      }
    }
    
    res.status(200).send('OK');
  } catch (error) {
    logger.error('❌ Webhook 處理失敗:', error);
    res.status(500).send('Internal Server Error');
  }
}

/**
 * LINE Messaging Webhook Function
 */
exports.lineMessaging = onRequest(
  {
    region: 'asia-east2',
    secrets: [lineChannelSecret, lineChannelAccessToken],
    cors: true,
  },
  async (req, res) => {
    await handleWebhook(
      req,
      res,
      lineChannelSecret.value(),
      lineChannelAccessToken.value()
    );
  }
);
