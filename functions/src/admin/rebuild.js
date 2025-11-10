/**
 * Cloud Function: 批量清空並重建 18 個正確格式的關鍵字
 * HTTP Trigger: 直接訪問 URL 即可執行
 */

const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const logger = require('firebase-functions/logger');

// LIFF ID 配置（硬編碼，與文檔一致）
const LIFF_IDS = {
  service: '2008269293-Nl2pZBpV',   // Service 神務
  checkin: '2008269293-nYBm3JmV',   // Checkin 簽到
  schedule: '2008269293-N0wnqknr'   // Schedule 排班
};

// 18 個關鍵字的完整資料
const KEYWORDS = [
  // === Checkin 簽到專案（2個）===
  {
    keyword: '奉香簽到',
    liffApp: 'checkin',
    path: '/checkin/index.html',
    replyPayload: {
      altText: '開啟奉香簽到',
      text: '🙏 奉香簽到系統',
      label: '開始簽到'
    },
    aliases: ['奉香', '打卡簽到'],
    priority: 100
  },
  {
    keyword: '簽到管理',
    liffApp: 'checkin',
    path: '/checkin/manage/dashboard.html',
    replyPayload: {
      altText: '開啟簽到管理',
      text: '📊 簽到管理系統',
      label: '進入管理'
    },
    aliases: ['奉香管理', '1111'],
    priority: 99
  },
  
  // === Service 神務專案（11個）===
  {
    keyword: '龜馬山一點靈',
    liffApp: 'service',
    path: '/service/DD.html',
    replyPayload: {
      altText: '龜馬山一點靈',
      text: '🕯️ 龜馬山一點靈',
      label: '立即點燈'
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
      text: '🎊 年斗法會',
      label: '我要報名'
    },
    aliases: ['闔家年斗', '元辰年斗', '紫微年斗', '事業年斗', '年斗', 'nd', 'ND'],
    priority: 97
  },
  {
    keyword: '禮斗法會',
    liffApp: 'service',
    path: '/service/LD.html',
    replyPayload: {
      altText: '禮斗法會',
      text: '⭐ 禮斗法會',
      label: '我要報名'
    },
    aliases: ['闔家斗', '元辰斗', '事業斗', '禮斗', 'ld', 'LD'],
    priority: 96
  },
  {
    keyword: '中元法會',
    liffApp: 'service',
    path: '/service/ZY.html',
    replyPayload: {
      altText: '中元法會',
      text: '🏮 中元法會',
      label: '我要報名'
    },
    aliases: ['中元', '普渡', '超拔', '歷代祖先', '祖先', '冤親債主', '嬰靈', '地基主', 'zy', 'ZY'],
    priority: 95
  },
  {
    keyword: '普施大法會',
    liffApp: 'service',
    path: '/service/PS.html',
    replyPayload: {
      altText: '普施法會',
      text: '🙏 普施法會',
      label: '我要報名'
    },
    aliases: ['普施', '普桌', '白米', '隨喜功德', 'ps', 'PS'],
    priority: 94
  },
  {
    keyword: '秋祭法會',
    liffApp: 'service',
    path: '/service/QJ.html',
    replyPayload: {
      altText: '秋祭法會',
      text: '🍂 秋祭法會',
      label: '我要報名'
    },
    aliases: ['秋祭', '文昌帝君拱斗', 'qj', 'QJ'],
    priority: 93
  },
  {
    keyword: '建宮廟款',
    liffApp: 'service',
    path: '/service/BG.html',
    replyPayload: {
      altText: '建宮廟款',
      text: '🏛️ 建宮廟款',
      label: '我要奉獻'
    },
    aliases: ['青石板', '鋼筋', '水泥', '琉璃瓦', 'bg', 'BG'],
    priority: 92
  },
  {
    keyword: '添香油',
    liffApp: 'service',
    path: '/service/XY.html',
    replyPayload: {
      altText: '添香油',
      text: '🪔 添香油',
      label: '我要奉獻'
    },
    aliases: ['香油', 'xy', 'XY'],
    priority: 91
  },
  {
    keyword: '福田會',
    liffApp: 'service',
    path: '/service/ft.html',
    replyPayload: {
      altText: '福田會入會',
      text: '🌟 福田會入會',
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
      altText: '開啟神務服務',
      text: '⚡ 神務服務系統',
      label: '進入服務'
    },
    aliases: ['神務', 'se', 'SE'],
    priority: 89
  },
  {
    keyword: '神務管理',
    liffApp: 'service',
    path: '/service/manage/index.html',
    replyPayload: {
      altText: '開啟神務管理',
      text: '⚙️ 神務管理系統',
      label: '進入管理'
    },
    aliases: ['2222'],
    priority: 88
  },
  
  // === Schedule 排班專案（5個）===
  {
    keyword: '排班管理',
    liffApp: 'schedule',
    path: '/schedule/manage/dashboard.html',
    replyPayload: {
      altText: '開啟排班管理',
      text: '⚙️ 排班管理系統',
      label: '進入管理'
    },
    aliases: ['3333'],
    priority: 87
  },
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
  }
];

