/**
 * Cloud Function：遷移關鍵詞到 Firestore
 * 將硬編碼關鍵詞一次性遷移到 Firestore
 */

const {onRequest} = require('firebase-functions/v2/https');
const {logger} = require('firebase-functions');
const admin = require('firebase-admin');

// LIFF App IDs（每個功能模組使用專屬 LIFF App）
const LIFF_IDS = {
  checkin: '2008269293-nYBm3JmV',  // 奉香簽到
  service: '2008269293-Nl2pZBpV',  // 神務服務
  schedule: '2008269293-N0wnqknr', // 排班系統
};

// 關鍵詞資料
const keywords = [
  // 幫助訊息
  {
    keyword: '幫助',
    aliases: ['help', '?', '指令'],
    priority: 100,
    replyType: 'text',
    replyPayload: {
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
    },
    description: '顯示系統幫助訊息',
  },

  // 神務服務項目
  {
    keyword: '點燈',
    aliases: ['龜馬山一點靈', '線上點燈', '安太歲', '元辰燈', '文昌燈', '財利燈', '光明燈'],
    liffUrl: `https://liff.line.me/${LIFF_IDS.service}?liff.state=/liff/service/DD.html`,
    priority: 90,
    replyType: 'template',
    replyPayload: {
      altText: '龜馬山一點靈',
      text: '🕯️ 龜馬山一點靈',
      label: '立即點燈',
    },
    description: '龜馬山一點靈服務',
  },
  {
    keyword: '年斗',
    aliases: ['年斗法會', '闔家年斗', '元辰年斗', '紫微年斗', '事業年斗'],
    liffUrl: `https://liff.line.me/${LIFF_IDS.service}?liff.state=/liff/service/ND.html`,
    priority: 90,
    replyType: 'template',
    replyPayload: {
      altText: '年斗法會',
      text: '🎊 年斗法會',
      label: '我要報名',
    },
    description: '年斗法會報名',
  },
  {
    keyword: '禮斗',
    aliases: ['禮斗法會', '闔家斗', '元辰斗', '事業斗'],
    liffUrl: `https://liff.line.me/${LIFF_IDS.service}?liff.state=/liff/service/LD.html`,
    priority: 90,
    replyType: 'template',
    replyPayload: {
      altText: '禮斗法會',
      text: '⭐ 禮斗法會',
      label: '我要報名',
    },
    description: '禮斗法會報名',
  },
  {
    keyword: '中元',
    aliases: ['中元法會', '普渡', '超拔', '歷代祖先', '祖先', '冤親債主', '嬰靈', '地基主'],
    liffUrl: `https://liff.line.me/${LIFF_IDS.service}?liff.state=/liff/service/ZY.html`,
    priority: 90,
    replyType: 'template',
    replyPayload: {
      altText: '中元法會',
      text: '🏮 中元法會',
      label: '我要報名',
    },
    description: '中元法會報名',
  },
  {
    keyword: '普施',
    aliases: ['普施大法會', '普施法會', '普桌', '白米', '隨喜功德'],
    liffUrl: `https://liff.line.me/${LIFF_IDS.service}?liff.state=/liff/service/PS.html`,
    priority: 90,
    replyType: 'template',
    replyPayload: {
      altText: '普施法會',
      text: '🙏 普施法會',
      label: '我要報名',
    },
    description: '普施法會報名',
  },
  {
    keyword: '秋祭',
    aliases: ['秋祭法會', '文昌帝君拱斗'],
    liffUrl: `https://liff.line.me/${LIFF_IDS.service}?liff.state=/liff/service/QJ.html`,
    priority: 90,
    replyType: 'template',
    replyPayload: {
      altText: '秋祭法會',
      text: '🍂 秋祭法會',
      label: '我要報名',
    },
    description: '秋祭法會報名',
  },

  // 奉獻項目
  {
    keyword: '建宮廟款',
    aliases: ['青石板', '鋼筋', '水泥', '琉璃瓦'],
    liffUrl: `https://liff.line.me/${LIFF_IDS.service}?liff.state=/liff/service/BG.html`,
    priority: 80,
    replyType: 'template',
    replyPayload: {
      altText: '建宮廟款',
      text: '🏛️ 建宮廟款',
      label: '我要奉獻',
    },
    description: '建宮廟款捐獻',
  },
  {
    keyword: '添香油',
    aliases: [],
    liffUrl: `https://liff.line.me/${LIFF_IDS.service}?liff.state=/liff/service/XY.html`,
    priority: 80,
    replyType: 'template',
    replyPayload: {
      altText: '添香油',
      text: '🪔 添香油',
      label: '我要奉獻',
    },
    description: '添香油捐獻',
  },
  {
    keyword: '福田會',
    aliases: [],
    liffUrl: `https://liff.line.me/${LIFF_IDS.service}?liff.state=/liff/service/ft.html`,
    priority: 80,
    replyType: 'template',
    replyPayload: {
      altText: '福田會入會',
      text: '🌟 福田會入會',
      label: '了解詳情',
    },
    description: '福田會入會',
  },
  {
    keyword: '奉獻',
    aliases: [],
    liffUrl: `https://liff.line.me/${LIFF_IDS.service}?liff.state=/liff/service/donation.html`,
    priority: 70,
    replyType: 'template',
    replyPayload: {
      altText: '信眾奉獻',
      text: '💰 信眾奉獻',
      label: '選擇奉獻項目',
    },
    description: '奉獻項目入口',
  },

  // 平台功能
  {
    keyword: '簽到',
    aliases: ['奉香簽到', '奉香', '打卡'],
    liffUrl: `https://liff.line.me/${LIFF_IDS.checkin}?liff.state=/liff/checkin.html`,
    priority: 95,
    replyType: 'template',
    replyPayload: {
      altText: '開啟奉香簽到',
      text: '🙏 奉香簽到系統',
      label: '開始簽到',
    },
    description: '奉香簽到系統',
  },
  {
    keyword: '管理',
    aliases: ['簽到管理'],
    liffUrl: `https://liff.line.me/${LIFF_IDS.checkin}?liff.state=/checkin/manage/index.html`,
    priority: 85,
    replyType: 'template',
    replyPayload: {
      altText: '開啟簽到管理',
      text: '📊 簽到管理系統',
      label: '進入管理',
    },
    description: '簽到管理系統（需權限）',
  },
  {
    keyword: '神務服務',
    aliases: ['神務', '服務', '法會'],
    liffUrl: `https://liff.line.me/${LIFF_IDS.service}?liff.state=/liff/service.html`,
    priority: 90,
    replyType: 'template',
    replyPayload: {
      altText: '開啟神務服務',
      text: '⚡ 神務服務系統',
      label: '進入服務',
    },
    description: '神務服務系統',
  },
  {
    keyword: '排班',
    aliases: ['排班系統', '班表', '志工'],
    liffUrl: `https://liff.line.me/${LIFF_IDS.schedule}?liff.state=/liff/schedule.html`,
    priority: 90,
    replyType: 'template',
    replyPayload: {
      altText: '開啟排班系統',
      text: '📅 排班系統',
      label: '查看班表',
    },
    description: '排班系統',
  },
];

