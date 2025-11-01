/**
 * LINE Messaging API Webhook 處理
 * 處理來自 LINE 官方帳號的用戶訊息，並回覆 LIFF App 連結
 */

const {onRequest} = require('firebase-functions/v2/https');
const {defineSecret} = require('firebase-functions/params');
const {logger} = require('firebase-functions');
const crypto = require('crypto');

// LINE Messaging API 憑證 (需要在 Firebase Console 設定)
const lineChannelSecret = defineSecret('LINE_MESSAGING_CHANNEL_SECRET');
const lineChannelAccessToken = defineSecret('LINE_MESSAGING_ACCESS_TOKEN');

// LIFF App IDs
const LIFF_IDS = {
  checkin: '2008269293-Nl2pZBpV',
  service: '2008269293-Nl2pZBpV', // 暫用簽到 LIFF，建議另建專屬 LIFF App
  schedule: '2008269293-Nl2pZBpV', // 暫用簽到 LIFF，建議另建專屬 LIFF App
};

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
exports.lineWebhook = onRequest(
    {
      region: 'asia-east2',
      secrets: [lineChannelSecret, lineChannelAccessToken],
    },
    async (req, res) => {
      // 只接受 POST 請求
      if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
      }

      try {
        // 驗證簽名
        const signature = req.headers['x-line-signature'];
        const body = JSON.stringify(req.body);

        if (!validateSignature(body, signature, lineChannelSecret.value())) {
          logger.error('Invalid signature');
          res.status(401).send('Unauthorized');
          return;
        }

        // 處理事件
        const events = req.body.events || [];

        for (const event of events) {
          logger.info('收到事件:', event);

          // 只處理訊息事件
          if (event.type === 'message' && event.message.type === 'text') {
            const replyToken = event.replyToken;
            const userMessage = event.message.text;

            // 產生回覆訊息
            const replyMessage_content = handleTextMessage(userMessage);

            // 回覆給用戶
            await replyMessage(
                replyToken,
                [replyMessage_content],
                lineChannelAccessToken.value(),
            );

            logger.info('已回覆訊息');
          }

          // 處理加入好友事件
          if (event.type === 'follow') {
            const replyToken = event.replyToken;

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
                lineChannelAccessToken.value(),
            );
          }
        }

        res.status(200).send('OK');
      } catch (error) {
        logger.error('處理 Webhook 失敗:', error);
        res.status(500).send('Internal Server Error');
      }
    },
);
