/**
 * Platform Functions
 * 處理登入、角色管理等平台層功能
 */

const {onRequest} = require('firebase-functions/v2/https');
const {defineSecret} = require('firebase-functions/params');
const admin = require('firebase-admin');
const {logger} = require('firebase-functions/v2');

// 定義 LINE 憑證為 Secrets
const lineChannelId = defineSecret('LINE_CHANNEL_ID');
const lineChannelSecret = defineSecret('LINE_CHANNEL_SECRET');

// 初始化 Firebase Admin (只初始化一次)
if (admin.apps.length === 0) {
  admin.initializeApp();
}

/**
 * LINE 登入授權碼交換 + Firebase Custom Token 產生
 * 方案 B: 使用 LINE Login Web API
 */
exports.generateCustomToken = onRequest(
    {
      region: 'asia-east2',
      cors: true,
      secrets: [lineChannelId, lineChannelSecret],
    },
    async (req, res) => {
      try {
        const {code, redirectUri} = req.body;

        if (!code || !redirectUri) {
          res.status(400).json({
            ok: false,
            code: '1000_INVALID_REQUEST',
            message: 'Missing code or redirectUri',
          });
          return;
        }

        // Step 1: 使用授權碼向 LINE 交換 Access Token
        const tokenResponse = await fetch('https://api.line.me/oauth2/v2.1/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: redirectUri,
            client_id: lineChannelId.value(),
            client_secret: lineChannelSecret.value(),
          }),
        });

        if (!tokenResponse.ok) {
          const errorData = await tokenResponse.json();
          logger.error('LINE Token 交換失敗', errorData);
          res.status(400).json({
            ok: false,
            code: '1001_LINE_TOKEN_ERROR',
            message: errorData.error_description || 'LINE token exchange failed',
          });
          return;
        }

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;

        // Step 2: 使用 Access Token 取得使用者資料
        const profileResponse = await fetch('https://api.line.me/v2/profile', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        if (!profileResponse.ok) {
          logger.error('取得 LINE Profile 失敗');
          res.status(400).json({
            ok: false,
            code: '1002_LINE_PROFILE_ERROR',
            message: 'Failed to get LINE profile',
          });
          return;
        }

        const profile = await profileResponse.json();
        const lineUserId = profile.userId;
        const displayName = profile.displayName;
        const pictureUrl = profile.pictureUrl || null;

        logger.info('LINE 使用者資料已取得', {lineUserId, displayName});

        // Step 3: 取得或建立使用者資料（需要先取得 roles）
        const userRef = admin.firestore().collection('users').doc(lineUserId);
        const userSnap = await userRef.get();
        
        let userRoles = ['user'];
        
        // Step 4: 更新或建立 Firestore 使用者資料

        if (!userSnap.exists) {
          // 新使用者
          const userData = {
            displayName: displayName,
            lineUserId: lineUserId,
            roles: ['user'],
            active: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            lastLogin: admin.firestore.FieldValue.serverTimestamp(),
          };
          
          // 只在有大頭貼時才加入 pictureUrl
          if (pictureUrl) {
            userData.pictureUrl = pictureUrl;
          }
          
          await userRef.set(userData);
          userRoles = ['user'];
          logger.info('新使用者已建立', {lineUserId, roles: userRoles});
        } else {
          // 更新現有使用者
          const userData = userSnap.data();
          userRoles = userData.roles || ['user'];
          
          const updateData = {
            displayName: displayName,
            lastLogin: admin.firestore.FieldValue.serverTimestamp(),
          };
          
          // 只在有大頭貼時才更新 pictureUrl
          if (pictureUrl) {
            updateData.pictureUrl = pictureUrl;
          }
          
          await userRef.update(updateData);
          logger.info('使用者登入時間已更新', {lineUserId, roles: userRoles});
        }
        
        // Step 5: 產生包含 roles 的 Firebase Custom Token
        const customToken = await admin.auth().createCustomToken(lineUserId, {
          roles: userRoles,
        });
        
        logger.info('Custom Token 已產生', {lineUserId, roles: userRoles});

        res.json({
          ok: true,
          firebaseCustomToken: customToken,
          profile: {
            lineUserId: lineUserId,
            displayName: displayName,
            pictureUrl: pictureUrl,
          },
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
