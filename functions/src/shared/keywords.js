/**
 * 共享的關鍵字定義模組
 * 用於 rebuild.js（Firestore 重建）和 messaging/index.js（硬編碼後備）
 * 
 * 架構：混合模式
 * - 18 個舊關鍵字：使用共用 LIFF App（liffApp + path，需要轉發器）
 * - 3 個新關鍵字：使用獨立 LIFF App（直接 liffUrl）
 */

// 共用 LIFF App 的 ID 配置（用於舊的 18 個關鍵字）
const LIFF_IDS = {
  service: '2008269293-Nl2pZBpV',   // Service 神務
  checkin: '2008269293-nYBm3JmV',   // Checkin 簽到
  schedule: '2008269293-N0wnqknr'   // Schedule 排班
};

// 21 個關鍵字的完整定義
const KEYWORDS = [
  // === Checkin 簽到專案（2個）- 共用 LIFF App ===
  {
    keyword: '奉香簽到',
    liffApp: 'checkin',
    path: '/checkin/checkin.html',
    replyPayload: {
      altText: '開啟奉香簽到',
      text: '🙏 奉香簽到系統',
      label: '開始簽到'
    },
    aliases: ['簽到', '奉香', '打卡', '打卡簽到'],
    priority: 100
  },
  {
    keyword: '簽到管理',
    liffApp: 'checkin',
    path: '/checkin/history.html',
    replyPayload: {
      altText: '開啟簽到管理',
      text: '📊 簽到歷史記錄',
      label: '查看記錄'
    },
    aliases: ['奉香管理', '1111'],
    priority: 99
  },
  
  // === Service 神務專案（14個）- 共用 LIFF App ===
  {
    keyword: '龜馬山一點靈',
    liffApp: 'service',
    path: '/service/DD.html',
    replyPayload: {
      altText: '龜馬山一點靈',
      text: '🕯️ 龜馬山一點靈',
      label: '線上點燈'
    },
    aliases: ['線上點燈', '安太歲', '元辰燈', '文昌燈', '財利燈', '光明燈', '點燈', 'dd', 'DD'],
    priority: 98
  },
  {
    keyword: '年斗法會',
    liffApp: 'service',
    path: '/service/ND.html',
    replyPayload: {
      altText: '年斗法會',
      text: '⭐ 年斗法會',
      label: '了解詳情'
    },
    aliases: ['年斗', 'nd', 'ND'],
    priority: 97
  },
  {
    keyword: '禮斗法會',
    liffApp: 'service',
    path: '/service/LD.html',
    replyPayload: {
      altText: '禮斗法會',
      text: '🌟 禮斗法會',
      label: '了解詳情'
    },
    aliases: ['禮斗', 'ld', 'LD'],
    priority: 96
  },
  {
    keyword: '中元法會',
    liffApp: 'service',
    path: '/service/ZY.html',
    replyPayload: {
      altText: '中元法會',
      text: '🏮 中元法會',
      label: '了解詳情'
    },
    aliases: ['中元', 'zy', 'ZY'],
    priority: 95
  },
  {
    keyword: '普施法會',
    liffApp: 'service',
    path: '/service/PS.html',
    replyPayload: {
      altText: '普施法會',
      text: '🙏 普施法會',
      label: '了解詳情'
    },
    aliases: ['普施', 'ps', 'PS'],
    priority: 94
  },
  {
    keyword: '秋祭法會',
    liffApp: 'service',
    path: '/service/QJ.html',
    replyPayload: {
      altText: '秋祭法會',
      text: '🍂 秋祭法會',
      label: '了解詳情'
    },
    aliases: ['秋祭', 'qj', 'QJ'],
    priority: 93
  },
  {
    keyword: '建宮廟款',
    liffApp: 'service',
    path: '/service/BG.html',
    replyPayload: {
      altText: '建宮廟款',
      text: '🏛️ 建宮廟款',
      label: '了解詳情'
    },
    aliases: ['建廟', '建宮', 'bg', 'BG'],
    priority: 92
  },
  {
    keyword: '添香油',
    liffApp: 'service',
    path: '/service/XY.html',
    replyPayload: {
      altText: '添香油',
      text: '🕯️ 添香油',
      label: '了解詳情'
    },
    aliases: ['香油', 'xy', 'XY'],
    priority: 91
  },
  {
    keyword: '福田會',
    liffApp: 'service',
    path: '/service/ft.html',
    replyPayload: {
      altText: '福田會',
      text: '💝 福田會',
      label: '了解詳情'
    },
    aliases: ['福田', 'ft', 'FT'],
    priority: 90
  },
  {
    keyword: '神務服務',
    liffApp: 'service',
    path: '/service/index.html',
    replyPayload: {
      altText: '神務服務',
      text: '📋 神務服務總覽',
      label: '瀏覽服務'
    },
    aliases: ['神務', 'service', 'se', 'SE'],
    priority: 89
  },
  
  // === Schedule 排班專案（5個）- 共用 LIFF App ===
  {
    keyword: '本週班表',
    liffApp: 'schedule',
    path: '/schedule/week.html',
    replyPayload: {
      altText: '本週班表',
      text: '📅 本週班表',
      label: '查看本週'
    },
    aliases: ['週班表', 'we', 'WE'],
    priority: 86
  },
  {
    keyword: '本月班表',
    liffApp: 'schedule',
    path: '/schedule/month.html',
    replyPayload: {
      altText: '本月班表',
      text: '📆 本月班表',
      label: '查看本月'
    },
    aliases: ['月班表', 'mo', 'MO'],
    priority: 85
  },
  {
    keyword: '班表',
    liffApp: 'schedule',
    path: '/schedule/roste.html',
    replyPayload: {
      altText: '班表',
      text: '📋 班表系統',
      label: '查看班表'
    },
    aliases: ['組班表', 'ro', 'RO'],
    priority: 84
  },
  {
    keyword: '志工排班',
    liffApp: 'schedule',
    path: '/schedule/schedule.html',
    replyPayload: {
      altText: '志工排班',
      text: '👥 志工排班系統',
      label: '進入排班'
    },
    aliases: ['工作人員', '排班', 'sc', 'SC', 'ss'],
    priority: 83
  },
  
  // === 獨立 LIFF App（3個）- 使用直接 LIFF URL ===
  {
    keyword: '福田Young會',
    liffUrl: 'https://liff.line.me/2008269293-XPgaLra8',
    replyPayload: {
      altText: '福田Young會',
      text: '🌟 福田Young會',
      label: '了解詳情'
    },
    aliases: ['Young'],
    priority: 82
  },
  {
    keyword: '企業團體',
    liffUrl: 'https://liff.line.me/2008269293-LKR2Nr2x',
    replyPayload: {
      altText: '企業團體',
      text: '🏢 企業團體',
      label: '了解詳情'
    },
    aliases: ['企業', '團體'],
    priority: 81
  },
  {
    keyword: '信眾個人',
    liffUrl: 'https://liff.line.me/2008269293-71e3y43M',
    replyPayload: {
      altText: '信眾個人',
      text: '👤 信眾個人',
      label: '了解詳情'
    },
    aliases: ['信眾', '個人'],
    priority: 80
  }
];

/**
 * 建立 LIFF URL（支持兩種模式）
 * 模式 1: 獨立 LIFF App - 直接返回 liffUrl
 * 模式 2: 共用 LIFF App - 使用 liffApp + path 生成 LIFF URL
 */
function buildLiffUrl(keywordData) {
  // 模式 1：獨立 LIFF App
  if (keywordData.liffUrl) {
    return keywordData.liffUrl;
  }
  
  // 模式 2：共用 LIFF App
  if (keywordData.liffApp && keywordData.path) {
    const liffId = LIFF_IDS[keywordData.liffApp];
    if (!liffId) {
      throw new Error(`未知的 LIFF App: ${keywordData.liffApp}`);
    }
    return `https://liff.line.me/${liffId}?liff.state=${keywordData.path}`;
  }
  
  throw new Error(`關鍵字 "${keywordData.keyword}" 缺少 liffUrl 或 liffApp/path 配置`);
}

/**
 * 正規化關鍵詞（轉小寫並去空白）
 */
function normalizeKeyword(keyword) {
  return keyword.trim().toLowerCase();
}

module.exports = {
  KEYWORDS,
  LIFF_IDS,
  buildLiffUrl,
  normalizeKeyword
};
