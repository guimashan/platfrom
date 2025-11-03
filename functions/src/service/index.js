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
