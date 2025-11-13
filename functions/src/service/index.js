/**
 * 龜馬山 goLine - 神務服務 API (v2 語法)
 * functions/src/service/index.js
 */

const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp, getApps, getApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");
const cors = require("cors")({ origin: true });

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
    
    // 服務類型代碼對應表（統一使用簡短小寫）
    const typeCodeMap = {
        'dd': 'DD',        // 線上點燈
        'nd': 'ND',        // 年斗法會
        'ld': 'LD',        // 禮斗法會
        'qj': 'QJ',        // 秋祭法會
        'ps': 'PS',        // 普施法會
        'bg': 'BG',        // 建宮廟款
        'xy': 'XY',        // 添香油
        'zy': 'ZY',        // 中元法會
        'ftp': 'FTP',      // 福田會 個人入會
        'fty': 'FTY',      // 福田少年會 個人入會
        'ftc': 'FTC'       // 福田會 企業團體入會
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

async function checkSuperadminRole(decodedToken) {
    try {
        const roles = decodedToken.roles || [];
        
        console.log('檢查 superadmin 權限 - UID:', decodedToken.uid, '角色:', roles);
        
        if (!roles.includes('superadmin')) {
            console.error('權限不足 - UID:', decodedToken.uid, '現有角色:', roles);
            throw new HttpsError('permission-denied', '權限不足，需要 superadmin 角色');
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
 * 查詢當前用戶的訂單列表（一般用戶用）
 * 只需要登入即可，返回該用戶自己的訂單
 */
exports.getUserRegistrations = onRequest({ 
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

        const registrationsSnap = await db.collection('registrations')
            .where('userId', '==', uid)
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();

        const registrations = [];
        registrationsSnap.forEach(doc => {
            const data = doc.data();
            
            if (data.userId !== uid) {
                console.warn(`⚠️ 訂單 ${doc.id} 的 userId 不符，跳過`);
                return;
            }
            
            registrations.push({
                orderId: doc.id,
                serviceType: data.serviceType,
                status: data.status,
                totalAmount: data.totalAmount,
                createdAt: data.createdAt,
                contactInfo: {
                    name: data.contactInfo?.name || null,
                    phone: data.contactInfo?.phone || null
                }
            });
        });

        console.log(`使用者 ${uid} 查詢了自己的 ${registrations.length} 筆訂單`);
        res.status(200).json({ result: { success: true, registrations } });

    } catch (error) {
        console.error('查詢用戶訂單失敗:', error);
        res.status(500).json({ error: { message: error.message || '伺服器錯誤' } });
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
 * 查看訂單詳情（公開 API，用於成功頁面）
 * 不需要管理員權限，任何人都可以用 orderId 查看基本資訊
 * 不包含敏感資料（信用卡資訊）
 */
exports.getPublicOrderDetail = onRequest({ 
    region: 'asia-east2',
    cors: true
}, async (req, res) => {
    try {
        if (req.method !== 'GET') {
            res.status(405).json({ error: { message: '只接受 GET 請求' } });
            return;
        }

        const orderId = req.query.orderId;
        const serviceType = req.query.service;

        if (!orderId || !serviceType) {
            res.status(400).json({ error: { message: '缺少訂單編號或服務類型' } });
            return;
        }

        const regDoc = await db.collection('registrations').doc(orderId).get();
        
        if (!regDoc.exists) {
            res.status(404).json({ error: { message: '訂單不存在' } });
            return;
        }

        const data = regDoc.data();
        
        // 驗證服務類型是否匹配
        if (data.serviceType !== serviceType) {
            res.status(404).json({ error: { message: '訂單不存在' } });
            return;
        }

        // 只返回基本資訊，不包含敏感資料
        const timestamp = data.createdAt || data.timestamp;
        const publicData = {
            orderId: regDoc.id,
            serviceType: data.serviceType,
            contactName: data.contactName,
            contactPhone: data.contactPhone,
            contactEmail: data.contactEmail,
            contactAddress: data.contactAddress,
            applicants: data.applicants,
            totalAmount: data.totalAmount,
            timestamp: timestamp ? {
                _seconds: timestamp._seconds || Math.floor(timestamp.toMillis() / 1000),
                _nanoseconds: timestamp._nanoseconds || 0
            } : null,
            status: data.status || 'pending',
            otherNote: data.otherNote
        };

        res.status(200).json({ success: true, order: publicData });

    } catch (error) {
        console.error('查詢訂單失敗:', error);
        res.status(500).json({ error: { message: '伺服器錯誤' } });
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

/**
 * 刪除訂單（僅限 superadmin）
 * 用於刪除測試訂單，避免過多測試數據
 */
exports.deleteOrder = onRequest({ 
    region: 'asia-east2'
}, async (req, res) => {
    return cors(req, res, async () => {
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
        
        // 檢查 superadmin 權限
        await checkSuperadminRole(decodedToken);

        const { orderId, reason } = req.body.data || {};
        if (!orderId) {
            res.status(400).json({ error: { message: '缺少訂單編號' } });
            return;
        }

        // 檢查訂單是否存在
        const regDoc = await db.collection('registrations').doc(orderId).get();
        if (!regDoc.exists) {
            res.status(404).json({ error: { message: '訂單不存在' } });
            return;
        }

        const registration = regDoc.data();
        const paymentSecretId = registration.paymentSecretId;

        // 使用 batch 原子性刪除
        const batch = db.batch();
        
        // 刪除訂單文檔
        batch.delete(db.collection('registrations').doc(orderId));

        // 刪除關聯的信用卡機密資料（如果存在）
        if (paymentSecretId) {
            batch.delete(db.collection('temp_payment_secrets').doc(paymentSecretId));
        }

        // 記錄審計日誌
        const auditLogRef = db.collection('audit_logs').doc();
        batch.set(auditLogRef, {
            action: 'delete_order',
            orderId: orderId,
            deletedBy: uid,
            deletedAt: FieldValue.serverTimestamp(),
            reason: reason || '未提供原因',
            orderData: {
                serviceType: registration.serviceType,
                contactName: registration.contactInfo?.name,
                totalAmount: registration.totalAmount,
                status: registration.status,
                createdAt: registration.createdAt
            }
        });

        await batch.commit();

        console.log(`✅ [刪除訂單] 訂單 ${orderId} 已由 superadmin ${uid} 刪除，原因: ${reason || '未提供'}`);
        res.status(200).json({ result: { success: true } });

        } catch (error) {
            console.error('刪除訂單失敗:', error);
            
            // 處理權限錯誤
            if (error instanceof HttpsError && error.code === 'permission-denied') {
                res.status(403).json({ error: { message: error.message } });
                return;
            }
            
            res.status(500).json({ error: { message: error.message || '伺服器錯誤' } });
        }
    });
});

/**
 * 獲取所有服務配置（公開 API）
 * 用於前端檢查服務開放狀態
 */
exports.getServiceConfigs = onRequest({ 
    region: 'asia-east2'
}, async (req, res) => {
    return cors(req, res, async () => {
        try {
            const configsSnapshot = await db.collection('service_configs').get();
            
            if (configsSnapshot.empty) {
                const defaultConfigs = {
                    dd: { serviceType: 'dd', serviceName: '線上點燈', isOpen: true, startDate: null, endDate: null, closedMessage: '' },
                    nd: { serviceType: 'nd', serviceName: '年斗法會', isOpen: true, startDate: null, endDate: null, closedMessage: '' },
                    ld: { serviceType: 'ld', serviceName: '禮斗法會', isOpen: true, startDate: null, endDate: null, closedMessage: '' },
                    zy: { serviceType: 'zy', serviceName: '中元法會', isOpen: true, startDate: null, endDate: null, closedMessage: '' },
                    ps: { serviceType: 'ps', serviceName: '普施法會', isOpen: true, startDate: null, endDate: null, closedMessage: '' },
                    qj: { serviceType: 'qj', serviceName: '秋祭法會', isOpen: true, startDate: null, endDate: null, closedMessage: '' }
                };
                
                const batch = db.batch();
                for (const [key, config] of Object.entries(defaultConfigs)) {
                    batch.set(db.collection('service_configs').doc(key), config);
                }
                await batch.commit();
                
                res.status(200).json({ result: defaultConfigs });
                return;
            }
            
            const configs = {};
            configsSnapshot.forEach(doc => {
                configs[doc.id] = doc.data();
            });
            
            res.status(200).json({ result: configs });
            
        } catch (error) {
            console.error('獲取服務配置失敗:', error);
            res.status(500).json({ error: { message: error.message || '伺服器錯誤' } });
        }
    });
});

/**
 * 更新服務配置（需要管理權限）
 */
exports.updateServiceConfig = onRequest({ 
    region: 'asia-east2'
}, async (req, res) => {
    return cors(req, res, async () => {
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
            
            await checkServicePermission(decodedToken);

            const { serviceType, isOpen, startDate, endDate, closedMessage } = req.body.data || {};
            
            if (!serviceType) {
                res.status(400).json({ error: { message: '缺少服務類型' } });
                return;
            }

            const validTypes = ['dd', 'nd', 'ld', 'zy', 'ps', 'qj'];
            if (!validTypes.includes(serviceType)) {
                res.status(400).json({ error: { message: '無效的服務類型' } });
                return;
            }

            const updateData = {
                serviceType,
                isOpen: isOpen !== undefined ? isOpen : true,
                updatedAt: FieldValue.serverTimestamp(),
                updatedBy: uid
            };

            if (startDate !== undefined) updateData.startDate = startDate;
            if (endDate !== undefined) updateData.endDate = endDate;
            if (closedMessage !== undefined) updateData.closedMessage = closedMessage;

            await db.collection('service_configs').doc(serviceType).set(updateData, { merge: true });

            console.log(`✅ [更新服務配置] ${serviceType} 已由 ${uid} 更新`);
            res.status(200).json({ result: { success: true } });

        } catch (error) {
            console.error('更新服務配置失敗:', error);
            
            if (error instanceof HttpsError && error.code === 'permission-denied') {
                res.status(403).json({ error: { message: error.message } });
                return;
            }
            
            res.status(500).json({ error: { message: error.message || '伺服器錯誤' } });
        }
    });
});

/**
 * 清理舊格式訂單（管理員專用）
 * 使用 HTTP Function 與其他 service API 保持一致
 * 刪除所有 serviceType 不是標準縮寫的訂單
 */
exports.cleanupOldOrders = onRequest({ 
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
        
        // 從 platform DB 獲取用戶資料
        const userDoc = await platformDb.collection('users').doc(uid).get();
        
        if (!userDoc.exists) {
            res.status(404).json({ error: { message: '找不到使用者資料' } });
            return;
        }
        
        const userData = userDoc.data();
        const userRoles = userData.roles || [];
        
        console.log('檢查權限 - UID:', uid, '角色:', userRoles);
        
        // 檢查權限（只允許 superadmin 和 admin_service）
        if (!userRoles.includes('superadmin') && !userRoles.includes('admin_service')) {
            console.error('權限不足 - UID:', uid, '現有角色:', userRoles);
            res.status(403).json({ error: { message: '您沒有執行此操作的權限（僅限 superadmin 和 admin_service）' } });
            return;
        }

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

        console.log('🔍 開始查詢舊格式訂單...');
        
        // 獲取所有訂單
        const snapshot = await db.collection('registrations').get();
        
        console.log(`📊 總共找到 ${snapshot.size} 筆訂單`);
        
        let deleteCount = 0;
        let validCount = 0;
        const oldServiceTypes = [];
        const deletedOrders = [];
        
        // 檢查每筆訂單
        const deletePromises = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            const serviceType = data.serviceType;
            
            // 如果 serviceType 不在標準列表中
            if (!VALID_SERVICE_TYPES.includes(serviceType)) {
                if (!oldServiceTypes.includes(serviceType)) {
                    oldServiceTypes.push(serviceType);
                }
                deletedOrders.push({
                    orderId: doc.id,
                    serviceType: serviceType
                });
                deletePromises.push(doc.ref.delete());
                deleteCount++;
                
                console.log(`❌ 刪除: ${doc.id} (serviceType: ${serviceType})`);
            } else {
                validCount++;
            }
        });
        
        // 執行刪除
        await Promise.all(deletePromises);
        
        const result = {
            success: true,
            summary: {
                totalOrders: snapshot.size,
                validOrders: validCount,
                deletedOrders: deleteCount,
                oldServiceTypes: oldServiceTypes
            },
            deletedDetails: deletedOrders
        };
        
        console.log('✅ 清理完成:', result.summary);
        console.log(`✅ [清理訂單] 由 ${uid} 執行，刪除 ${deleteCount} 筆舊格式訂單`);
        
        res.status(200).json({ result });
        
    } catch (error) {
        console.error('清理失敗:', error);
        res.status(500).json({ error: { message: error.message || '伺服器錯誤' } });
    }
});
