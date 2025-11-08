/**
 * 修正所有關鍵詞的 LIFF URL
 * 移除不必要的 liff.state 參數
 */

const {onRequest} = require('firebase-functions/v2/https');
const {logger} = require('firebase-functions');
const admin = require('firebase-admin');

// LIFF App IDs
const LIFF_IDS = {
  checkin: '2008269293-nYBm3JmV',  // 奉香簽到
  service: '2008269293-Nl2pZBpV',  // 神務服務
  schedule: '2008269293-N0wnqknr', // 排班系統
};

// LIFF URL 映射（根據路徑判斷使用哪個 LIFF ID）
const LIFF_URL_MAP = {
  // 奉香簽到相關
  '/liff/checkin.html': LIFF_IDS.checkin,
  '/checkin/': LIFF_IDS.checkin,
  
  // 排班系統相關
  '/liff/schedule.html': LIFF_IDS.schedule,
  '/schedule/': LIFF_IDS.schedule,
  
  // 神務服務相關（預設）
  '/liff/service': LIFF_IDS.service,
  '/service/': LIFF_IDS.service,
};

// 判斷路徑應該使用哪個 LIFF ID
function getLiffIdFromPath(path) {
  for (const [prefix, liffId] of Object.entries(LIFF_URL_MAP)) {
    if (path.startsWith(prefix)) {
      return liffId;
    }
  }
  // 預設使用神務服務
  return LIFF_IDS.service;
}

// 修正 LIFF URL
function fixLiffUrl(oldUrl) {
  if (!oldUrl) return null;
  
  // 如果已經是正確的簡短格式，直接返回
  if (/^https:\/\/liff\.line\.me\/[^?]+$/.test(oldUrl)) {
    return oldUrl;
  }
  
  // 解析舊 URL
  const match = oldUrl.match(/https:\/\/liff\.line\.me\/([^?]+)(\?liff\.state=(.+))?/);
  
  if (!match) {
    logger.warn('無法解析 LIFF URL:', oldUrl);
    return oldUrl;
  }
  
  const liffId = match[1];
  const state = match[3] ? decodeURIComponent(match[3]) : null;
  
  // 如果有 liff.state 參數，檢查是否需要切換 LIFF ID
  if (state) {
    const correctLiffId = getLiffIdFromPath(state);
    if (correctLiffId !== liffId) {
      logger.info(`切換 LIFF ID: ${liffId} → ${correctLiffId} (路徑: ${state})`);
      return `https://liff.line.me/${correctLiffId}`;
    }
  }
  
  // 返回簡短格式（移除 liff.state 參數）
  return `https://liff.line.me/${liffId}`;
}

exports.fixLiffUrls = onRequest(async (req, res) => {
  try {
    const db = admin.firestore();
    const keywordsRef = db.collection('lineKeywordMappings');
    
    // 讀取所有關鍵詞
    const snapshot = await keywordsRef.get();
    
    let updatedCount = 0;
    let skippedCount = 0;
    const updates = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const oldUrl = data.liffUrl;
      
      if (!oldUrl) {
        skippedCount++;
        return;
      }
      
      const newUrl = fixLiffUrl(oldUrl);
      
      if (newUrl !== oldUrl) {
        logger.info(`修正關鍵詞 "${data.keyword}": ${oldUrl} → ${newUrl}`);
        updates.push({
          id: doc.id,
          keyword: data.keyword,
          oldUrl: oldUrl,
          newUrl: newUrl,
        });
        updatedCount++;
      } else {
        skippedCount++;
      }
    });
    
    // 執行更新
    const batch = db.batch();
    for (const update of updates) {
      const docRef = keywordsRef.doc(update.id);
      batch.update(docRef, { liffUrl: update.newUrl });
    }
    
    if (updates.length > 0) {
      await batch.commit();
      logger.info('批量更新完成');
    }
    
    res.json({
      ok: true,
      message: '修正完成',
      stats: {
        total: snapshot.size,
        updated: updatedCount,
        skipped: skippedCount,
      },
      updates: updates,
    });
    
  } catch (error) {
    logger.error('修正 LIFF URLs 失敗:', error);
    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});
