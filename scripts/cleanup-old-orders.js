/**
 * 清理舊格式訂單腳本
 * 刪除所有 serviceType 不是標準縮寫格式的訂單
 */

const admin = require('firebase-admin');
const serviceAccount = require('../service-b9d4a-firebase-adminsdk.json');

// 初始化 Firebase Admin
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'service-b9d4a'
});

const db = admin.firestore();

// 標準的 11 個服務類型
const VALID_SERVICE_TYPES = [
    'dd',   // 龜馬山一點靈
    'nd',   // 年斗法會
    'ld',   // 禮斗法會
    'zy',   // 中元法會
    'ps',   // 普施法會
    'qj',   // 秋祭法會
    'bg',   // 建宮廟款
    'xy',   // 添香油
    'ftp',  // 福田_信眾個人
    'ftc',  // 福田_企業團體
    'fty'   // 福田_Youth 會
];

async function cleanupOldOrders() {
    try {
        console.log('🔍 開始查詢舊格式訂單...');
        
        // 獲取所有訂單
        const snapshot = await db.collection('registrations').get();
        
        console.log(`📊 總共找到 ${snapshot.size} 筆訂單`);
        
        let deleteCount = 0;
        let validCount = 0;
        const oldServiceTypes = new Set();
        const batch = db.batch();
        let batchCount = 0;
        
        // 檢查每筆訂單
        snapshot.forEach(doc => {
            const data = doc.data();
            const serviceType = data.serviceType;
            
            // 如果 serviceType 不在標準列表中
            if (!VALID_SERVICE_TYPES.includes(serviceType)) {
                oldServiceTypes.add(serviceType);
                batch.delete(doc.ref);
                batchCount++;
                deleteCount++;
                
                console.log(`❌ 將刪除: ${doc.id} (serviceType: ${serviceType})`);
                
                // Firestore batch 最多 500 筆，需要分批
                if (batchCount >= 500) {
                    console.log('⚠️  達到 batch 上限，先提交這批...');
                    batch.commit();
                    batchCount = 0;
                }
            } else {
                validCount++;
            }
        });
        
        // 提交最後一批
        if (batchCount > 0) {
            await batch.commit();
            console.log('✅ 最後一批已提交');
        }
        
        console.log('\n📋 清理結果:');
        console.log(`   ✅ 保留訂單: ${validCount} 筆`);
        console.log(`   ❌ 刪除訂單: ${deleteCount} 筆`);
        console.log('\n🗑️  發現的舊格式 serviceType:');
        oldServiceTypes.forEach(type => {
            console.log(`   - ${type}`);
        });
        
        console.log('\n✅ 清理完成！');
        
    } catch (error) {
        console.error('❌ 清理失敗:', error);
        throw error;
    } finally {
        // 關閉連接
        await admin.app().delete();
    }
}

// 執行清理
cleanupOldOrders()
    .then(() => {
        console.log('🎉 腳本執行完成');
        process.exit(0);
    })
    .catch(error => {
        console.error('💥 腳本執行失敗:', error);
        process.exit(1);
    });
