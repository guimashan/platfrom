/**
 * 龜馬山 goLine - 神務服務 API (v2 語法)
 * functions/src/service/index.js
 */

const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp, getApps, getApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");

if (!getApps().length) {
    initializeApp();
}

const db = getFirestore(getApp());

let platformApp;
try {
    platformApp = getApp('platform');
} catch (error) {
    platformApp = initializeApp({
        projectId: 'platform-bc783'
    }, 'platform');
}

const platformDb = getFirestore(platformApp);
const platformAuth = getAuth(platformApp);

/**
 * 生成訂單編號
 * 格式: DD-20251103-0001
 */
async function generateOrderId(serviceType) {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
    
    // 服務類型代碼對應表
    const typeCodeMap = {
        // 新命名（使用訂單編號代碼）
        'dd': 'DD',               // 線上點燈
        'nd': 'ND',               // 年斗法會
        // 舊命名（向下兼容）
        'lightup': 'DD',          // 線上點燈（舊）
        'niandou': 'ND',          // 年斗法會（舊）
        // 其他服務
        'lidou': 'LD',            // 禮斗法會
        'zhongyuan': 'ZY',        // 中元法會
        'pushi': 'PS',            // 普施法會
        'futian': 'FT',           // 福田會
        'futian_youth': 'FTY',    // 福田少年會
        'xiangyou': 'XY',         // 添香油
        'build_temple': 'BG'      // 建宮廟款
    };
    
    const typeCode = typeCodeMap[serviceType] || 'ORDER';
    const counterKey = `${typeCode}-${dateStr}`;
    
    // 使用 Firestore transaction 來確保流水號唯一性
    const counterRef = db.collection('counters').doc(counterKey);
    
    const orderId = await db.runTransaction(async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        
        let nextNumber = 1;
        if (counterDoc.exists) {
            nextNumber = (counterDoc.data().count || 0) + 1;
            transaction.update(counterRef, { count: nextNumber });
        } else {
            transaction.set(counterRef, { 
                count: nextNumber,
                date: dateStr,
                serviceType: typeCode
            });
        }
        
        // 格式化流水號為 4 位數
        const seqNumber = String(nextNumber).padStart(4, '0');
        return `${typeCode}-${dateStr}-${seqNumber}`;
    });
    
    return orderId;
}

async function checkServiceRole(decodedToken) {
    try {
        // 從 ID Token 的 custom claims 中讀取角色
        const roles = decodedToken.roles || [];
        
        console.log('檢查權限 - UID:', decodedToken.uid, '角色:', roles);
        
        const hasPermission = roles.some(role => 
            ['poweruser_service', 'admin_service', 'superadmin'].includes(role)
        );
        
        if (!hasPermission) {
            console.error('權限不足 - UID:', decodedToken.uid, '現有角色:', roles);
            throw new HttpsError('permission-denied', '權限不足，需要 poweruser_service、admin_service 或 superadmin 角色');
        }
        
        return true;
    } catch (error) {
        if (error instanceof HttpsError) throw error;
        console.error('檢查權限失敗:', error);
        throw new HttpsError('internal', '權限檢查失敗');
    }
}

/**
 * 接收所有神務服務的報名
 * 使用 onRequest 並手動驗證 platform-bc783 的 ID Token
 */
