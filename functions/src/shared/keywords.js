/**
 * 共享的關鍵字定義模組
 * 用於 rebuild.js（Firestore 重建）和 messaging/index.js（硬編碼後備）
 * 
 * 新架構：所有關鍵字都使用獨立 LIFF URL
 * - 不再使用共用 LIFF App + 轉發器
 * - 每個關鍵字直接對應一個 LIFF URL
 * - LIFF App 的 Endpoint URL 直接設定為最終頁面
 */

// ============================================
// 關鍵字定義（所有使用獨立 LIFF URL）
// ============================================
// 
// 📝 維護說明：
// 1. 每個關鍵字需要在 LINE Developers Console 建立獨立的 LIFF App
// 2. LIFF App 的 Endpoint URL 設定為最終頁面（如 /service/DD.html）
// 3. 將 LIFF URL 填入下方的 liffUrl 欄位
// 4. 執行 rebuildKeywords 同步到 Firestore
//
// ============================================

const KEYWORDS = [
  // === 已知的 LIFF URL（從福田會表單） ===
  {
    keyword: '福田Young會',
    liffUrl: 'https://liff.line.me/2008269293-XPgaLra8',
    replyPayload: {
      altText: '福田Young會',
      text: '🌟 福田Young會',
      label: '了解詳情'
    },
    aliases: ['Young'],
    priority: 100,
    description: '福田Young會入會表單'
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
    priority: 99,
    description: '企業團體入會表單'
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
    priority: 98,
    description: '信眾個人入會表單'
  },
  
  // ============================================
  // ⚠️  以下關鍵字需要更新 LIFF URL
  // ============================================
  // 請在 LINE Developers Console 中：
  // 1. 建立對應的 LIFF App
  // 2. Endpoint URL 設定為對應的頁面路徑
  // 3. 複製 LIFF URL 並填入下方
  // 4. 取消註釋並執行 rebuildKeywords
  // ============================================
  
  // --- 神務服務類（需要對應的 LIFF App）---
  // {
  //   keyword: '龜馬山一點靈',
  //   liffUrl: 'https://liff.line.me/2008269293-XXXXXX',  // ← 請填入對應的 LIFF URL
  //   // Endpoint URL 應設定為: /service/DD.html
  //   replyPayload: {
  //     altText: '龜馬山一點靈',
  //     text: '🕯️ 龜馬山一點靈',
  //     label: '線上點燈'
  //   },
  //   aliases: ['線上點燈', '安太歲', '元辰燈', '文昌燈', '財利燈', '光明燈', '點燈', 'dd', 'DD'],
  //   priority: 97,
  //   description: '線上點燈服務'
  // },
  // {
  //   keyword: '年斗法會',
  //   liffUrl: 'https://liff.line.me/2008269293-XXXXXX',  // ← 請填入
  //   // Endpoint URL: /service/ND.html
  //   replyPayload: {
  //     altText: '年斗法會',
  //     text: '⭐ 年斗法會',
  //     label: '了解詳情'
  //   },
  //   aliases: ['年斗', 'nd', 'ND'],
  //   priority: 96
  // },
  // {
  //   keyword: '禮斗法會',
  //   liffUrl: 'https://liff.line.me/2008269293-XXXXXX',  // ← 請填入
  //   // Endpoint URL: /service/LD.html
  //   replyPayload: {
  //     altText: '禮斗法會',
  //     text: '🌟 禮斗法會',
  //     label: '了解詳情'
  //   },
  //   aliases: ['禮斗', 'ld', 'LD'],
  //   priority: 95
  // },
  // {
  //   keyword: '中元法會',
  //   liffUrl: 'https://liff.line.me/2008269293-XXXXXX',  // ← 請填入
  //   // Endpoint URL: /service/ZY.html
  //   replyPayload: {
  //     altText: '中元法會',
  //     text: '🏮 中元法會',
  //     label: '了解詳情'
  //   },
  //   aliases: ['中元', 'zy', 'ZY'],
  //   priority: 94
  // },
  
  // --- 簽到系統類 ---
  // {
  //   keyword: '奉香簽到',
  //   liffUrl: 'https://liff.line.me/2008269293-XXXXXX',  // ← 請填入
  //   // Endpoint URL: /checkin/index.html
  //   replyPayload: {
  //     altText: '開啟奉香簽到',
  //     text: '🙏 奉香簽到系統',
  //     label: '開始簽到'
  //   },
  //   aliases: ['簽到', '奉香', '打卡'],
  //   priority: 93
  // },
  // {
  //   keyword: '簽到管理',
  //   liffUrl: 'https://liff.line.me/2008269293-VGLP8oPw',  // ← 已知（從截圖）
  //   // Endpoint URL: /checkin/manage/dashboard.html
  //   replyPayload: {
  //     altText: '開啟簽到管理',
  //     text: '📊 簽到管理系統',
  //     label: '管理簽到'
  //   },
  //   aliases: ['奉香管理', '1111'],
  //   priority: 92
  // },
  
  // ============================================
  // 💡 提示：如何獲取 LIFF URL
  // ============================================
  // 1. 登入 LINE Developers Console
  // 2. 進入「龜馬山信眾服務系統」Provider
  // 3. 點選對應的 LIFF App
  // 4. 複製「LIFF URL」欄位的值
  // 5. 貼到上方對應關鍵字的 liffUrl 欄位
  // ============================================
];

/**
 * 建立 LIFF URL（簡化版）
 * 直接返回 liffUrl，不再處理 liffApp + path
 */
function buildLiffUrl(keywordData) {
  if (!keywordData.liffUrl) {
    throw new Error(`關鍵字 "${keywordData.keyword}" 缺少 liffUrl 配置`);
  }
  return keywordData.liffUrl;
}

/**
 * 正規化關鍵詞（轉小寫並去空白）
 */
function normalizeKeyword(keyword) {
  return keyword.trim().toLowerCase();
}

module.exports = {
  KEYWORDS,
  buildLiffUrl,
  normalizeKeyword
};
