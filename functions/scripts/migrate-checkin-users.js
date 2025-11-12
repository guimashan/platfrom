/**
 * 批次處理腳本：為有簽到記錄的用戶加上 user_checkin 角色
 * 
 * 執行方式：
 * cd functions
 * node scripts/migrate-checkin-users.js
 */

const admin = require('firebase-admin');

// 初始化 Platform Firebase App (platform-bc783)
const platformApp = admin.initializeApp({
    projectId: 'platform-bc783'
}, 'platform');

const platformDb = admin.firestore(platformApp);
const platformAuth = admin.auth(platformApp);

// 初始化 Checkin Firebase App (checkin-76c77)
const checkinApp = admin.initializeApp({
    projectId: 'checkin-76c77'
}, 'checkin');

const checkinDb = admin.firestore(checkinApp);

async function migrateCheckinUsers() {
    try {
        console.log('🚀 開始批次處理：為有簽到記錄的用戶加上 user_checkin 角色\n');
        
        // Step 1: 從 checkin-76c77 的 checkins collection 取得所有簽到過的用戶 UID
        console.log('📊 Step 1: 查詢所有簽到記錄...');
        const checkinsSnapshot = await checkinDb.collection('checkins').get();
        
        const userIds = new Set();
        checkinsSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.userId) {
                userIds.add(data.userId);
            }
        });
        
        console.log(`✅ 找到 ${userIds.size} 個有簽到記錄的用戶\n`);
        
        if (userIds.size === 0) {
            console.log('⚠️ 沒有簽到記錄，無需處理');
            return;
        }
        
        // Step 2: 為這些用戶加上 user_checkin 角色
        console.log('🔧 Step 2: 開始更新用戶角色...\n');
        
        let updatedCount = 0;
        let alreadyHasRoleCount = 0;
        let notFoundCount = 0;
        let errorCount = 0;
        
        for (const userId of userIds) {
            try {
                const userRef = platformDb.collection('users').doc(userId);
                const userDoc = await userRef.get();
                
                if (!userDoc.exists) {
                    console.log(`⚠️ 用戶 ${userId} 不存在於 platform-bc783，跳過`);
                    notFoundCount++;
                    continue;
                }
                
                const userData = userDoc.data();
                const currentRoles = userData.roles || [];
                
                if (currentRoles.includes('user_checkin')) {
                    console.log(`✓ 用戶 ${userId} (${userData.displayName || '未設定'}) 已有 user_checkin 角色`);
                    alreadyHasRoleCount++;
                    continue;
                }
                
                // 加上 user_checkin 角色
                const newRoles = [...currentRoles, 'user_checkin'];
                
                await userRef.update({
                    roles: newRoles
                });
                
                // 更新 Firebase Auth Custom Claims
                try {
                    await platformAuth.setCustomUserClaims(userId, {
                        roles: newRoles
                    });
                } catch (authError) {
                    console.log(`  ⚠️ 更新 Custom Claims 失敗（可能用戶不存在於 Auth）: ${authError.message}`);
                }
                
                console.log(`✅ 已更新：${userId} (${userData.displayName || '未設定'}) - 角色: ${newRoles.join(', ')}`);
                updatedCount++;
                
            } catch (error) {
                console.error(`❌ 處理用戶 ${userId} 時發生錯誤:`, error.message);
                errorCount++;
            }
        }
        
        // 顯示統計結果
        console.log('\n' + '='.repeat(60));
        console.log('📈 批次處理完成！統計結果：');
        console.log('='.repeat(60));
        console.log(`總用戶數：       ${userIds.size}`);
        console.log(`已更新：         ${updatedCount} 人`);
        console.log(`已有角色（跳過）：${alreadyHasRoleCount} 人`);
        console.log(`用戶不存在：     ${notFoundCount} 人`);
        console.log(`處理錯誤：       ${errorCount} 人`);
        console.log('='.repeat(60));
        
    } catch (error) {
        console.error('❌ 批次處理失敗:', error);
        throw error;
    }
}

// 執行腳本
migrateCheckinUsers()
    .then(() => {
        console.log('\n✅ 腳本執行完成');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ 腳本執行失敗:', error);
        process.exit(1);
    });
