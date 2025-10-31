/**
 * Platform Functions
 * 處理登入、角色管理等平台層功能
 */

const {onRequest} = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const {logger} = require('firebase-functions/v2');

// 初始化 Firebase Admin (只初始化一次)
if (admin.apps.length === 0) {
  admin.initializeApp();
}

/**
 * 產生 Firebase Custom Token
 * 用於 LIFF 登入流程
 */
exports.generateCustomToken = onRequest(
    {region: 'asia-east2', cors: true},
    async (req, res) => {
      try {
        const {lineUserId} = req.body;

        if (!lineUserId) {
          res.status(400).json({
            ok: false,
            code: '1000_INVALID_REQUEST',
            message: 'Missing lineUserId',
          });
          return;
        }

        // 產生 Custom Token
        const customToken = await admin.auth().createCustomToken(lineUserId);

        logger.info('Custom Token 已產生', {lineUserId});

        res.json({
          ok: true,
          firebaseCustomToken: customToken,
        });
      } catch (error) {
        logger.error('產生 Custom Token 失敗', error);
        res.status(500).json({
          ok: false,
          code: '4000_INTERNAL_ERROR',
          message: error.message,
        });
      }
    },
);

/**
 * 更新使用者角色
 * 僅限 admin_* 或 superadmin
 * V3 架構: 支援 roles 陣列操作
 */
exports.updateUserRole = onRequest(
    {region: 'asia-east2', cors: true},
    async (req, res) => {
      try {
        // 驗證 Firebase ID Token
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          res.status(401).json({
            ok: false,
            code: '2001_NOT_AUTHORIZED',
            message: 'Missing or invalid authorization header',
          });
          return;
        }

        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const requestorUid = decodedToken.uid;

        // 取得請求者的角色
        const requestorDoc = await admin.firestore()
            .collection('users')
            .doc(requestorUid)
            .get();

        if (!requestorDoc.exists) {
          res.status(403).json({
            ok: false,
            code: '2001_NOT_AUTHORIZED',
            message: 'Requestor user not found',
          });
          return;
        }

        const requestorRoles = requestorDoc.data().roles || [];

        // 檢查權限: 必須是 superadmin
        const hasPermission = requestorRoles.includes('superadmin');

        if (!hasPermission) {
          logger.warn('未授權的角色更新嘗試', {
            requestorUid,
            requestorRoles,
          });
          res.status(403).json({
            ok: false,
            code: '2001_NOT_AUTHORIZED',
            message: 'User role not permitted for this operation',
          });
          return;
        }

        // 更新目標使用者的角色
        const {targetUserId, roles} = req.body;

        if (!targetUserId || !Array.isArray(roles)) {
          res.status(400).json({
            ok: false,
            code: '1000_INVALID_REQUEST',
            message: 'Missing or invalid targetUserId or roles',
          });
          return;
        }

        await admin.firestore()
            .collection('users')
            .doc(targetUserId)
            .update({
              roles: roles,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

        logger.warn('使用者角色已更新', {
          requestorUid,
          targetUserId,
          newRoles: roles,
        });

        res.json({ok: true});
      } catch (error) {
        logger.error('更新角色失敗', error);
        res.status(500).json({
          ok: false,
          code: '4000_INTERNAL_ERROR',
          message: error.message,
        });
      }
    },
);
