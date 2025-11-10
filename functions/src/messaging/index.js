/**
 * LINE Messaging API Webhook 處理
 * 處理來自 LINE 官方帳號的用戶訊息，並回覆 LIFF App 連結
 */

const {onRequest} = require('firebase-functions/v2/https');
const {defineSecret} = require('firebase-functions/params');
const {logger} = require('firebase-functions');
const line = require('@line/bot-sdk');
const express = require('express');
const admin = require('firebase-admin');
const crypto = require('crypto');

// LINE Messaging API 憑證 (需要在 Firebase Console 設定)
const lineChannelSecret = defineSecret('LINE_MESSAGING_CHANNEL_SECRET');
const lineChannelAccessToken = defineSecret('LINE_MESSAGING_ACCESS_TOKEN');

// 導入共享的關鍵字定義（用於硬編碼後備）
const { KEYWORDS, buildLiffUrl } = require('../shared/keywords');

// 關鍵詞快取（避免每次都查詢 Firestore）
let keywordsCache = null;
let keywordsCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 快取 5 分鐘

// 後備使用計數器（用於監控 Firestore 健康狀況）
let fallbackUsageCount = 0;

/**
 * 回覆訊息給用戶
 */
async function replyMessage(replyToken, messages, accessToken) {
  const response = await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      replyToken: replyToken,
      messages: messages,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error('回覆訊息失敗:', error);
    throw new Error('Failed to reply message');
  }

  return await response.json();
}

/**
 * 載入關鍵詞（帶快取）
 */
async function loadKeywords() {
  const now = Date.now();
  
  // 如果快取有效，直接返回
  if (keywordsCache && (now - keywordsCacheTime < CACHE_TTL)) {
    return keywordsCache;
  }
  
  try {
    const snapshot = await admin.firestore()
        .collection('lineKeywordMappings')
        .where('enabled', '==', true)
        .orderBy('priority', 'desc')
        .get();
    
    const keywords = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      keywords.push({
        id: doc.id,
        ...data,
      });
    });
    
    keywordsCache = keywords;
    keywordsCacheTime = now;
    
    logger.info(`已載入 ${keywords.length} 個啟用的關鍵詞`);
    return keywords;
  } catch (error) {
    logger.error('載入關鍵詞失敗:', error);
    return [];
  }
}

/**
 * 正規化文字（移除空白、轉小寫）
 */
function normalizeText(text) {
  return text.trim().toLowerCase().replace(/\s+/g, '');
}

/**
 * 檢查文字是否符合關鍵詞
 */
