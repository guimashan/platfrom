/**
 * LINE Messaging API Webhook - 混合架構關鍵字系統
 * 
 * 3 層查詢機制：
 * 1. Firestore 動態關鍵字（優先，5分鐘快取）
 * 2. 硬編碼後備（使用共享模組 keywords.js）
 * 3. 預設說明訊息
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

// 導入共享的關鍵字定義（用於硬編碼後備）
const { KEYWORDS, buildLiffUrl } = require('../shared/keywords');

// Firestore 關鍵字快取（5 分鐘 TTL）
let keywordsCache = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

// 後備使用計數器（監控 Firestore 健康）
let fallbackCount = 0;

/**
 * 正規化文字（移除空白、轉小寫）
 */
function normalize(text) {
  return text.trim().toLowerCase().replace(/\s+/g, '');
}

/**
 * 載入 Firestore 關鍵字（帶快取）
 */
async function loadFirestoreKeywords() {
  const now = Date.now();
  
  // 快取有效，直接返回
  if (keywordsCache && (now - cacheTime < CACHE_TTL)) {
    return keywordsCache;
  }
  
  try {
    const snapshot = await admin.firestore()
      .collection('lineKeywordMappings')
      .where('enabled', '==', true)
      .orderBy('priority', 'desc')
      .get();
    
    const keywords = [];
    snapshot.forEach(doc => {
      keywords.push({ id: doc.id, ...doc.data() });
    });
    
    keywordsCache = keywords;
    cacheTime = now;
    
    logger.info(`✅ 載入 ${keywords.length} 個 Firestore 關鍵字（快取 5 分鐘）`);
    return keywords;
  } catch (error) {
    logger.error('❌ Firestore 載入失敗:', error);
    return [];
  }
}

/**
 * 匹配 Firestore 關鍵字
 */
function matchFirestoreKeyword(text, keyword) {
  const normalizedText = normalize(text);
  
  // 匹配主關鍵字
  if (normalizedText === normalize(keyword.keyword)) {
    return true;
  }
  
  // 匹配別名
  if (keyword.aliases && Array.isArray(keyword.aliases)) {
    for (const alias of keyword.aliases) {
      if (normalizedText === normalize(alias)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * 查詢 Firestore 關鍵字（第 1 層）
 */
async function queryFirestore(text) {
  try {
    const keywords = await loadFirestoreKeywords();
    
    for (const keyword of keywords) {
      if (matchFirestoreKeyword(text, keyword)) {
        logger.info(`✅ [Firestore] 匹配: ${keyword.keyword}`);
        
        if (keyword.replyType === 'template' && keyword.liffUrl) {
          return {
            type: 'template',
            altText: keyword.replyPayload?.altText || keyword.keyword,
            template: {
              type: 'buttons',
              text: keyword.replyPayload?.text || keyword.keyword,
              actions: [{
                type: 'uri',
                label: keyword.replyPayload?.label || '立即開啟',
                uri: keyword.liffUrl
              }]
            }
          };
        }
      }
    }
  } catch (error) {
    logger.error('❌ Firestore 查詢失敗:', error);
  }
  
  return null;
}

/**
 * 查詢硬編碼後備（第 2 層）
 */
function queryFallback(text) {
  const normalizedText = normalize(text);
  
  for (const keyword of KEYWORDS) {
    // 匹配主關鍵字
    if (normalizedText === normalize(keyword.keyword)) {
      fallbackCount++;
      logger.warn(`⚠️  [硬編碼後備] 匹配: ${keyword.keyword} (計數: ${fallbackCount})`);
      
      return {
        type: 'template',
        altText: keyword.replyPayload.altText,
        template: {
          type: 'buttons',
          text: keyword.replyPayload.text,
          actions: [{
            type: 'uri',
            label: keyword.replyPayload.label,
            uri: buildLiffUrl(keyword)
          }]
        }
      };
    }
    
    // 匹配別名
    if (keyword.aliases && Array.isArray(keyword.aliases)) {
      for (const alias of keyword.aliases) {
        if (normalizedText === normalize(alias)) {
          fallbackCount++;
          logger.warn(`⚠️  [硬編碼後備別名] ${alias} → ${keyword.keyword} (計數: ${fallbackCount})`);
          
          return {
            type: 'template',
            altText: keyword.replyPayload.altText,
            template: {
              type: 'buttons',
              text: keyword.replyPayload.text,
              actions: [{
                type: 'uri',
                label: keyword.replyPayload.label,
                uri: buildLiffUrl(keyword)
              }]
            }
          };
        }
      }
    }
  }
  
  return null;
}

/**
 * 處理文字訊息（3 層查詢）
 */
async function handleTextMessage(text) {
  const userInput = text.trim();
  const normalized = userInput.toLowerCase();
  
  // 幫助訊息（優先處理）
  if (normalized === '幫助' || normalized === 'help' || normalized === '?' || normalized === '指令') {
    return {
      type: 'text',
      text: '📱 龜馬山 goLine 平台\n\n' +
            '🙏 神務服務：\n' +
            '• 「點燈」- 龜馬山一點靈\n' +
            '• 「年斗」- 年斗法會\n' +
            '• 「禮斗」- 禮斗法會\n' +
            '• 「中元」- 中元法會\n' +
            '• 「普施」- 普施法會\n' +
            '• 「秋祭」- 秋祭法會\n\n' +
            '💰 奉獻項目：\n' +
            '• 「建宮廟款」- 建宮廟捐款\n' +
            '• 「添香油」- 添香油捐款\n' +
            '• 「福田會」- 福田會入會\n' +
            '• 「福田Young會」- 福田Young會\n' +
            '• 「企業團體」- 企業團體\n' +
            '• 「信眾個人」- 信眾個人\n\n' +
            '📋 平台功能：\n' +
            '• 「簽到」- 奉香簽到系統\n' +
            '• 「排班」- 排班系統\n' +
            '• 「幫助」- 顯示此訊息'
    };
  }
  
  // 忽略系統自動產生的訊息
  if (userInput.startsWith('✅') || userInput.startsWith('❌') || userInput.startsWith('⚠️')) {
    return null;
  }
  
  // === 第 1 層：Firestore 動態關鍵字 ===
  const firestoreResult = await queryFirestore(userInput);
  if (firestoreResult) {
    return firestoreResult;
  }
  
  // === 第 2 層：硬編碼後備 ===
  const fallbackResult = queryFallback(userInput);
  if (fallbackResult) {
    return fallbackResult;
  }
  
  // === 第 3 層：預設說明訊息 ===
  return {
    type: 'text',
    text: '🙏 歡迎使用龜馬山 goLine 平台\n\n' +
          '請輸入關鍵字查詢服務，例如：\n' +
          '• 點燈、年斗、禮斗、中元\n' +
          '• 簽到、排班\n' +
          '• 福田Young會、企業團體、信眾個人\n\n' +
          '輸入「幫助」查看完整功能列表'
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
 * Cloud Function 進入點
 */
exports.lineMessaging = onRequest(
  {
    region: 'asia-east2',
    secrets: [lineChannelSecret, lineChannelAccessToken],
    cors: true
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
