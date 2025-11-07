/**
 * 批量更新關鍵詞的 LIFF URL 格式
 * 將舊格式：https://liff.line.me/ID/liff/service/DD.html
 * 改為新格式：https://liff.line.me/ID?liff.state=/liff/service/DD.html
 */

const admin = require('firebase-admin');

// 初始化 Firebase Admin
const serviceAccount = require('../service-account-key.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// 更新 URL 格式的函數
function convertToNewFormat(oldUrl) {
    if (!oldUrl) return oldUrl;
    
    // 如果已經是新格式，直接返回
    if (oldUrl.includes('liff.state=')) {
        return oldUrl;
    }
    
    // 解析舊格式 URL
    // 例如：https://liff.line.me/2008269293-Nl2pZBpV/liff/service/DD.html
    const match = oldUrl.match(/https:\/\/liff\.line\.me\/([^\/]+)(\/.*)/);
    
    if (match) {
        const liffId = match[1];
        const path = match[2];
        
        // 轉換為新格式
        return `https://liff.line.me/${liffId}?liff.state=${path}`;
    }
    
    return oldUrl;
}

async function updateKeywordUrls() {
    try {
        console.log('🔄 開始更新關鍵詞 LIFF URL...\n');
        
        // 獲取所有關鍵詞
        const snapshot = await db.collection('lineKeywordMappings').get();
        
        if (snapshot.empty) {
            console.log('❌ 沒有找到任何關鍵詞');
            return;
        }
        
        console.log(`📊 找到 ${snapshot.size} 個關鍵詞\n`);
        
        let updatedCount = 0;
        let skippedCount = 0;
        
        // 批次更新
        const batch = db.batch();
        
        snapshot.forEach((doc) => {
            const data = doc.data();
            const oldUrl = data.liffUrl;
            
            if (!oldUrl) {
                console.log(`⚠️  ${data.keyword}: 沒有 LIFF URL，跳過`);
                skippedCount++;
                return;
            }
            
            const newUrl = convertToNewFormat(oldUrl);
            
            if (oldUrl === newUrl) {
                console.log(`✅ ${data.keyword}: 已經是新格式，跳過`);
                skippedCount++;
            } else {
                console.log(`🔧 ${data.keyword}:`);
                console.log(`   舊: ${oldUrl}`);
                console.log(`   新: ${newUrl}\n`);
                
                batch.update(doc.ref, { liffUrl: newUrl });
                updatedCount++;
            }
        });
        
        // 執行批次更新
        if (updatedCount > 0) {
            await batch.commit();
            console.log(`\n✅ 成功更新 ${updatedCount} 個關鍵詞`);
        } else {
            console.log('\n✅ 所有關鍵詞都已經是新格式，無需更新');
        }
        
        console.log(`📊 統計：更新 ${updatedCount} 個，跳過 ${skippedCount} 個`);
        
    } catch (error) {
        console.error('❌ 更新失敗:', error);
        throw error;
    } finally {
        process.exit(0);
    }
}

// 執行更新
updateKeywordUrls();
