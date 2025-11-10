/**
 * Cloud Function: 批量清空並重建 19 個關鍵字（混合架構）
 * HTTP Trigger: 直接訪問 URL 即可執行
 * 
 * 架構：16 個共用 LIFF App + 3 個獨立 LIFF App
 * 註：已移除不存在頁面的關鍵字
 */

const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const logger = require('firebase-functions/logger');

// 導入共享的關鍵字定義
const { KEYWORDS, buildLiffUrl, normalizeKeyword } = require('../shared/keywords');

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
      
      // === 步驟 2：批量寫入關鍵字（混合架構）===
      output.push(`📝 步驟 2：批量寫入 ${KEYWORDS.length} 個關鍵字...`);
      output.push('   ⚙️  架構：16 個共用 LIFF App + 3 個獨立 LIFF App');
      logger.info('批量寫入關鍵字...');
      
      let successCount = 0;
      let sharedAppCount = 0;
      let independentAppCount = 0;
      const errors = [];
      
      for (const kw of KEYWORDS) {
        try {
          // 建立 LIFF URL（支持兩種模式）
          const liffUrl = buildLiffUrl(kw);
          
          // 統計使用的模式
          if (kw.liffUrl) {
            independentAppCount++;
          } else if (kw.liffApp) {
            sharedAppCount++;
          }
          
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
          const mode = kw.liffUrl ? '[獨立]' : '[共用]';
          output.push(`✅ [${successCount}/${KEYWORDS.length}] ${mode} ${kw.keyword} → ${liffUrl}`);
          logger.info(`成功: ${kw.keyword}`);
          
        } catch (error) {
          errors.push({ keyword: kw.keyword, error: error.message });
          output.push(`❌ [失敗] ${kw.keyword}: ${error.message}`);
          logger.error(`失敗: ${kw.keyword}`, error);
        }
      }
      
      // 輸出架構統計
      output.push('');
      output.push('📊 架構統計：');
      output.push(`   🔗 共用 LIFF App：${sharedAppCount} 個`);
      output.push(`   ⭐ 獨立 LIFF App：${independentAppCount} 個`);
      
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
        output.push(`🎉 所有 ${KEYWORDS.length} 個關鍵字已成功重建！`);
        output.push('✅ 混合架構：16 個共用 + 3 個獨立 LIFF App');
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
