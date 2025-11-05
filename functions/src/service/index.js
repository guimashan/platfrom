/**
 * Service Functions
 * 處理法會報名、神服服務等功能
 */

const {onRequest} = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const {logger} = require('firebase-functions/v2');

/**
 * 提交報名表單
 * 處理所有服務類型的報名（DD, ND, LD, QJ, ZY, PS, FTP, FTY, FTC, BG, XY）
 */
exports.submitRegistration = onRequest(
    {
      region: 'asia-east2',
      cors: true,
    },
    async (req, res) => {
      try {
        // 驗證請求方法
        if (req.method !== 'POST') {
          res.status(405).json({error: {message: 'Method not allowed'}});
          return;
        }

        // 驗證 Authorization Token
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          res.status(401).json({error: {message: 'Unauthorized'}});
          return;
        }

        const idToken = authHeader.split('Bearer ')[1];
        
        // 驗證 Firebase ID Token
        let decodedToken;
        try {
          decodedToken = await admin.auth().verifyIdToken(idToken);
        } catch (error) {
          logger.error('Token 驗證失敗:', error);
          res.status(401).json({error: {message: 'Invalid token'}});
          return;
        }

        // 取得請求資料
        const {data} = req.body;
        const {
          serviceType,
          contactInfo,
          applicants,
          paymentInfo,
          otherNote,
          totalAmount,
          userId,
        } = data;

        // 驗證必要欄位
        if (!serviceType || !contactInfo || !totalAmount) {
          res.status(400).json({
            error: {message: '缺少必要欄位'},
          });
          return;
        }

        // 生成訂單編號
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
        const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        const orderId = `${serviceType.toUpperCase()}-${dateStr}-${randomNum}`;

        // 準備寫入資料
        const registrationData = {
          orderId: orderId,
          serviceType: serviceType,
          contactInfo: contactInfo,
          applicants: applicants || [],
          paymentInfo: {
            cardHolderName: paymentInfo.cardHolderName,
            cardNumberLast4: paymentInfo.cardNumber.slice(-4),
            cardExpiry: paymentInfo.cardExpiry,
          },
          otherNote: otherNote || '',
          totalAmount: totalAmount,
          userId: userId || decodedToken.uid,
          status: 'pending_manual_payment',
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        // 寫入 Firestore
        const docRef = await admin.firestore()
            .collection('registrations')
            .add(registrationData);

        logger.info('報名成功', {
          orderId: orderId,
          serviceType: serviceType,
          docId: docRef.id,
        });

        // 返回成功結果
        res.status(200).json({
          result: {
            orderId: orderId,
            docId: docRef.id,
            timestamp: now.toISOString(),
          },
        });

      } catch (error) {
        logger.error('報名失敗:', error);
        res.status(500).json({
          error: {
            message: error.message || '提交失敗，請稍後再試',
          },
        });
      }
    },
);
