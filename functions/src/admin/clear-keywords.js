/**
 * 清空 Firestore lineKeywordMappings collection 所有文件
 * 用於重置關鍵字資料，準備重新寫入
 */

const admin = require('firebase-admin');

// 初始化 Firebase Admin（如果尚未初始化）
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function clearAllKeywords() {
  try {
    console.log('🗑️  開始清空 lineKeywordMappings collection...');
    
    // 取得所有文件
    const snapshot = await db.collection('lineKeywordMappings').get();
    
    console.log(`📊 找到 ${snapshot.size} 筆關鍵字資料`);
    
    if (snapshot.empty) {
      console.log('✅ Collection 已經是空的，無需清空');
      return;
    }
    
    // 批次刪除（Firestore 批次限制 500）
    const batchSize = 500;
    let deletedCount = 0;
    
    const docs = snapshot.docs;
    for (let i = 0; i < docs.length; i += batchSize) {
      const batch = db.batch();
      const batchDocs = docs.slice(i, i + batchSize);
      
      batchDocs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      deletedCount += batchDocs.length;
      console.log(`🗑️  已刪除 ${deletedCount}/${docs.length} 筆`);
    }
    
    console.log('✅ 清空完成！');
    console.log(`📊 總共刪除 ${deletedCount} 筆關鍵字資料`);
    
  } catch (error) {
    console.error('❌ 清空失敗:', error);
    throw error;
  }
}

// 執行清空
clearAllKeywords()
  .then(() => {
    console.log('\n✅ 腳本執行完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 腳本執行失敗:', error);
    process.exit(1);
  });