exports.submitRegistration = onRequest({ 
    region: 'asia-east2',
    cors: true
}, async (req, res) => {
    try {
        // 驗證 HTTP 方法
        if (req.method !== 'POST') {
            res.status(405).json({ error: { message: '只接受 POST 請求' } });
            return;
        }

        // 從 Authorization header 取得 ID Token
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: { message: '缺少認證 token' } });
            return;
        }

        const idToken = authHeader.split('Bearer ')[1];
        
        // 使用 platform-bc783 的 Auth 驗證 token
        let decodedToken;
        try {
            decodedToken = await platformAuth.verifyIdToken(idToken);
        } catch (error) {
            console.error('Token 驗證失敗:', error);
            res.status(401).json({ error: { message: '認證失敗' } });
            return;
        }

        const uid = decodedToken.uid;
        const data = req.body.data;

        // 驗證資料完整性
        if (!data.serviceType || !data.contactInfo || !data.paymentInfo || !data.totalAmount) {
            console.error("傳入資料不完整", data);
            res.status(400).json({ error: { message: '資料不完整，無法處理。' } });
            return;
        }

        // 驗證使用者 ID 一致性
        if (uid !== data.userId) {
            console.error("ID 不符", { uid, dataUserId: data.userId });
            res.status(403).json({ error: { message: '使用者 ID 不符，權限不足。' } });
            return;
        }

        // 驗證信用卡資訊
        const paymentInfo = data.paymentInfo;
        if (paymentInfo) {
            const cardNumber = (paymentInfo.cardNumber || '').replace(/\s/g, '');
            const cardExpiry = paymentInfo.cardExpiry || '';
            const cardCVV = paymentInfo.cardCVV || '';
            
            if (!/^\d{16}$/.test(cardNumber)) {
                res.status(400).json({ error: { message: '信用卡卡號格式錯誤' } });
                return;
            }
            
            if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) {
                res.status(400).json({ error: { message: '有效期限格式錯誤' } });
                return;
            }
            
            const [month, year] = cardExpiry.split('/').map(Number);
            if (month < 1 || month > 12) {
                res.status(400).json({ error: { message: '月份必須在 01-12 之間' } });
                return;
            }
            
            if (!/^\d{3}$/.test(cardCVV)) {
                res.status(400).json({ error: { message: 'CVV 格式錯誤' } });
                return;
            }
        }

        console.log(`收到來自 ${data.userId} 的 ${data.serviceType} 報名...`);

        // 生成有意義的訂單編號
        const orderId = await generateOrderId(data.serviceType);
        
        // 建立訂單
        const regRef = db.collection('registrations').doc(orderId);
        const secretRef = db.collection('temp_payment_secrets').doc();

        const registrationDoc = {
            serviceType: data.serviceType,
            status: 'pending_manual_payment',
            createdAt: FieldValue.serverTimestamp(),
            userId: data.userId,
            totalAmount: data.totalAmount,
            paymentSecretId: secretRef.id,
            contactInfo: data.contactInfo,
            otherNote: data.otherNote || null,
            ...(data.applicants && { applicants: data.applicants }),
            ...(data.zhongyuanData && { zhongyuanData: data.zhongyuanData }),
            ...(data.membershipInfo && { membershipInfo: data.membershipInfo })
        };

        const secretDoc = {
            registrationId: orderId,
            createdAt: FieldValue.serverTimestamp(),
            paymentInfo: data.paymentInfo
        };

        const batch = db.batch();
        batch.set(regRef, registrationDoc);
        batch.set(secretRef, secretDoc);
        
        await batch.commit();

        console.log(`訂單 ${orderId} 與機密文件 ${secretRef.id} 已成功建立。`);

        res.status(200).json({ result: { success: true, orderId: orderId } });

    } catch (error) {
        console.error("處理報名時發生錯誤:", error);
        res.status(500).json({ error: { message: '伺服器內部錯誤，無法建立訂單。' } });
    }
});

/**
 * 查詢訂單列表（管理後台用）
 * 需要 poweruser_service, admin_service 或 superadmin 權限
 */
exports.getRegistrations = onRequest({ 
    region: 'asia-east2',
    cors: true
}, async (req, res) => {
    try {
        if (req.method !== 'POST') {
            res.status(405).json({ error: { message: '只接受 POST 請求' } });
            return;
        }

        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: { message: '缺少認證 token' } });
            return;
        }

        const idToken = authHeader.split('Bearer ')[1];
        let decodedToken;
        try {
            decodedToken = await platformAuth.verifyIdToken(idToken);
        } catch (error) {
            console.error('Token 驗證失敗:', error);
            res.status(401).json({ error: { message: '認證失敗' } });
            return;
        }

        const uid = decodedToken.uid;
        await checkServiceRole(decodedToken);

        const registrationsSnap = await db.collection('registrations')
            .orderBy('createdAt', 'desc')
            .limit(100)
            .get();

        const registrations = registrationsSnap.docs.map(doc => ({
            orderId: doc.id,
            ...doc.data(),
            paymentSecretId: undefined
        }));

        console.log(`使用者 ${uid} 查詢了 ${registrations.length} 筆訂單`);
        res.status(200).json({ result: { success: true, registrations } });

    } catch (error) {
        console.error('查詢訂單失敗:', error);
        res.status(500).json({ error: { message: error.message || '伺服器錯誤' } });
    }
});