/**
 * 建立正確格式的 LIFF URL
 */
function buildLiffUrl(liffApp, path) {
  const liffId = LIFF_IDS[liffApp];
  if (!liffId) {
    throw new Error(`未知的 LIFF App: ${liffApp}`);
  }
  
  // 關鍵：path 不應包含 /liff 前綴！
  return `https://liff.line.me/${liffId}?liff.state=${path}`;
}

/**
 * 正規化關鍵詞（轉小寫並去空白）
 */
function normalizeKeyword(keyword) {
  return keyword.trim().toLowerCase();
}

/**
 * Cloud Function HTTP Handler
 */
exports.rebuildKeywords = onRequest(
  {
    region: 'asia-east2',
    cors: true,
  },
  async (req, res) => {
    logger.info('🚀 開始批量重建關鍵字...');
    
    const db = admin.firestore();
    const collection = db.collection('lineKeywordMappings');
    
    const output = [];
    
    try {
      // === 步驟 1：清空現有資料 ===
      output.push('📋 步驟 1：清空現有關鍵字...');
      logger.info('清空現有關鍵字...');
      
      const snapshot = await collection.get();
      output.push(`找到 ${snapshot.size} 個現有關鍵字`);
      logger.info(`找到 ${snapshot.size} 個現有關鍵字`);
      
      if (snapshot.size > 0) {
        const batch = db.batch();
        snapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        output.push(`✅ 已刪除 ${snapshot.size} 個關鍵字`);
        logger.info(`已刪除 ${snapshot.size} 個關鍵字`);
      } else {
        output.push('✅ 沒有需要刪除的關鍵字');
      }
      
      output.push('');
      
      // === 步驟 2：批量寫入正確格式的關鍵字 ===
      output.push('📝 步驟 2：批量寫入 18 個關鍵字...');
      logger.info('批量寫入關鍵字...');
      
      let successCount = 0;
      const errors = [];
      
      for (const kw of KEYWORDS) {
        try {
          // 建立正確格式的 LIFF URL（無 /liff 前綴）
          const liffUrl = buildLiffUrl(kw.liffApp, kw.path);
          
          // 準備資料
          const data = {
            keyword: kw.keyword.trim(),
            normalizedKeyword: normalizeKeyword(kw.keyword),
            liffUrl: liffUrl,
            replyType: 'template',
            replyPayload: kw.replyPayload,
            aliases: kw.aliases || [],
            priority: kw.priority,
            enabled: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: 'system-rebuild',
            updatedBy: 'system-rebuild'
          };
          
          // 寫入 Firestore
          await collection.add(data);
          
          successCount++;
          output.push(`✅ [${successCount}/18] ${kw.keyword} → ${liffUrl}`);
          logger.info(`成功: ${kw.keyword}`);
          
        } catch (error) {
          errors.push({ keyword: kw.keyword, error: error.message });
          output.push(`❌ [失敗] ${kw.keyword}: ${error.message}`);
          logger.error(`失敗: ${kw.keyword}`, error);
        }
      }
      
      // === 步驟 3：總結 ===
      output.push('');
      output.push('='.repeat(60));
      output.push('📊 執行結果：');
      output.push(`   ✅ 成功：${successCount} 個`);
      output.push(`   ❌ 失敗：${errors.length} 個`);
      
      if (errors.length > 0) {
        output.push('');
        output.push('❌ 失敗清單：');
        errors.forEach(err => {
          output.push(`   - ${err.keyword}: ${err.error}`);
        });
      }
      
      output.push('='.repeat(60));
      
      if (successCount === KEYWORDS.length) {
        output.push('');
        output.push('🎉 所有關鍵字已成功重建！');
        output.push('✅ LIFF URL 格式已修正（無 /liff 前綴）');
        output.push('✅ 雙保險機制已啟動：Firestore + 硬編碼後備');
        
        logger.info('批量重建成功！');
        res.status(200).send('<pre>' + output.join('\n') + '</pre>');
      } else {
        output.push('');
        output.push('⚠️  部分關鍵字寫入失敗，請檢查錯誤訊息');
        
        logger.warn('部分關鍵字寫入失敗');
        res.status(207).send('<pre>' + output.join('\n') + '</pre>');
      }
      
    } catch (error) {
      logger.error('執行失敗:', error);
      output.push('');
      output.push('❌ 執行失敗: ' + error.message);
      res.status(500).send('<pre>' + output.join('\n') + '</pre>');
    }
  }
);
