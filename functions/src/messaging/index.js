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

// 關鍵詞快取（避免每次都查詢 Firestore）
let keywordsCache = null;
let keywordsCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 快取 5 分鐘

// LIFF App IDs（每個功能模組使用專屬 LIFF App）
const LIFF_IDS = {
  checkin: '2008269293-nYBm3JmV',  // 奉香簽到
  service: '2008269293-Nl2pZBpV',  // 神務服務
  schedule: '2008269293-N0wnqknr', // 排班系統
};

// LINE Bot SDK 簽名驗證方法已內建，不需要自己實作

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
  
  // 檢查別名
  if (keyword.aliases && keyword.aliases.length > 0) {
    for (const alias of keyword.aliases) {
      if (normalizedText === normalizeText(alias)) {
        return true;
      }
    }
  }
  
  // 部分匹配（包含）
  if (normalizedText.includes(normalizedKeyword)) {
    return true;
  }
  
  return false;
}

/**
 * 處理文字訊息
 */
async function handleTextMessage(text) {
  const originalText = text.trim();
  text = originalText.toLowerCase();

  // 幫助訊息（優先處理，避免被其他規則攔截）
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
            '• 「福田會」- 福田會入會\n\n' +
            '📋 平台功能：\n' +
            '• 「簽到」- 奉香簽到系統\n' +
            '• 「排班」- 排班系統\n' +
            '• 「幫助」- 顯示此訊息',
    };
  }

  // 忽略系統自動產生的訊息（包含 emoji 或特殊符號開頭）
  if (text.startsWith('✅') || text.startsWith('❌') || text.startsWith('⚠️')) {
    return null; // 不回覆
  }

  // === 動態關鍵詞比對 ===
  try {
    const keywords = await loadKeywords();
    
    // 依優先級排序後比對（高優先級優先）
    for (const keyword of keywords) {
      if (matchKeyword(originalText, keyword)) {
        logger.info(`關鍵詞匹配成功: ${keyword.keyword}`);
        
        // 根據 replyType 建立回覆
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
    logger.error('處理動態關鍵詞時發生錯誤:', error);
  }

  // === 硬編碼關鍵詞（作為後備）===
  
  // === Step 2: Checkin (checkin-76c77) 簽到相關 ===
  
  // 1. 奉香簽到
  if (text === '奉香簽到' || text === '奉香' || text === '打卡簽到') {
    return {
      type: 'template',
      altText: '開啟奉香簽到',
      template: {
        type: 'buttons',
        text: '🙏 奉香簽到系統',
        actions: [
          {
            type: 'uri',
            label: '開始簽到',
            uri: `https://liff.line.me/${LIFF_IDS.checkin}?liff.state=/liff/checkin/index.html`,
          },
        ],
      },
    };
  }

  // 2. 簽到管理
  if (text === '簽到管理' || text === '奉香管理' || text === '1111') {
    return {
      type: 'template',
      altText: '開啟簽到管理',
      template: {
        type: 'buttons',
        text: '📊 簽到管理系統',
        actions: [
          {
            type: 'uri',
            label: '進入管理',
            uri: `https://liff.line.me/${LIFF_IDS.checkin}?liff.state=/liff/checkin/manage/dashboard.html`,
          },
        ],
      },
    };
  }

  // === Step 3: Service (service-b9d4a) 神務相關 ===
  
  // 1. 龜馬山一點靈
  if (text.includes('龜馬山一點靈') || text.includes('線上點燈') || 
      text.includes('安太歲') || text.includes('元辰燈') || 
      text.includes('文昌燈') || text.includes('財利燈') || 
      text.includes('光明燈') || text.includes('點燈') ||
      text === 'dd' || text === 'DD') {
    return {
      type: 'template',
      altText: '龜馬山一點靈',
      template: {
        type: 'buttons',
        text: '🕯️ 龜馬山一點靈',
        actions: [
          {
            type: 'uri',
            label: '立即點燈',
            uri: `https://liff.line.me/${LIFF_IDS.service}?liff.state=/liff/service/DD.html`,
          },
        ],
      },
    };
  }

  // 2. 年斗法會
  if (text.includes('年斗法會') || text.includes('闔家年斗') || 
      text.includes('元辰年斗') || text.includes('紫微年斗') || 
      text.includes('事業年斗') || text.includes('年斗') ||
      text === 'nd' || text === 'ND') {
    return {
      type: 'template',
      altText: '年斗法會',
      template: {
        type: 'buttons',
        text: '🎊 年斗法會',
        actions: [
          {
            type: 'uri',
            label: '我要報名',
            uri: `https://liff.line.me/${LIFF_IDS.service}?liff.state=/liff/service/ND.html`,
          },
        ],
      },
    };
  }

  // 3. 禮斗法會
  if (text.includes('禮斗法會') || text.includes('闔家斗') || 
      text.includes('元辰斗') || text.includes('事業斗') || text.includes('禮斗') ||
      text === 'ld' || text === 'LD') {
    return {
      type: 'template',
      altText: '禮斗法會',
      template: {
        type: 'buttons',
        text: '⭐ 禮斗法會',
        actions: [
          {
            type: 'uri',
            label: '我要報名',
            uri: `https://liff.line.me/${LIFF_IDS.service}?liff.state=/liff/service/LD.html`,
          },
        ],
      },
    };
  }

  // 4. 中元法會
  if (text.includes('中元法會') || text.includes('中元') || text.includes('普渡') || 
      text.includes('超拔') || text.includes('歷代祖先') || text.includes('祖先') || 
      text.includes('冤親債主') || text.includes('嬰靈') || text.includes('地基主') ||
      text === 'zy' || text === 'ZY') {
    return {
      type: 'template',
      altText: '中元法會',
      template: {
        type: 'buttons',
        text: '🏮 中元法會',
        actions: [
          {
            type: 'uri',
            label: '我要報名',
            uri: `https://liff.line.me/${LIFF_IDS.service}?liff.state=/liff/service/ZY.html`,
          },
        ],
      },
    };
  }

  // 5. 普施法會
  if (text.includes('普施大法會') || text.includes('普施') || 
      text.includes('普桌') || text.includes('白米') || text.includes('隨喜功德') ||
      text === 'ps' || text === 'PS') {
    return {
      type: 'template',
      altText: '普施法會',
      template: {
        type: 'buttons',
        text: '🙏 普施法會',
        actions: [
          {
            type: 'uri',
            label: '我要報名',
            uri: `https://liff.line.me/${LIFF_IDS.service}?liff.state=/liff/service/PS.html`,
          },
        ],
      },
    };
  }

  // 6. 秋祭法會
  if (text.includes('秋祭法會') || text.includes('秋祭') || text.includes('文昌帝君拱斗') ||
      text === 'qj' || text === 'QJ') {
    return {
      type: 'template',
      altText: '秋祭法會',
      template: {
        type: 'buttons',
        text: '🍂 秋祭法會',
        actions: [
          {
            type: 'uri',
            label: '我要報名',
            uri: `https://liff.line.me/${LIFF_IDS.service}?liff.state=/liff/service/QJ.html`,
          },
        ],
      },
    };
  }

  // 7. 建宮廟款
  if (text.includes('建宮廟款') || text.includes('青石板') || 
      text.includes('鋼筋') || text.includes('水泥') || text.includes('琉璃瓦') ||
      text === 'bg' || text === 'BG') {
    return {
      type: 'template',
      altText: '建宮廟款',
      template: {
        type: 'buttons',
        text: '🏛️ 建宮廟款',
        actions: [
          {
            type: 'uri',
            label: '我要奉獻',
            uri: `https://liff.line.me/${LIFF_IDS.service}?liff.state=/liff/service/BG.html`,
          },
        ],
      },
    };
  }

  // 8. 添香油
  if (text.includes('添香油') || text.includes('香油') ||
      text === 'xy' || text === 'XY') {
    return {
      type: 'template',
      altText: '添香油',
      template: {
        type: 'buttons',
        text: '🪔 添香油',
        actions: [
          {
            type: 'uri',
            label: '我要奉獻',
            uri: `https://liff.line.me/${LIFF_IDS.service}?liff.state=/liff/service/XY.html`,
          },
        ],
      },
    };
  }

  // 9. 福田會
  if (text.includes('福田會') || text.includes('福田') ||
      text === 'ft' || text === 'FT') {
    return {
      type: 'template',
      altText: '福田會入會',
      template: {
        type: 'buttons',
        text: '🌟 福田會入會',
        actions: [
          {
            type: 'uri',
            label: '了解詳情',
            uri: `https://liff.line.me/${LIFF_IDS.service}?liff.state=/liff/service/ft.html`,
          },
        ],
      },
    };
  }

  // 10. 神務服務
  if (text === '神務服務' || text === '神務' || 
      text === 'se' || text === 'SE') {
    return {
      type: 'template',
      altText: '開啟神務服務',
      template: {
        type: 'buttons',
        text: '⚡ 神務服務系統',
        actions: [
          {
            type: 'uri',
            label: '進入服務',
            uri: `https://liff.line.me/${LIFF_IDS.service}?liff.state=/liff/service/index.html`,
          },
        ],
      },
    };
  }

  // 11. 神務管理
  if (text === '神務管理' || text === '2222') {
    return {
      type: 'template',
      altText: '開啟神務管理',
      template: {
        type: 'buttons',
        text: '⚙️ 神務管理系統',
        actions: [
          {
            type: 'uri',
            label: '進入管理',
            uri: `https://liff.line.me/${LIFF_IDS.service}?liff.state=/liff/service/manage/index.html`,
          },
        ],
      },
    };
  }

  // === Step 4: Schedule (schedule-48ff9) 排班相關（還沒有開發）===
  
  // 1. 排班管理（優先匹配，避免被「排班」攔截）
  if (text === '排班管理' || text === '3333') {
    return {
      type: 'template',
      altText: '開啟排班管理',
      template: {
        type: 'buttons',
        text: '⚙️ 排班管理系統',
        actions: [
          {
            type: 'uri',
            label: '進入管理',
            uri: `https://liff.line.me/${LIFF_IDS.schedule}?liff.state=/liff/schedule/manage/dashboard.html`,
          },
        ],
      },
    };
  }

  // 2. 本週班表
  if (text.includes('本週班表') || text.includes('週班表') ||
      text === 'we' || text === 'WE') {
    return {
      type: 'template',
      altText: '本週班表',
      template: {
        type: 'buttons',
        text: '📅 本週班表',
        actions: [
          {
            type: 'uri',
            label: '查看本週',
            uri: `https://liff.line.me/${LIFF_IDS.schedule}?liff.state=/liff/schedule/week.html`,
          },
        ],
      },
    };
  }

  // 3. 本月班表
  if (text.includes('本月班表') || text.includes('月班表') ||
      text === 'mo' || text === 'MO') {
    return {
      type: 'template',
      altText: '本月班表',
      template: {
        type: 'buttons',
        text: '📆 本月班表',
        actions: [
          {
            type: 'uri',
            label: '查看本月',
            uri: `https://liff.line.me/${LIFF_IDS.schedule}?liff.state=/liff/schedule/month.html`,
          },
        ],
      },
    };
  }

  // 4. 班表
  if (text.includes('組班表') || text === '班表' ||
      text === 'ro' || text === 'RO') {
    return {
      type: 'template',
      altText: '班表',
      template: {
        type: 'buttons',
        text: '📋 班表系統',
        actions: [
          {
            type: 'uri',
            label: '查看班表',
            uri: `https://liff.line.me/${LIFF_IDS.schedule}?liff.state=/liff/schedule/roste.html`,
          },
        ],
      },
    };
  }

  // 5. 志工排班（最後匹配，避免攔截其他關鍵字）
  if (text.includes('志工排班') || text.includes('工作人員') || text.includes('排班') ||
      text === 'sc' || text === 'SC' || text === 'ss') {
    return {
      type: 'template',
      altText: '志工排班',
      template: {
        type: 'buttons',
        text: '👥 志工排班系統',
        actions: [
          {
            type: 'uri',
            label: '進入排班',
            uri: `https://liff.line.me/${LIFF_IDS.schedule}?liff.state=/liff/schedule/schedule.html`,
          },
        ],
      },
    };
  }

  // 預設回覆：打開 LIFF 主入口，顯示功能選單
  return {
    type: 'template',
    altText: '龜馬山 goLine 平台',
    template: {
      type: 'buttons',
      text: '請選擇服務',
      actions: [
        {
          type: 'uri',
          label: '開啟平台',
          uri: `https://liff.line.me/${LIFF_IDS.service}?liff.state=/liff/index.html`,
        },
      ],
    },
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

    // 驗證 LINE webhook 簽名（使用 rawBody）
    try {
      const body = req.rawBody.toString('utf-8');
      const hash = crypto
          .createHmac('sha256', channelSecret.value())
          .update(body)
          .digest('base64');

      if (hash !== signature) {
        logger.error('簽名驗證失敗');
        logger.error('Expected:', hash);
        logger.error('Received:', signature);
        res.status(401).send('Unauthorized: Invalid signature');
        return;
      }

      logger.info('✅ 簽名驗證成功');
    } catch (error) {
      logger.error('簽名驗證過程發生錯誤:', error);
      res.status(500).send('Internal Server Error: Signature verification failed');
      return;
    }

    // 處理事件
    const events = req.body.events || [];

    // LINE 驗證請求會發送空事件列表
    if (events.length === 0) {
      logger.info('收到空事件列表（LINE 驗證請求）');
      res.status(200).send('OK');
      return;
    }

    // 處理每個事件
    for (const event of events) {
      logger.info('處理事件:', {
        type: event.type,
        source: event.source,
      });

      // 處理文字訊息事件
      if (event.type === 'message' && event.message.type === 'text') {
        const replyToken = event.replyToken;
        const userMessage = event.message.text;

        logger.info('收到文字訊息:', userMessage);

        // 產生回覆訊息
        const replyContent = await handleTextMessage(userMessage);

        // 只在有回覆內容時才回覆
        if (replyContent) {
          await replyMessage(
              replyToken,
              [replyContent],
              accessToken,
          );
          logger.info('已回覆訊息');
        } else {
          logger.info('無需回覆此訊息');
        }
      }

      // 處理加入好友事件
      if (event.type === 'follow') {
        const replyToken = event.replyToken;

        logger.info('用戶加入好友');

        await replyMessage(
            replyToken,
            [
              {
                type: 'text',
                text: '歡迎使用龜馬山 goLine 平台！\n\n' +
                      '您可以輸入以下指令：\n' +
                      '• 「奉香簽到」- 開啟簽到系統\n' +
                      '• 「神務服務」- 開啟服務系統\n' +
                      '• 「排班系統」- 開啟排班系統\n' +
                      '• 「幫助」- 顯示說明',
              },
            ],
            accessToken,
        );
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    logger.error('處理 Webhook 失敗:', error);
    logger.error('Error stack:', error.stack);
    res.status(500).send('Internal Server Error');
  }
}

// 導出 Cloud Function
exports.lineWebhook = onRequest(
    {
      region: 'asia-east2',
      secrets: [lineChannelSecret, lineChannelAccessToken],
      cors: true,
    },
    async (req, res) => {
      try {
        // GET 請求用於健康檢查
        if (req.method === 'GET') {
          res.status(200).json({
            status: 'ok',
            message: 'LINE Webhook is running',
            timestamp: new Date().toISOString(),
          });
          return;
        }

        // POST 請求處理 Webhook
        await handleWebhook(
            req,
            res,
            lineChannelSecret.value(),
            lineChannelAccessToken.value(),
        );
      } catch (error) {
        logger.error('Cloud Function 錯誤:', error);
        res.status(500).json({
          error: 'Internal Server Error',
          message: error.message,
        });
      }
    },
);