/**
 * 查看單一訂單詳情（含信用卡資訊）
 * 需要 poweruser_service, admin_service 或 superadmin 權限
 */
exports.getRegistrationDetail = onRequest({ 
    region: 'asia-east2',
    cors: true
}, async (req, res) => {
    try {
        if (req.method !== 'POST') {
            res.status(405).json({ error: { message: '只接受 POST 請求' } });
            return;
        }

        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: { message: '缺少認證 token' } });
            return;
        }

        const idToken = authHeader.split('Bearer ')[1];
        let decodedToken;
        try {
            decodedToken = await platformAuth.verifyIdToken(idToken);
        } catch (error) {
            console.error('Token 驗證失敗:', error);
            res.status(401).json({ error: { message: '認證失敗' } });
            return;
        }

        const uid = decodedToken.uid;
        await checkServiceRole(decodedToken);

        const { orderId } = req.body.data || {};
        if (!orderId) {
            res.status(400).json({ error: { message: '缺少訂單編號' } });
            return;
        }

        const regDoc = await db.collection('registrations').doc(orderId).get();
        if (!regDoc.exists) {
            res.status(404).json({ error: { message: '訂單不存在' } });
            return;
        }

        const registration = {
            orderId: regDoc.id,
            ...regDoc.data()
        };

        let paymentSecret = null;
        if (registration.paymentSecretId) {
            const secretDoc = await db.collection('temp_payment_secrets')
                .doc(registration.paymentSecretId)
                .get();
            
            if (secretDoc.exists) {
                paymentSecret = secretDoc.data();
            }
        }

        console.log(`使用者 ${uid} 查看訂單 ${orderId}`);
        res.status(200).json({ 
            result: { 
                success: true, 
                registration, 
                paymentSecret 
            } 
        });

    } catch (error) {
        console.error('查詢訂單詳情失敗:', error);
        res.status(500).json({ error: { message: error.message || '伺服器錯誤' } });
    }
});

/**
 * 確認收款並刪除機密資料
 * 需要 poweruser_service, admin_service 或 superadmin 權限
 */
exports.confirmPayment = onRequest({ 
    region: 'asia-east2',
    cors: true
}, async (req, res) => {
    try {
        if (req.method !== 'POST') {
            res.status(405).json({ error: { message: '只接受 POST 請求' } });
            return;
        }

        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: { message: '缺少認證 token' } });
            return;
        }

        const idToken = authHeader.split('Bearer ')[1];
        let decodedToken;
        try {
            decodedToken = await platformAuth.verifyIdToken(idToken);
        } catch (error) {
            console.error('Token 驗證失敗:', error);
            res.status(401).json({ error: { message: '認證失敗' } });
            return;
        }

        const uid = decodedToken.uid;
        await checkServiceRole(decodedToken);

        const { orderId } = req.body.data || {};
        if (!orderId) {
            res.status(400).json({ error: { message: '缺少訂單編號' } });
            return;
        }

        const regDoc = await db.collection('registrations').doc(orderId).get();
        if (!regDoc.exists) {
            res.status(404).json({ error: { message: '訂單不存在' } });
            return;
        }

        const registration = regDoc.data();
        const paymentSecretId = registration.paymentSecretId;

        const batch = db.batch();
        
        batch.update(db.collection('registrations').doc(orderId), {
            status: 'paid_offline',
            paidAt: FieldValue.serverTimestamp(),
            paidBy: uid,
            paymentSecretId: FieldValue.delete()
        });

        if (paymentSecretId) {
            batch.delete(db.collection('temp_payment_secrets').doc(paymentSecretId));
        }

        await batch.commit();

        console.log(`訂單 ${orderId} 已由使用者 ${uid} 確認收款，機密資料已刪除`);
        res.status(200).json({ result: { success: true } });

    } catch (error) {
        console.error('確認收款失敗:', error);
        res.status(500).json({ error: { message: error.message || '伺服器錯誤' } });
    }
});
