/**
 * 批量寫入 18 個關鍵字到 Firestore
 * 從已驗證的硬編碼複製所有關鍵字資料到 Firestore
 */

const {onRequest} = require('firebase-functions/v2/https');
const {logger} = require('firebase-functions');
const admin = require('firebase-admin');

// LIFF App IDs
const LIFF_IDS = {
  checkin: '2008269293-nYBm3JmV',
  service: '2008269293-Nl2pZBpV',
  schedule: '2008269293-N0wnqknr',
};

// 18 個關鍵字完整資料（從硬編碼複製）
const KEYWORDS_DATA = [
  // === Step 2: Checkin (2 個關鍵字) ===
  {
    keyword: '奉香簽到',
    aliases: ['奉香', '打卡簽到'],
    category: 'checkin',
    module: 'Checkin',
    step: 'Step 2',
    priority: 100,
    enabled: true,
    replyType: 'template',
    liffUrl: `https://liff.line.me/${LIFF_IDS.checkin}?liff.state=/liff/checkin/index.html`,
    replyPayload: {
      altText: '開啟奉香簽到',
      text: '🙏 奉香簽到系統',
      label: '開始簽到',
    },
    description: '奉香簽到功能',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  },
  {
    keyword: '簽到管理',
    aliases: ['奉香管理', '1111'],
    category: 'checkin',
    module: 'Checkin',
    step: 'Step 2',
    priority: 99,
    enabled: true,
    replyType: 'template',
    liffUrl: `https://liff.line.me/${LIFF_IDS.checkin}?liff.state=/liff/checkin/manage/dashboard.html`,
    replyPayload: {
      altText: '開啟簽到管理',
      text: '📊 簽到管理系統',
      label: '進入管理',
    },
    description: '簽到管理後台',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  },

  // === Step 3: Service (11 個關鍵字) ===
  {
    keyword: '龜馬山一點靈',
    aliases: ['線上點燈', '安太歲', '元辰燈', '文昌燈', '財利燈', '光明燈', '點燈', 'DD', 'dd'],
    category: 'service',
    module: 'Service',
    step: 'Step 3',
    priority: 98,
    enabled: true,
    replyType: 'template',
    liffUrl: `https://liff.line.me/${LIFF_IDS.service}?liff.state=/liff/service/DD.html`,
    replyPayload: {
      altText: '龜馬山一點靈',
      text: '🕯️ 龜馬山一點靈',
      label: '立即點燈',
    },
    description: '線上點燈服務',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  },
  {
    keyword: '年斗法會',
    aliases: ['年斗', '闔家年斗', '元辰年斗', '紫微年斗', '事業年斗', 'ND', 'nd'],
    category: 'service',
    module: 'Service',
    step: 'Step 3',
    priority: 97,
    enabled: true,
    replyType: 'template',
    liffUrl: `https://liff.line.me/${LIFF_IDS.service}?liff.state=/liff/service/ND.html`,
    replyPayload: {
      altText: '年斗法會',
      text: '🎊 年斗法會',
      label: '我要報名',
    },
    description: '年斗法會報名',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  },
  {
    keyword: '禮斗法會',
    aliases: ['禮斗', '闔家斗', '元辰斗', '事業斗', 'LD', 'ld'],
    category: 'service',
    module: 'Service',
    step: 'Step 3',
    priority: 96,
    enabled: true,
    replyType: 'template',
    liffUrl: `https://liff.line.me/${LIFF_IDS.service}?liff.state=/liff/service/LD.html`,
    replyPayload: {
      altText: '禮斗法會',
      text: '⭐ 禮斗法會',
      label: '我要報名',
    },
    description: '禮斗法會報名',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  },
  {
    keyword: '中元法會',
    aliases: ['中元', '普渡', '超拔', '歷代祖先', '祖先', '冤親債主', '嬰靈', '地基主', 'ZY', 'zy'],
    category: 'service',
    module: 'Service',
    step: 'Step 3',
    priority: 95,
    enabled: true,
    replyType: 'template',
    liffUrl: `https://liff.line.me/${LIFF_IDS.service}?liff.state=/liff/service/ZY.html`,
    replyPayload: {
      altText: '中元法會',
      text: '🏮 中元法會',
      label: '我要報名',
    },
    description: '中元法會報名',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  },
  {
    keyword: '普施法會',
    aliases: ['普施大法會', '普施', '普桌', '白米', '隨喜功德', 'PS', 'ps'],
    category: 'service',
    module: 'Service',
    step: 'Step 3',
    priority: 94,
    enabled: true,
    replyType: 'template',
    liffUrl: `https://liff.line.me/${LIFF_IDS.service}?liff.state=/liff/service/PS.html`,
    replyPayload: {
      altText: '普施法會',
      text: '🙏 普施法會',
      label: '我要報名',
    },
    description: '普施法會報名',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  },
  {
    keyword: '秋祭法會',
    aliases: ['秋祭', '文昌帝君拱斗', 'QJ', 'qj'],
    category: 'service',
    module: 'Service',
    step: 'Step 3',
    priority: 93,
    enabled: true,
    replyType: 'template',
    liffUrl: `https://liff.line.me/${LIFF_IDS.service}?liff.state=/liff/service/QJ.html`,
    replyPayload: {
      altText: '秋祭法會',
      text: '🍂 秋祭法會',
      label: '我要報名',
    },
    description: '秋祭法會報名',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  },
  {
    keyword: '建宮廟款',
    aliases: ['青石板', '鋼筋', '水泥', '琉璃瓦', 'BG', 'bg'],
    category: 'service',
    module: 'Service',
    step: 'Step 3',
    priority: 92,
    enabled: true,
    replyType: 'template',
    liffUrl: `https://liff.line.me/${LIFF_IDS.service}?liff.state=/liff/service/BG.html`,
    replyPayload: {
      altText: '建宮廟款',
      text: '🏛️ 建宮廟款',
      label: '我要奉獻',
    },
    description: '建宮廟款捐款',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  },
  {
    keyword: '添香油',
    aliases: ['香油', 'XY', 'xy'],
    category: 'service',
    module: 'Service',
    step: 'Step 3',
    priority: 91,
    enabled: true,
    replyType: 'template',
    liffUrl: `https://liff.line.me/${LIFF_IDS.service}?liff.state=/liff/service/XY.html`,
    replyPayload: {
      altText: '添香油',
      text: '🪔 添香油',
      label: '我要奉獻',
    },
    description: '添香油捐款',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  },
  {
    keyword: '福田會',
    aliases: ['福田', 'FT', 'ft'],
    category: 'service',
    module: 'Service',
    step: 'Step 3',
    priority: 90,
    enabled: true,
    replyType: 'template',
    liffUrl: `https://liff.line.me/${LIFF_IDS.service}?liff.state=/liff/service/ft.html`,
    replyPayload: {
      altText: '福田會入會',
      text: '🌟 福田會入會',
      label: '了解詳情',
    },
    description: '福田會入會',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  },
  {
    keyword: '神務服務',
    aliases: ['神務', 'SE', 'se'],
    category: 'service',
    module: 'Service',
    step: 'Step 3',
    priority: 89,
    enabled: true,
    replyType: 'template',
    liffUrl: `https://liff.line.me/${LIFF_IDS.service}?liff.state=/liff/service/index.html`,
    replyPayload: {
      altText: '開啟神務服務',
      text: '⚡ 神務服務系統',
      label: '進入服務',
    },
    description: '神務服務入口',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  },
  {
    keyword: '神務管理',
    aliases: ['2222'],
    category: 'service',
    module: 'Service',
    step: 'Step 3',
    priority: 88,
    enabled: true,
    replyType: 'template',
    liffUrl: `https://liff.line.me/${LIFF_IDS.service}?liff.state=/liff/service/manage/index.html`,
    replyPayload: {
      altText: '開啟神務管理',
      text: '⚙️ 神務管理系統',
      label: '進入管理',
    },
    description: '神務管理後台',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  },

  // === Step 4: Schedule (5 個關鍵字) ===
  {
    keyword: '志工排班',
    aliases: ['工作人員', '排班', 'SC', 'sc', 'ss'],
    category: 'schedule',
    module: 'Schedule',
    step: 'Step 4',
    priority: 87,
    enabled: true,
    replyType: 'template',
    liffUrl: `https://liff.line.me/${LIFF_IDS.schedule}?liff.state=/liff/schedule/schedule.html`,
    replyPayload: {
      altText: '志工排班',
      text: '👥 志工排班系統',
      label: '進入排班',
    },
    description: '志工排班功能',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  },
  {
    keyword: '班表',
    aliases: ['組班表', 'RO', 'ro'],
    category: 'schedule',
    module: 'Schedule',
    step: 'Step 4',
    priority: 86,
    enabled: true,
    replyType: 'template',
    liffUrl: `https://liff.line.me/${LIFF_IDS.schedule}?liff.state=/liff/schedule/roste.html`,
    replyPayload: {
      altText: '班表',
      text: '📋 班表系統',
      label: '查看班表',
    },
    description: '班表查詢',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  },
  {
    keyword: '本週班表',
    aliases: ['週班表', 'WE', 'we'],
    category: 'schedule',
    module: 'Schedule',
    step: 'Step 4',
    priority: 85,
    enabled: true,
    replyType: 'template',
    liffUrl: `https://liff.line.me/${LIFF_IDS.schedule}?liff.state=/liff/schedule/week.html`,
    replyPayload: {
      altText: '本週班表',
      text: '📅 本週班表',
      label: '查看本週',
    },
    description: '本週班表查詢',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  },
  {
    keyword: '本月班表',
    aliases: ['月班表', 'MO', 'mo'],
    category: 'schedule',
    module: 'Schedule',
    step: 'Step 4',
    priority: 84,
    enabled: true,
    replyType: 'template',
    liffUrl: `https://liff.line.me/${LIFF_IDS.schedule}?liff.state=/liff/schedule/month.html`,
    replyPayload: {
      altText: '本月班表',
      text: '📆 本月班表',
      label: '查看本月',
    },
    description: '本月班表查詢',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  },
  {
    keyword: '排班管理',
    aliases: ['3333'],
    category: 'schedule',
    module: 'Schedule',
    step: 'Step 4',
    priority: 83,
    enabled: true,
    replyType: 'template',
    liffUrl: `https://liff.line.me/${LIFF_IDS.schedule}?liff.state=/liff/schedule/manage/dashboard.html`,
    replyPayload: {
      altText: '開啟排班管理',
      text: '⚙️ 排班管理系統',
      label: '進入管理',
    },
    description: '排班管理後台',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  },
];

/**
 * 批量寫入所有關鍵字到 Firestore
 */
exports.migrateAllKeywords = onRequest(
    {
      region: 'asia-east2',
      cors: true,
    },
    async (req, res) => {
      try {
        logger.info('開始批量寫入關鍵字...');

        const db = admin.firestore();
        const batch = db.batch();
        let count = 0;

        // 批量寫入所有關鍵字
        for (const keywordData of KEYWORDS_DATA) {
          const docRef = db.collection('lineKeywordMappings').doc();
          batch.set(docRef, keywordData);
          count++;
        }

        await batch.commit();

        logger.info(`批量寫入完成！共寫入 ${count} 個關鍵字`);

        res.status(200).json({
          success: true,
          message: `成功寫入 ${count} 個關鍵字`,
          keywords: KEYWORDS_DATA.map((k) => ({
            keyword: k.keyword,
            category: k.category,
            step: k.step,
            aliases: k.aliases,
          })),
        });
      } catch (error) {
        logger.error('批量寫入失敗:', error);
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    },
);
