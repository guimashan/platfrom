/**
 * LINE Messaging API Webhook 處理
 * 處理來自 LINE 官方帳號的用戶訊息，並回覆 LIFF App 連結
 */

const {onRequest} = require('firebase-functions/v2/https');
const {defineSecret} = require('firebase-functions/params');
const {logger} = require('firebase-functions');
const line = require('@line/bot-sdk');

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
  text = text.trim().toLowerCase();

  // 奉香簽到
  if (text.includes('奉香') || text.includes('簽到') || text.includes('打卡')) {
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
            uri: `https://liff.line.me/${LIFF_IDS.checkin}`,
          },
        ],
      },
    };
  }

  // 神務服務
  if (text.includes('神務') || text.includes('服務') || text.includes('法會')) {
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
            uri: `https://liff.line.me/${LIFF_IDS.service}`,
          },
        ],
      },
    };
  }

  // 排班系統
  if (text.includes('排班') || text.includes('班表') || text.includes('志工')) {
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
            uri: `https://liff.line.me/${LIFF_IDS.schedule}`,
          },
        ],
      },
    };
  }

  // 幫助訊息
  if (text.includes('幫助') || text.includes('help') || text === '?') {
    return {
      type: 'text',
      text: '📱 龜馬山 goLine 平台\n\n' +
            '可用指令：\n' +
            '• 「奉香簽到」- 開啟簽到系統\n' +
            '• 「神務服務」- 開啟服務系統\n' +
            '• 「排班系統」- 開啟排班系統\n' +
            '• 「幫助」- 顯示此訊息',
    };
  }

  // 功能選單
  return {
    type: 'template',
    altText: '龜馬山 goLine 平台',
    template: {
      type: 'buttons',
      text: '請選擇服務',
      actions: [
        {
          type: 'uri',
          label: '🙏 奉香簽到',
          uri: `https://liff.line.me/${LIFF_IDS.checkin}`,
        },
        {
          type: 'uri',
          label: '⚡ 神務服務',
          uri: `https://liff.line.me/${LIFF_IDS.service}`,
        },
        {
          type: 'uri',
          label: '📅 排班系統',
          uri: `https://liff.line.me/${LIFF_IDS.schedule}`,
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

    // ✅ 生產環境已啟用簽名驗證
    // 使用原始請求體進行簽名驗證
    const bodyString = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body);
    try {
      const isValid = line.validateSignature(bodyString, channelSecret, signature);
      if (!isValid) {
        logger.error('❌ 簽名驗證失敗', {
          bodyLength: bodyString.length,
          signature: signature.substring(0, 20) + '...'
        });
        res.status(401).send('Unauthorized: Invalid signature');
        return;
      }
    } catch (error) {
      logger.error('❌ 簽名驗證錯誤:', error);
      res.status(401).send('Unauthorized: Signature validation error');
      return;
    }
    logger.info('✅ Webhook 簽名驗證成功');

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

        // 回覆給用戶
        await replyMessage(
            replyToken,
            [replyContent],
            accessToken,
        );

        logger.info('已回覆訊息');
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