function matchKeyword(text, keyword) {
  const normalizedText = normalizeText(text);
  const normalizedKeyword = normalizeText(keyword.keyword);
  
  // 精確匹配關鍵詞
  if (normalizedText === normalizedKeyword) {
    return true;
  }
  
  // 檢查別名（精確匹配）
  if (keyword.aliases && keyword.aliases.length > 0) {
    for (const alias of keyword.aliases) {
      if (normalizedText === normalizeText(alias)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * 處理文字訊息
 */
async function handleTextMessage(text) {
  const originalText = text.trim();
  text = originalText.toLowerCase();

  // 幫助訊息（優先處理）
  if (text === '幫助' || text === 'help' || text === '?' || text === '指令') {
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
            '• 「幫助」- 顯示此訊息',
    };
  }

  // 忽略系統自動產生的訊息
  if (text.startsWith('✅') || text.startsWith('❌') || text.startsWith('⚠️')) {
    return null;
  }

  // === 1. Firestore 動態關鍵詞比對（優先）===
  try {
    const keywords = await loadKeywords();
    
    for (const keyword of keywords) {
      if (matchKeyword(originalText, keyword)) {
        logger.info(`Firestore 關鍵詞匹配: ${keyword.keyword}`);
        
        if (keyword.replyType === 'template' && keyword.liffUrl) {
          return {
            type: 'template',
            altText: keyword.replyPayload?.altText || keyword.keyword,
            template: {
              type: 'buttons',
              text: keyword.replyPayload?.text || keyword.keyword,
              actions: [
                {
                  type: 'uri',
                  label: keyword.replyPayload?.label || '立即開啟',
                  uri: keyword.liffUrl,
                },
              ],
            },
          };
        } else if (keyword.replyType === 'text' && keyword.replyPayload?.text) {
          return {
            type: 'text',
            text: keyword.replyPayload.text,
          };
        }
      }
    }
  } catch (error) {
    logger.error('Firestore 查詢失敗，切換至硬編碼後備:', error);
  }

  // === 2. 硬編碼後備系統（使用共享模組）===
  try {
    for (const keyword of KEYWORDS) {
      // 檢查主關鍵字
      if (normalizeText(originalText) === normalizeText(keyword.keyword)) {
        fallbackUsageCount++;
        logger.warn(`使用硬編碼後備: ${keyword.keyword} (計數: ${fallbackUsageCount})`);
        
        const liffUrl = buildLiffUrl(keyword);
        return {
          type: 'template',
          altText: keyword.replyPayload.altText,
          template: {
            type: 'buttons',
            text: keyword.replyPayload.text,
            actions: [
              {
                type: 'uri',
                label: keyword.replyPayload.label,
                uri: liffUrl,
              },
            ],
          },
        };
      }
      
      // 檢查別名
      if (keyword.aliases && keyword.aliases.length > 0) {
        for (const alias of keyword.aliases) {
          if (normalizeText(originalText) === normalizeText(alias)) {
            fallbackUsageCount++;
            logger.warn(`使用硬編碼後備別名: ${alias} → ${keyword.keyword} (計數: ${fallbackUsageCount})`);
            
            const liffUrl = buildLiffUrl(keyword);
            return {
              type: 'template',
              altText: keyword.replyPayload.altText,
              template: {
                type: 'buttons',
                text: keyword.replyPayload.text,
                actions: [
                  {
                    type: 'uri',
                    label: keyword.replyPayload.label,
                    uri: liffUrl,
                  },
                ],
              },
            };
          }
        }
      }
    }
  } catch (error) {
    logger.error('硬編碼後備處理失敗:', error);
  }

  // === 3. 預設回覆 ===
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
 * LINE Messaging API Webhook 處理器
 */
async function handleWebhook(req, res, channelSecret, accessToken) {
  try {
    logger.info('收到 Webhook 請求');

    // 只接受 POST 請求
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    // 獲取簽名
    const signature = req.headers['x-line-signature'];

    if (!signature) {
      logger.error('缺少 x-line-signature header');
      res.status(401).send('Unauthorized: Missing signature');
      return;
    }

    // 驗證 LINE webhook 簽名
    try {
      if (!channelSecret) {
        logger.error('Channel Secret 未設定');
        res.status(500).send('Internal Server Error: Missing channel secret');
        return;
      }

      const body = req.rawBody.toString('utf-8');
      const hash = crypto
          .createHmac('sha256', channelSecret)
          .update(body)
          .digest('base64');

      if (hash !== signature) {
        logger.error('簽名驗證失敗');
        res.status(401).send('Unauthorized: Invalid signature');
        return;
      }
    } catch (error) {
      logger.error('簽名驗證錯誤:', error);
      res.status(500).send('Internal Server Error');
      return;
    }

    // 解析請求內容
    const events = req.body.events || [];
    logger.info(`收到 ${events.length} 個事件`);

    // 處理每個事件
    for (const event of events) {
      try {
        logger.info('事件類型:', event.type);

        // 只處理訊息事件
        if (event.type === 'message') {
          const message = event.message;
          logger.info('訊息類型:', message.type);

          // 只處理文字訊息
          if (message.type === 'text') {
            const userMessage = message.text;
            logger.info('用戶訊息:', userMessage);

            // 處理訊息並取得回覆
            const replyMsg = await handleTextMessage(userMessage);

            if (replyMsg) {
              // 回覆訊息
              await replyMessage(event.replyToken, [replyMsg], accessToken);
              logger.info('已回覆訊息');
            } else {
              logger.info('無需回覆');
            }
          }
        }
      } catch (error) {
        logger.error('處理事件時發生錯誤:', error);
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    logger.error('Webhook 處理失敗:', error);
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
      cors: true,
    },
    async (req, res) => {
      const channelSecret = lineChannelSecret.value();
      const accessToken = lineChannelAccessToken.value();

      await handleWebhook(req, res, channelSecret, accessToken);
    },
);
