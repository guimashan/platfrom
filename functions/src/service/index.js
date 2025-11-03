/**
 * 龜馬山 goLine - 神務服務 API (v2 語法)
 * functions/src/service/index.js
 */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp, getApps, getApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

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

async function checkServiceRole(uid) {
    try {
        const userDoc = await platformDb.collection('users').doc(uid).get();
        if (!userDoc.exists) {
            throw new HttpsError('not-found', '使用者資料不存在');
        }

        const userData = userDoc.data();
        const roles = userData.roles || [];
        
        const hasPermission = roles.some(role => 
            ['poweruser_service', 'admin_service', 'superadmin'].includes(role)
        );
        
        if (!hasPermission) {
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
 * 這是一個 Callable Function，專門給前端頁面呼叫
 * 自動驗證使用者是否登入
 */
exports.submitRegistration = onCall({ 
    region: 'asia-east2'
}, async (request) => {

    if (!request.auth) {
        console.error("未驗證的呼叫", request);
        throw new HttpsError('unauthenticated', '使用者未登入，禁止存取。');
    }

    const data = request.data;
    const auth = request.auth;

    if (!data.serviceType || !data.contactInfo || !data.paymentInfo || !data.totalAmount) {
        console.error("傳入資料不完整", data);
        throw new HttpsError('invalid-argument', '資料不完整，無法處理。');
    }

    if (auth.uid !== data.userId) {
        console.error("ID 不符", { auth: auth.uid, data: data.userId });
        throw new HttpsError('permission-denied', '使用者 ID 不符，權限不足。');
    }

    const paymentInfo = data.paymentInfo;
    if (paymentInfo) {
        const cardNumber = (paymentInfo.cardNumber || '').replace(/\s/g, '');
        const cardExpiry = paymentInfo.cardExpiry || '';
        const cardCVV = paymentInfo.cardCVV || '';
        
        if (!/^\d{16}$/.test(cardNumber)) {
            throw new HttpsError('invalid-argument', '信用卡卡號格式錯誤');
        }
        
        if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) {
            throw new HttpsError('invalid-argument', '有效期限格式錯誤');
        }
        
        const [month, year] = cardExpiry.split('/').map(Number);
        if (month < 1 || month > 12) {
            throw new HttpsError('invalid-argument', '月份必須在 01-12 之間');
        }
        
        if (!/^\d{3}$/.test(cardCVV)) {
            throw new HttpsError('invalid-argument', 'CVV 格式錯誤');
        }
    }

    console.log(`收到來自 ${data.userId} 的 ${data.serviceType} 報名...`);

    try {
        const regRef = db.collection('registrations').doc();
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
            registrationId: regRef.id,
            createdAt: FieldValue.serverTimestamp(),
            paymentInfo: data.paymentInfo
        };

        const batch = db.batch();
        batch.set(regRef, registrationDoc);
        batch.set(secretRef, secretDoc);
        
        await batch.commit();

        console.log(`訂單 ${regRef.id} 與機密文件 ${secretRef.id} 已成功建立。`);

        return { success: true, orderId: regRef.id };

    } catch (error) {
        console.error("寫入資料庫失敗:", error);
        throw new HttpsError('internal', '伺服器內部錯誤，無法建立訂單。');
    }
});

/**
 * 查詢訂單列表（管理後台用）
 * 需要 poweruser_service, admin_service 或 superadmin 權限
 */
exports.getRegistrations = onCall({
    region: 'asia-east2'
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', '使用者未登入');
    }

    await checkServiceRole(request.auth.uid);

    try {
        const registrationsSnap = await db.collection('registrations')
            .orderBy('createdAt', 'desc')
            .limit(100)
            .get();

        const registrations = registrationsSnap.docs.map(doc => ({
            orderId: doc.id,
            ...doc.data(),
            paymentSecretId: undefined
        }));

        console.log(`使用者 ${request.auth.uid} 查詢了 ${registrations.length} 筆訂單`);
        return { success: true, registrations };

    } catch (error) {
        console.error('查詢訂單失敗:', error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', '伺服器錯誤');
    }
});

/**
 * 查看單一訂單詳情（含信用卡資訊）
 * 需要 poweruser_service, admin_service 或 superadmin 權限
 */
exports.getRegistrationDetail = onCall({
    region: 'asia-east2'
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', '使用者未登入');
    }

    await checkServiceRole(request.auth.uid);

    const { orderId } = request.data;
    if (!orderId) {
        throw new HttpsError('invalid-argument', '缺少訂單編號');
    }

    try {
        const regDoc = await db.collection('registrations').doc(orderId).get();
        if (!regDoc.exists) {
            throw new HttpsError('not-found', '訂單不存在');
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

        console.log(`使用者 ${request.auth.uid} 查看訂單 ${orderId}`);
        
        return {
            success: true,
            registration,
            paymentSecret
        };

    } catch (error) {
        console.error('查詢訂單詳情失敗:', error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', '伺服器錯誤');
    }
});

/**
 * 確認收款並刪除機密資料
 * 需要 poweruser_service, admin_service 或 superadmin 權限
 */
exports.confirmPayment = onCall({
    region: 'asia-east2'
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', '使用者未登入');
    }

    await checkServiceRole(request.auth.uid);

    const { orderId } = request.data;
    if (!orderId) {
        throw new HttpsError('invalid-argument', '缺少訂單編號');
    }

    try {
        const regDoc = await db.collection('registrations').doc(orderId).get();
        if (!regDoc.exists) {
            throw new HttpsError('not-found', '訂單不存在');
        }

        const registration = regDoc.data();
        const paymentSecretId = registration.paymentSecretId;

        const batch = db.batch();
        
        batch.update(db.collection('registrations').doc(orderId), {
            status: 'paid_offline',
            paidAt: FieldValue.serverTimestamp(),
            paidBy: request.auth.uid,
            paymentSecretId: FieldValue.delete()
        });

        if (paymentSecretId) {
            batch.delete(db.collection('temp_payment_secrets').doc(paymentSecretId));
        }

        await batch.commit();

        console.log(`訂單 ${orderId} 已由使用者 ${request.auth.uid} 確認收款，機密資料已刪除`);

        return { success: true };

    } catch (error) {
        console.error('確認收款失敗:', error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', '伺服器錯誤');
    }
});
