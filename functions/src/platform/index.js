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
 * 使用 LINE Login Web API（非 LIFF）
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
        const idToken = tokenData.id_token;

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

        // Step 2.5: 驗證 ID Token 並取得 Email (如果有請求 email scope)
        let userEmail = null;
        if (idToken) {
          try {
            const verifyResponse = await fetch('https://api.line.me/oauth2/v2.1/verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: new URLSearchParams({
                id_token: idToken,
                client_id: lineChannelId.value(),
              }),
            });

            if (verifyResponse.ok) {
              const verifyData = await verifyResponse.json();
              userEmail = verifyData.email || null;
              logger.info('從 ID Token 取得 Email', {email: userEmail});
            }
          } catch (emailError) {
            logger.warn('無法取得 Email', emailError);
          }
        }

        logger.info('LINE 使用者資料已取得', {lineUserId, displayName, email: userEmail});

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
          
          // 只在有 Email 時才加入 email
          if (userEmail) {
            userData.email = userEmail;
          }
          
          await userRef.set(userData);
          userRoles = ['user'];
          logger.info('新使用者已建立', {lineUserId, roles: userRoles, email: userEmail});
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
          
          // 只在有 Email 時才更新 email
          if (userEmail) {
            updateData.email = userEmail;
          }
          
          await userRef.update(updateData);
          logger.info('使用者登入時間已更新', {lineUserId, roles: userRoles, email: userEmail});
        }
        
        // Step 5: 設置 Auth custom claims（確保跨專案能讀取角色）
        await admin.auth().setCustomUserClaims(lineUserId, {
          roles: userRoles,
        });
        
        // Step 6: 產生包含 roles 的 Firebase Custom Token
        const customToken = await admin.auth().createCustomToken(lineUserId, {
          roles: userRoles,
        });
        
        logger.info('Custom Token 已產生，custom claims 已設置', {lineUserId, roles: userRoles});

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

        // 同時更新 Auth custom claims
        await admin.auth().setCustomUserClaims(targetUserId, {
          roles: roles,
        });

        logger.warn('使用者角色已更新（Firestore + Auth custom claims）', {
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

/**
 * 輔助函數：記錄操作日誌到 admin_logs 集合
 */
async function writeAdminLog(operatorId, operatorName, targetUserId, targetUserName, action, changes, meta) {
  try {
    await admin.firestore().collection('admin_logs').add({
      operatorId,
      operatorName,
      targetUserId,
      targetUserName,
      action,
      changes,
      meta,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    logger.error('寫入操作日誌失敗', error);
  }
}

/**
 * 列出管理用戶（僅 superadmin - 安全強化）
 */
exports.listManageUsers = onRequest(
    {
      region: 'asia-east2',
      cors: true,
    },
    async (req, res) => {
      try {
        if (req.method !== 'GET') {
          res.status(405).json({ok: false, message: 'Only GET method is allowed'});
          return;
        }

        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          res.status(401).json({ok: false, message: 'Unauthorized'});
          return;
        }

        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const callerId = decodedToken.uid;

        // 雙重驗證：檢查 Auth custom claims
        const callerClaims = decodedToken.roles || [];
        if (!callerClaims.includes('superadmin')) {
          res.status(403).json({ok: false, message: 'Auth claims: only superadmin can list users'});
          return;
        }

        // 雙重驗證：檢查 Firestore roles
        const callerDoc = await admin.firestore().collection('users').doc(callerId).get();
        if (!callerDoc.exists) {
          res.status(403).json({ok: false, message: 'Caller user not found'});
          return;
        }

        const callerRoles = callerDoc.data()?.roles || [];
        if (!callerRoles.includes('superadmin')) {
          res.status(403).json({ok: false, message: 'Firestore roles: only superadmin can list users'});
          return;
        }

        const pageSize = parseInt(req.query.pageSize) || 50;
        const roleFilter = req.query.role;
        const cursor = req.query.cursor;  // 接收分頁游標

        // 建立查詢（不在記憶體中篩選）
        let query = admin.firestore().collection('users').orderBy('createdAt', 'desc');

        // 角色篩選（如果提供）
        if (roleFilter) {
          query = query.where('roles', 'array-contains', roleFilter);
        }

        // 分頁游標（如果提供）
        if (cursor) {
          const cursorDoc = await admin.firestore().collection('users').doc(cursor).get();
          if (cursorDoc.exists) {
            query = query.startAfter(cursorDoc);
          }
        }

        // 執行查詢
        query = query.limit(pageSize + 1);  // 多取一筆判斷是否有下一頁
        const snapshot = await query.get();

        const hasMore = snapshot.docs.length > pageSize;
        const users = snapshot.docs.slice(0, pageSize).map((doc) => {
          const data = doc.data();
          return {
            userId: doc.id,
            displayName: data.displayName || '-',
            email: data.email || null,
            photoURL: data.photoURL || null,
            roles: data.roles || [],
            createdAt: data.createdAt,
            lastLoginAt: data.lastLoginAt,
          };
        });

        res.status(200).json({
          ok: true,
          users,
          total: users.length,
          hasMore,
          nextCursor: hasMore ? snapshot.docs[pageSize - 1].id : null,  // 使用最後一個文檔的 ID
        });
      } catch (error) {
        logger.error('列出用戶失敗', error);
        res.status(500).json({ok: false, message: `Failed to list users: ${error.message}`});
      }
    },
);

/**
 * 更新用戶角色（僅 superadmin，增強版 - 安全強化）
 */
exports.updateUserRoles = onRequest(
    {
      region: 'asia-east2',
      cors: true,
    },
    async (req, res) => {
      try {
        if (req.method !== 'POST') {
          res.status(405).json({ok: false, message: 'Only POST method is allowed'});
          return;
        }

        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          res.status(401).json({ok: false, message: 'Unauthorized'});
          return;
        }

        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const callerId = decodedToken.uid;

        // 雙重驗證：檢查 Auth custom claims
        const callerClaims = decodedToken.roles || [];
        if (!callerClaims.includes('superadmin')) {
          res.status(403).json({ok: false, message: 'Auth claims: only superadmin can update roles'});
          return;
        }

        // 雙重驗證：檢查 Firestore roles（防止過期 token）
        const callerDoc = await admin.firestore().collection('users').doc(callerId).get();
        if (!callerDoc.exists) {
          res.status(403).json({ok: false, message: 'Caller user not found'});
          return;
        }

        const callerRoles = callerDoc.data()?.roles || [];
        const callerName = callerDoc.data()?.displayName || callerId;

        if (!callerRoles.includes('superadmin')) {
          res.status(403).json({ok: false, message: 'Firestore roles: only superadmin can update roles'});
          return;
        }

        const {targetUserId, roles} = req.body;

        if (!targetUserId || !roles || !Array.isArray(roles)) {
          res.status(400).json({ok: false, message: 'Invalid targetUserId or roles'});
          return;
        }

        // 防止自我降級
        if (targetUserId === callerId && callerRoles.includes('superadmin') && !roles.includes('superadmin')) {
          res.status(403).json({ok: false, message: 'Cannot remove your own superadmin role'});
          return;
        }

        // 使用 transaction 確保原子性並防止競爭條件
        // 使用 superadmin_count 計數器避免 where 查詢限制
        await admin.firestore().runTransaction(async (transaction) => {
          const targetRef = admin.firestore().collection('users').doc(targetUserId);
          const countRef = admin.firestore().collection('system_metadata').doc('superadmin_count');

          // 讀取目標用戶和計數器
          const targetDoc = await transaction.get(targetRef);
          const countDoc = await transaction.get(countRef);

          if (!targetDoc.exists) {
            throw new Error('Target user not found');
          }

          const previousRoles = targetDoc.data()?.roles || [];
          const targetName = targetDoc.data()?.displayName || targetUserId;
          const currentCount = countDoc.exists ? (countDoc.data()?.count || 0) : 0;

          // 計算角色變更對 superadmin 數量的影響
          const hadSuperadmin = previousRoles.includes('superadmin');
          const willHaveSuperadmin = roles.includes('superadmin');

          let countDelta = 0;
          if (hadSuperadmin && !willHaveSuperadmin) {
            countDelta = -1;  // 移除 superadmin
          } else if (!hadSuperadmin && willHaveSuperadmin) {
            countDelta = +1;  // 新增 superadmin
          }

          const newCount = currentCount + countDelta;

          // 防止移除最後一個 superadmin
          if (newCount < 1) {
            throw new Error('Cannot remove the last superadmin');
          }

          // 更新 Firestore
          transaction.update(targetRef, {
            roles: roles,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          // 更新 superadmin 計數器
          if (countDelta !== 0) {
            if (countDoc.exists) {
              transaction.update(countRef, {count: newCount});
            } else {
              // 初始化計數器（第一次使用）
              transaction.set(countRef, {count: Math.max(newCount, 1)});
            }
          }

          // 計算變更（用於日誌）
          const added = roles.filter((r) => !previousRoles.includes(r));
          const removed = previousRoles.filter((r) => !roles.includes(r));

          // 記錄日誌（在 transaction 外部，失敗不影響主要操作）
          setImmediate(async () => {
            try {
              await writeAdminLog(
                  callerId,
                  callerName,
                  targetUserId,
                  targetName,
                  'update_roles',
                  {added, removed},
                  {previousRoles, newRoles: roles}
              );
            } catch (logError) {
              logger.error('寫入日誌失敗', logError);
            }
          });

          // 返回變更資訊（供後續使用）
          return {previousRoles, targetName, added, removed};
        });

        // Transaction 成功後，更新 Auth custom claims
        try {
          await admin.auth().setCustomUserClaims(targetUserId, {roles: roles});
        } catch (authError) {
          logger.error('更新 Auth custom claims 失敗，但 Firestore 已更新', authError);
          // 不拋出錯誤，因為 Firestore 已更新，claims 會在下次登入時同步
        }

        logger.info('用戶角色已更新', {callerId, targetUserId, newRoles: roles});

        res.status(200).json({ok: true, userId: targetUserId, roles: roles});
      } catch (error) {
        logger.error('更新用戶角色失敗', error);
        res.status(500).json({ok: false, message: `Failed to update roles: ${error.message}`});
      }
    },
);

/**
 * 取得操作日誌（僅 superadmin - 安全強化）
 */
exports.getUserActivityLog = onRequest(
    {
      region: 'asia-east2',
      cors: true,
    },
    async (req, res) => {
      try {
        if (req.method !== 'GET') {
          res.status(405).json({ok: false, message: 'Only GET method is allowed'});
          return;
        }

        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          res.status(401).json({ok: false, message: 'Unauthorized'});
          return;
        }

        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const callerId = decodedToken.uid;

        // 雙重驗證：檢查 Auth custom claims
        const callerClaims = decodedToken.roles || [];
        if (!callerClaims.includes('superadmin')) {
          res.status(403).json({ok: false, message: 'Auth claims: only superadmin can view activity logs'});
          return;
        }

        // 雙重驗證：檢查 Firestore roles
        const callerDoc = await admin.firestore().collection('users').doc(callerId).get();
        if (!callerDoc.exists) {
          res.status(403).json({ok: false, message: 'Caller user not found'});
          return;
        }

        const callerRoles = callerDoc.data()?.roles || [];
        if (!callerRoles.includes('superadmin')) {
          res.status(403).json({ok: false, message: 'Firestore roles: only superadmin can view activity logs'});
          return;
        }

        const pageSize = parseInt(req.query.pageSize) || 50;
        const targetUserId = req.query.targetUserId;
        const cursor = req.query.cursor;  // 接收分頁游標

        // 建立查詢
        let query = admin.firestore().collection('admin_logs');

        // 用戶篩選（如果提供）
        if (targetUserId) {
          // 如果有 targetUserId 篩選，需要使用複合索引
          query = query.where('targetUserId', '==', targetUserId).orderBy('timestamp', 'desc');
        } else {
          // 否則只按時間排序
          query = query.orderBy('timestamp', 'desc');
        }

        // 分頁游標（如果提供）
        if (cursor) {
          const cursorDoc = await admin.firestore().collection('admin_logs').doc(cursor).get();
          if (cursorDoc.exists) {
            query = query.startAfter(cursorDoc);
          }
        }

        // 分頁：多取一筆判斷是否有下一頁
        query = query.limit(pageSize + 1);
        const snapshot = await query.get();

        const hasMore = snapshot.docs.length > pageSize;
        const logs = snapshot.docs.slice(0, pageSize).map((doc) => ({
          logId: doc.id,
          ...doc.data(),
        }));

        res.status(200).json({
          ok: true,
          logs,
          total: logs.length,
          hasMore,
          nextCursor: hasMore ? snapshot.docs[pageSize - 1].id : null,  // 使用最後一個文檔的 ID
        });
      } catch (error) {
        logger.error('取得操作日誌失敗', error);
        
        // 如果是索引錯誤，提供更詳細的錯誤訊息
        if (error.code === 9 || error.message.includes('index')) {
          res.status(500).json({
            ok: false,
            message: 'Missing Firestore index. Please create the required composite index for admin_logs.',
            details: error.message,
          });
        } else {
          res.status(500).json({ok: false, message: `Failed to get activity log: ${error.message}`});
        }
      }
    },
);
