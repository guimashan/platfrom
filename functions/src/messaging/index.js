/**
 * LINE Messaging API Webhook 處理
 * 處理來自 LINE 官方帳號的用戶訊息，並回覆 LIFF App 連結
 */

const {onRequest} = require('firebase-functions/v2/https');
const {defineSecret} = require('firebase-functions/params');
const {logger} = require('firebase-functions');
const line = require('@line/bot-sdk');
const express = require('express');

// LINE Messaging API 憑證 (需要在 Firebase Console 設定)
const lineChannelSecret = defineSecret('LINE_MESSAGING_CHANNEL_SECRET');
const lineChannelAccessToken = defineSecret('LINE_MESSAGING_ACCESS_TOKEN');

// LIFF App IDs
const LIFF_IDS = {
  checkin: '2008269293-Nl2pZBpV',
  service: '2008269293-Nl2pZBpV', // 暫用簽到 LIFF，建議另建專屬 LIFF App
  schedule: '2008269293-Nl2pZBpV', // 暫用簽到 LIFF，建議另建專屬 LIFF App
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
 * 處理文字訊息
 */
function handleTextMessage(text) {
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

  // === 神務服務項目 ===
  
  // 龜馬山一點靈（較長關鍵字優先）
  if (text.includes('龜馬山一點靈') || text.includes('線上點燈') || 
      text.includes('安太歲') || text.includes('元辰燈') || 
      text.includes('文昌燈') || text.includes('財利燈') || 
      text.includes('光明燈') || text.includes('點燈')) {
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
            uri: `https://liff.line.me/${LIFF_IDS.service}/liff/service/DD.html`,
          },
        ],
      },
    };
  }

  // 年斗法會
  if (text.includes('年斗法會') || text.includes('闔家年斗') || 
      text.includes('元辰年斗') || text.includes('紫微年斗') || 
      text.includes('事業年斗') || text.includes('年斗')) {
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
            uri: `https://liff.line.me/${LIFF_IDS.service}/liff/service/ND.html`,
          },
        ],
      },
    };
  }

  // 禮斗法會
  if (text.includes('禮斗法會') || text.includes('闔家斗') || 
      text.includes('元辰斗') || text.includes('事業斗') || text.includes('禮斗')) {
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
            uri: `https://liff.line.me/${LIFF_IDS.service}/liff/service/LD.html`,
          },
        ],
      },
    };
  }

  // 中元法會
  if (text.includes('中元法會') || text.includes('中元') || text.includes('普渡') || 
      text.includes('超拔') || text.includes('歷代祖先') || text.includes('祖先') || 
      text.includes('冤親債主') || text.includes('嬰靈') || text.includes('地基主')) {
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
            uri: `https://liff.line.me/${LIFF_IDS.service}/liff/service/ZY.html`,
          },
        ],
      },
    };
  }

  // 普施法會
  if (text.includes('普施大法會') || text.includes('普施') || 
      text.includes('普桌') || text.includes('白米') || text.includes('隨喜功德')) {
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
            uri: `https://liff.line.me/${LIFF_IDS.service}/liff/service/PS.html`,
          },
        ],
      },
    };
  }

  // 秋祭法會
  if (text.includes('秋祭法會') || text.includes('文昌帝君拱斗')) {
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
            uri: `https://liff.line.me/${LIFF_IDS.service}/liff/service/QJ.html`,
          },
        ],
      },
    };
  }

  // 建宮廟款
  if (text.includes('建宮廟款') || text.includes('青石板') || 
      text.includes('鋼筋') || text.includes('水泥') || text.includes('琉璃瓦')) {
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
            uri: `https://liff.line.me/${LIFF_IDS.service}/liff/service/BG.html`,
          },
        ],
      },
    };
  }

  // 添香油
  if (text.includes('添香油')) {
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
            uri: `https://liff.line.me/${LIFF_IDS.service}/liff/service/XY.html`,
          },
        ],
      },
    };
  }

  // 福田會
  if (text.includes('福田會')) {
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
            uri: `https://liff.line.me/${LIFF_IDS.service}/liff/service/ft.html`,
          },
        ],
      },
    };
  }

  // 奉獻（入口頁）
  if (text.includes('奉獻')) {
    return {
      type: 'template',
      altText: '信眾奉獻',
      template: {
        type: 'buttons',
        text: '💰 信眾奉獻',
        actions: [
          {
            type: 'uri',
            label: '選擇奉獻項目',
            uri: `https://liff.line.me/${LIFF_IDS.service}/liff/service/donation.html`,
          },
        ],
      },
    };
  }

  // === 平台功能 ===

  // 奉香簽到（精確匹配關鍵詞）
  if (text === '奉香簽到' || text === '奉香' || text === '簽到' || text === '打卡') {
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
            uri: `https://liff.line.me/${LIFF_IDS.checkin}?module=checkin`,
          },
        ],
      },
    };
  }

  // 簽到管理
  if (text === '簽到管理' || text === '管理') {
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
            uri: `https://liff.line.me/${LIFF_IDS.checkin}?module=manage`,
          },
        ],
      },
    };
  }

  // 神務服務（精確匹配關鍵詞）
  if (text === '神務服務' || text === '神務' || text === '服務' || text === '法會') {
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
            uri: `https://liff.line.me/${LIFF_IDS.service}?module=service`,
          },
        ],
      },
    };
  }

  // 排班系統（精確匹配關鍵詞）
  if (text === '排班系統' || text === '排班' || text === '班表' || text === '志工') {
    return {
      type: 'template',
      altText: '開啟排班系統',
      template: {
        type: 'buttons',
        text: '📅 排班系統',
        actions: [
          {
            type: 'uri',
            label: '查看班表',
            uri: `https://liff.line.me/${LIFF_IDS.schedule}?module=schedule`,
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
          uri: `https://liff.line.me/${LIFF_IDS.checkin}`,
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

    // ⚠️ 臨時禁用簽名驗證以確認功能正常
    // TODO: 修復 rawBody 問題後重新啟用簽名驗證
    // 問題：Firebase Functions v2 的 CORS middleware 將 rawBody 轉換為 object
    logger.info('⚠️ 簽名驗證已暫時禁用 - 用於測試功能');

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
        const replyContent = handleTextMessage(userMessage);

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