// 正規化關鍵詞
function normalizeKeyword(keyword) {
  return keyword.trim().toLowerCase();
}

// Cloud Function：執行遷移
exports.migrateKeywords = onRequest(
    {
      region: 'asia-east2',
      cors: true,
    },
    async (req, res) => {
      try {
        logger.info('開始遷移關鍵詞...');

        const db = admin.firestore();
        const collection = db.collection('lineKeywordMappings');

        // 檢查是否已有資料
        const existingDocs = await collection.limit(1).get();
        const hasExisting = !existingDocs.empty;

        // 如果有資料且不是強制覆蓋，則返回警告
        if (hasExisting && req.query.force !== 'true') {
          const count = (await collection.count().get()).data().count;
          res.status(200).json({
            ok: false,
            message: `資料庫已有 ${count} 個關鍵詞。如要覆蓋，請加上 ?force=true 參數`,
            existingCount: count,
          });
          return;
        }

        // 刪除現有資料
        if (hasExisting) {
          logger.info('刪除現有資料...');
          const allDocs = await collection.get();
          const batch = db.batch();
          allDocs.forEach((doc) => {
            batch.delete(doc.ref);
          });
          await batch.commit();
          logger.info(`已刪除 ${allDocs.size} 個現有關鍵詞`);
        }

        // 建立新文檔
        const batch = db.batch();
        let count = 0;

        for (const kw of keywords) {
          const docRef = collection.doc();
          const data = {
            keyword: kw.keyword,
            normalizedKeyword: normalizeKeyword(kw.keyword),
            aliases: kw.aliases || [],
            priority: kw.priority,
            enabled: true,
            description: kw.description || '',
            replyType: kw.replyType,
            createdBy: 'system-migration',
            updatedBy: 'system-migration',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          };

          // 根據 replyType 設置不同的欄位
          if (kw.replyType === 'text') {
            data.replyPayload = {
              text: kw.replyPayload.text,
            };
          } else {
            data.liffUrl = kw.liffUrl;
            data.replyPayload = kw.replyPayload;
          }

          batch.set(docRef, data);
          count++;
        }

        // 提交批次寫入
        await batch.commit();
        logger.info(`遷移完成！共遷移 ${count} 個關鍵詞`);

        const totalAliases = keywords.reduce((sum, kw) => sum + kw.aliases.length, 0);

        res.status(200).json({
          ok: true,
          message: '遷移完成',
          stats: {
            total: count,
            aliases: totalAliases,
            categories: {
              service: 6,
              donation: 4,
              platform: 4,
              system: 1,
            },
          },
        });
      } catch (error) {
        logger.error('遷移失敗:', error);
        res.status(500).json({
          ok: false,
          error: error.message,
        });
      }
    },
);
