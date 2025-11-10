/**
 * Cloud Function: 清空 Firestore lineKeywordMappings collection
 * HTTP Trigger: 訪問 URL 即可執行
 * 
 * 用途：清空所有關鍵字，準備重新寫入
 * 註：通常與 rebuildKeywords 配合使用
 */

const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const logger = require('firebase-functions/logger');

// 初始化 Firebase Admin（只初始化一次）
if (admin.apps.length === 0) {
  admin.initializeApp();
}

/**
 * Cloud Function HTTP Handler
 */
exports.clearKeywords = onRequest(
  {
    region: 'asia-east2',
    cors: true
  },
  async (req, res) => {
    logger.info('🗑️  開始清空關鍵字...');
    
    const db = admin.firestore();
    const collection = db.collection('lineKeywordMappings');
    
    const output = [];
    
    try {
      output.push('🗑️  步驟 1：掃描現有關鍵字...');
      
      const snapshot = await collection.get();
      const totalCount = snapshot.size;
      
      output.push(`📊 找到 ${totalCount} 個關鍵字`);
      logger.info(`找到 ${totalCount} 個關鍵字`);
      
      if (totalCount === 0) {
        output.push('✅ Collection 已經是空的，無需清空');
        output.push('');
        output.push('='.repeat(60));
        output.push('✨ 完成！可以直接執行 rebuildKeywords');
        
        res.status(200).send('<pre>' + output.join('\n') + '</pre>');
        return;
      }
      
      output.push('');
      output.push('🗑️  步驟 2：批量刪除...');
      
      // 批量刪除（每批500個，Firestore限制）
      const batchSize = 500;
      let deletedCount = 0;
      const docs = snapshot.docs;
      
      for (let i = 0; i < docs.length; i += batchSize) {
        const batch = db.batch();
        const batchDocs = docs.slice(i, i + batchSize);
        
        batchDocs.forEach(doc => {
          batch.delete(doc.ref);
        });
        
        await batch.commit();
        deletedCount += batchDocs.length;
        
        output.push(`🗑️  已刪除 ${deletedCount}/${totalCount} 筆`);
        logger.info(`已刪除 ${deletedCount}/${totalCount} 筆`);
      }
      
      output.push('');
      output.push('='.repeat(60));
      output.push('📊 執行結果：');
      output.push(`   ✅ 成功刪除：${deletedCount} 個關鍵字`);
      output.push('='.repeat(60));
      output.push('');
      output.push('🎉 清空完成！');
      output.push('');
      output.push('📝 下一步：執行 rebuildKeywords 重建 19 個關鍵字');
      output.push('   URL: /rebuildKeywords');
      
      logger.info('清空成功！');
      res.status(200).send('<pre>' + output.join('\n') + '</pre>');
      
    } catch (error) {
      logger.error('清空失敗:', error);
      output.push('');
      output.push('❌ 清空失敗: ' + error.message);
      res.status(500).send('<pre>' + output.join('\n') + '</pre>');
    }
  }
);
