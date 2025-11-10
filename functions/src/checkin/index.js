/**
 * Check-in Functions
 * 處理 GPS 簽到與距離驗證
 */

const {onCall, onRequest, HttpsError} = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const {logger} = require('firebase-functions/v2');
const {
  generateSecureToken,
  generateQRPayload,
  parseQRPayload,
  shouldRefreshToken,
} = require('./services/qr-generator');
const {
  detectCheckinAnomalies,
} = require('./services/anomaly-detector');

// 初始化 Firebase Admin (如果尚未初始化)
if (admin.apps.length === 0) {
  admin.initializeApp();
}

// 初始化 Platform Admin (用於跨專案驗證)
const platformApp = admin.initializeApp({
  projectId: 'platform-bc783',
}, 'platform');
const platformAuth = platformApp.auth();
const platformDb = platformApp.firestore();

/**
 * 計算兩個 GPS 座標之間的距離 (公尺)
 * 使用 Haversine 公式
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // 地球半徑 (公尺)
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * 初始化預設巡邏點資料
 * 建立辦公室等預設巡邏點
 */
exports.initializeDefaultPatrols = onCall(
    {region: 'asia-east2'},
    async (request) => {
      try {
        // 驗證使用者是否已登入且為管理員
        if (!request.auth || !request.auth.uid) {
          throw new HttpsError(
              'unauthenticated',
              'User must be authenticated',
          );
        }

        // 檢查是否已有巡邏點資料
        const patrolsSnapshot = await admin.firestore()
            .collection('patrols')
            .get();

        if (!patrolsSnapshot.empty) {
          return {
            ok: true,
            message: '巡邏點資料已存在',
            count: patrolsSnapshot.size,
          };
        }

        // 建立預設巡邏點：辦公室
        // TODO: 請將經緯度更新為實際的辦公室位置
        const defaultPatrols = [
          {
            name: '辦公室',
            lat: 24.1375,   // 龜馬山附近（請更新為實際座標）
            lng: 120.6736,  // 龜馬山附近（請更新為實際座標）
            tolerance: 50,  // 容許範圍 50 公尺
            active: true,
            description: '龜馬山辦公室',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          },
        ];

        // 批次寫入
        const batch = admin.firestore().batch();
        defaultPatrols.forEach((patrol) => {
          const docRef = admin.firestore().collection('patrols').doc();
          batch.set(docRef, patrol);
        });

        await batch.commit();

        logger.info('預設巡邏點已初始化', {
          userId: request.auth.uid,
          count: defaultPatrols.length,
        });

        return {
          ok: true,
          message: '預設巡邏點已建立',
          count: defaultPatrols.length,
          patrols: defaultPatrols.map((p) => p.name),
        };
      } catch (error) {
        logger.error('初始化巡邏點失敗', error);
        
        if (error instanceof HttpsError) {
          throw error;
        }
        
        throw new HttpsError('internal', `初始化失敗: ${error.message}`);
      }
    },
);

/**
 * 驗證簽到距離
 * 檢查使用者 GPS 位置是否在巡邏點容許範圍內
 */
exports.verifyCheckinDistance = onCall(
    {region: 'asia-east2'},
    async (request) => {
      try {
        // 必須經過認證
        if (!request.auth || !request.auth.uid) {
          throw new HttpsError(
              'unauthenticated',
              'User must be authenticated to check in',
          );
        }

        // 使用認證的 UID 作為 userId，忽略傳入的 userId 防止偽造
        const userId = request.auth.uid;
        const {patrolId, lat, lng, mode, qrCode} = request.data;
        const checkinMode = mode || 'gps'; // 'gps' 或 'qr'

        // 驗證必要參數
        if (!patrolId) {
          return {
            ok: false,
            code: '1000_INVALID_REQUEST',
            message: 'Missing patrolId',
          };
        }

        // GPS 模式需要座標
        if (checkinMode === 'gps' && (lat === undefined || lng === undefined)) {
          return {
            ok: false,
            code: '1000_INVALID_REQUEST',
            message: 'GPS mode requires lat and lng',
          };
        }

        // QR Code 模式需要 QR Code
        if (checkinMode === 'qr' && !qrCode) {
          return {
            ok: false,
            code: '1000_INVALID_REQUEST',
            message: 'QR mode requires qrCode',
          };
        }

        // 取得巡邏點資料
        const patrolDoc = await admin.firestore()
            .collection('patrols')
            .doc(patrolId)
            .get();

        if (!patrolDoc.exists) {
          return {
            ok: false,
            code: '3000_NOT_FOUND',
            message: 'Patrol point not found',
          };
        }

        const patrolData = patrolDoc.data();
        
        // QR Code 模式：驗證 QR Code 是否匹配
        if (checkinMode === 'qr') {
          // 為沒有 qr 欄位的巡邏點生成預設值
          const expectedQr = patrolData.qr || `PATROL_${patrolId}`;
          
          if (expectedQr !== qrCode) {
            logger.warn('QR Code 不匹配', {
              userId,
              patrolId,
              expectedQr,
              providedQr: qrCode,
            });
            
            return {
              ok: false,
              code: '1002_INVALID_QR_CODE',
              message: 'QR Code does not match patrol point',
            };
          }
          
          // QR Code 簽到成功，寫入紀錄
          const checkinData = {
            userId: userId,
            patrolId: patrolId,
            qrCode: qrCode,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            mode: 'qr',
          };
          
          await admin.firestore()
              .collection('checkins')
              .add(checkinData);
          
          logger.info('QR Code 簽到成功', {userId, patrolId});
          
          return {
            ok: true,
            mode: 'qr',
            patrolId: patrolId,
            createdAt: new Date().toISOString(),
          };
        }
        
        // GPS 模式：計算距離並驗證
        const tolerance = patrolData.radius || 50; // 預設 50 公尺
        const distance = calculateDistance(
            lat,
            lng,
            patrolData.lat,
            patrolData.lng,
        );

        // 從 Firestore 讀取測試模式設定
        const settingsDoc = await admin.firestore()
            .collection('settings')
            .doc('system')
            .get();
        
        const testMode = settingsDoc.exists ? 
            (settingsDoc.data().testMode || false) : false;

        logger.info('GPS 簽到距離計算', {
          userId,
          patrolId,
          distance,
          tolerance,
          testMode: testMode,
        });

        // 判斷是否在範圍內（測試模式下總是通過）
        if (testMode || distance <= tolerance) {
          // GPS 簽到成功，寫入紀錄
          const checkinData = {
            userId: userId,
            patrolId: patrolId,
            lat: lat,
            lng: lng,
            distance: distance,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            mode: 'gps',
          };

          await admin.firestore()
              .collection('checkins')
              .add(checkinData);

          logger.info('GPS 簽到成功', {userId, patrolId, distance});

          return {
            ok: true,
            mode: 'gps',
            distanceMeters: distance,
            patrolId: patrolId,
            createdAt: new Date().toISOString(),
          };
        } else {
          // 超出範圍
          logger.warn('GPS 簽到失敗 - 超出範圍', {
            userId,
            patrolId,
            distance,
            tolerance,
          });

          return {
            ok: false,
            code: '1001_OUT_OF_RANGE',
            mode: 'gps',
            distanceMeters: distance,
            allowedMeters: tolerance,
          };
        }
      } catch (error) {
        logger.error('簽到驗證失敗', error);
        
        // 如果已經是 HttpsError,直接拋出
        if (error instanceof HttpsError) {
          throw error;
        }
        
        // 其他錯誤包裝為 internal error
        throw new HttpsError('internal', `簽到失敗: ${error.message}`);
      }
    },
);

/**
 * 跨專案認證版本的簽到驗證 (HTTP Endpoint)
 * 接受來自 platform 專案的 ID Token 進行認證
 */
exports.verifyCheckinV2 = onRequest(
    {
      region: 'asia-east2',
      cors: true,
    },
    async (req, res) => {
      try {
        // 只接受 POST 請求
        if (req.method !== 'POST') {
          res.status(405).json({
            ok: false,
            code: '1000_METHOD_NOT_ALLOWED',
            message: 'Only POST method is allowed',
          });
          return;
        }

        // 從 Authorization header 取得 ID Token
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          res.status(401).json({
            ok: false,
            code: '1000_UNAUTHORIZED',
            message: 'Missing or invalid Authorization header',
          });
          return;
        }

        const idToken = authHeader.split('Bearer ')[1];

        // 使用 Platform Admin 驗證 ID Token
        let decodedToken;
        try {
          decodedToken = await platformAuth.verifyIdToken(idToken);
        } catch (error) {
          logger.error('ID Token 驗證失敗', error);
          res.status(401).json({
            ok: false,
            code: '1000_INVALID_TOKEN',
            message: 'Invalid ID Token',
          });
          return;
        }

        const userId = decodedToken.uid;
        const {patrolId, lat, lng, mode, qrCode} = req.body;
        const checkinMode = mode || 'gps';

        // 驗證必要參數
        if (!patrolId) {
          res.status(400).json({
            ok: false,
            code: '1000_INVALID_REQUEST',
            message: 'Missing patrolId',
          });
          return;
        }

        // GPS 模式需要座標
        if (checkinMode === 'gps' && (lat === undefined || lng === undefined)) {
          res.status(400).json({
            ok: false,
            code: '1000_INVALID_REQUEST',
            message: 'GPS mode requires lat and lng',
          });
          return;
        }

        // QR Code 模式需要 QR Code
        if (checkinMode === 'qr' && !qrCode) {
          res.status(400).json({
            ok: false,
            code: '1000_INVALID_REQUEST',
            message: 'QR mode requires qrCode',
          });
          return;
        }

        // 取得巡邏點資料
        const patrolDoc = await admin.firestore()
            .collection('patrols')
            .doc(patrolId)
            .get();

        if (!patrolDoc.exists) {
          res.status(404).json({
            ok: false,
            code: '3000_NOT_FOUND',
            message: 'Patrol point not found',
          });
          return;
        }

        const patrolData = patrolDoc.data();

        // 檢查測試模式
        const settingsDoc = await admin.firestore()
            .collection('settings')
            .doc('system')
            .get();
        const testMode = settingsDoc.exists ? (settingsDoc.data().testMode || false) : false;

        // QR Code 模式
        if (checkinMode === 'qr') {
          const expectedQr = patrolData.qr || `PATROL_${patrolId}`;

          if (expectedQr !== qrCode) {
            logger.warn('QR Code 不匹配', {userId, patrolId});
            res.status(200).json({
              ok: false,
              code: '1002_INVALID_QR_CODE',
              message: 'QR Code does not match patrol point',
            });
            return;
          }

          // QR Code 簽到成功
          const checkinData = {
            userId: userId,
            patrolId: patrolId,
            qrCode: qrCode,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            mode: 'qr',
          };

          await admin.firestore().collection('checkins').add(checkinData);
          logger.info('QR Code 簽到成功', {userId, patrolId});

          res.status(200).json({
            ok: true,
            mode: 'qr',
            patrolId: patrolId,
          });
          return;
        }

        // GPS 模式
        const distance = calculateDistance(
            lat,
            lng,
            patrolData.lat,
            patrolData.lng,
        );

        const tolerance = patrolData.radius || 50;
        
        // 檢查是否略過距離驗證（全局測試模式或巡邏點測試模式）
        const skipCheck = testMode || patrolData.skipDistanceCheck;

        // 測試模式下或距離允許範圍內允許簽到
        if (skipCheck || distance <= tolerance) {
          const checkinData = {
            userId: userId,
            patrolId: patrolId,
            location: new admin.firestore.GeoPoint(lat, lng),
            distance: distance,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            mode: 'gps',
            testMode: Boolean(testMode || patrolData.skipDistanceCheck),
            patrolTestMode: patrolData.skipDistanceCheck || false,
          };

          await admin.firestore().collection('checkins').add(checkinData);

          logger.info('GPS 簽到成功', {
            userId,
            patrolId,
            distance,
            testMode,
            patrolTestMode: patrolData.skipDistanceCheck,
          });

          res.status(200).json({
            ok: true,
            mode: 'gps',
            distanceMeters: distance,
            patrolId: patrolId,
            testMode: Boolean(testMode || patrolData.skipDistanceCheck),
          });
        } else {
          logger.warn('GPS 簽到失敗 - 超出範圍', {
            userId,
            patrolId,
            distance,
            tolerance,
          });

          res.status(200).json({
            ok: false,
            code: '1001_OUT_OF_RANGE',
            mode: 'gps',
            distanceMeters: distance,
            allowedMeters: tolerance,
            message: `超出簽到範圍（距離: ${distance.toFixed(1)}m，允許: ${tolerance}m）`,
          });
        }
      } catch (error) {
        logger.error('簽到驗證失敗', error);
        res.status(500).json({
          ok: false,
          code: '5000_INTERNAL_ERROR',
          message: `簽到失敗: ${error.message}`,
        });
      }
    },
);

/**
 * 驗證 Platform ID Token 的輔助函數
 */
async function verifyPlatformToken(req, res) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      ok: false,
      code: '1000_UNAUTHORIZED',
      message: 'Missing or invalid Authorization header',
    });
    return null;
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await platformAuth.verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    logger.error('ID Token 驗證失敗', error);
    res.status(401).json({
      ok: false,
      code: '1000_INVALID_TOKEN',
      message: 'Invalid ID Token',
    });
    return null;
  }
}

/**
 * 獲取巡邏點列表 (HTTP Endpoint)
 */
exports.getPatrols = onRequest(
    {
      region: 'asia-east2',
      cors: true,
    },
    async (req, res) => {
      try {
        if (req.method !== 'GET') {
          res.status(405).json({
            ok: false,
            message: 'Only GET method is allowed',
          });
          return;
        }

        const decodedToken = await verifyPlatformToken(req, res);
        if (!decodedToken) return;

        const patrolsSnapshot = await admin.firestore()
            .collection('patrols')
            .orderBy('name')
            .get();

        const patrols = [];
        patrolsSnapshot.forEach((doc) => {
          const data = doc.data();
          patrols.push({
            id: doc.id,
            ...data,
            qr: data.qr || `PATROL_${doc.id}`,
          });
        });

        logger.info('巡邏點列表已取得', {
          userId: decodedToken.uid,
          count: patrols.length,
        });

        res.status(200).json({
          ok: true,
          patrols: patrols,
        });
      } catch (error) {
        logger.error('獲取巡邏點列表失敗', error);
        res.status(500).json({
          ok: false,
          message: `獲取巡邏點列表失敗: ${error.message}`,
        });
      }
    },
);

/**
 * 獲取簽到紀錄 (HTTP Endpoint)
 */
exports.getCheckinHistory = onRequest(
    {
      region: 'asia-east2',
      cors: true,
    },
    async (req, res) => {
      try {
        if (req.method !== 'GET') {
          res.status(405).json({
            ok: false,
            message: 'Only GET method is allowed',
          });
          return;
        }

        const decodedToken = await verifyPlatformToken(req, res);
        if (!decodedToken) return;

        const currentUserId = decodedToken.uid;
        const limit = parseInt(req.query.limit) || 50;
        const requestedUserId = req.query.userId;
        
        // 從 platform 數據庫獲取當前用戶角色
        let userRoles = [];
        let userExists = false;
        try {
          const userDoc = await platformDb.collection('users').doc(currentUserId).get();
          userExists = userDoc.exists;
          if (userDoc.exists) {
            const userData = userDoc.data();
            userRoles = userData.roles || [];
            logger.info('用戶角色查詢成功', {
              userId: currentUserId,
              roles: userRoles,
              userData: userData
            });
          } else {
            logger.warn('用戶文檔不存在', {userId: currentUserId});
          }
        } catch (error) {
          logger.error('獲取用戶角色失敗', {userId: currentUserId, error: error.message, stack: error.stack});
        }
        
        // 檢查是否為管理員
        const isAdmin = userRoles.some(role => 
          role === 'superadmin' || role === 'admin_checkin'
        );
        
        logger.info('權限檢查', {
          currentUserId,
          requestedUserId,
          userExists,
          userRoles,
          isAdmin
        });
        
        // 確定要查詢的用戶 ID
        let targetUserId = currentUserId;
        if (requestedUserId) {
          if (!isAdmin) {
            logger.warn('權限不足', {
              currentUserId,
              requestedUserId,
              userRoles,
              isAdmin
            });
            res.status(403).json({
              ok: false,
              message: '您沒有權限查看其他用戶的記錄',
            });
            return;
          }
          targetUserId = requestedUserId;
        }
        
        // 根據角色查詢簽到記錄
        let checkinsQuery = admin.firestore().collection('checkins');
        
        if (!isAdmin || targetUserId) {
          // 普通用戶只能看到自己的記錄，或管理員查看指定用戶的記錄
          checkinsQuery = checkinsQuery.where('userId', '==', targetUserId);
        }
        
        const checkinsSnapshot = await checkinsQuery
            .orderBy('timestamp', 'desc')
            .limit(limit)
            .get();

        // 查詢巡邏點名稱
        const checkins = await Promise.all(checkinsSnapshot.docs.map(async doc => {
          const data = doc.data();
          
          // 查詢巡邏點名稱
          let patrolName = data.patrolId;
          try {
            const patrolDoc = await admin.firestore()
                .collection('patrols')
                .doc(data.patrolId)
                .get();
            if (patrolDoc.exists) {
              patrolName = patrolDoc.data().name || data.patrolId;
            }
          } catch (error) {
            logger.warn('查詢巡邏點名稱失敗', { patrolId: data.patrolId, error: error.message });
          }
          
          return {
            id: doc.id,
            userId: data.userId,
            patrolId: data.patrolId,
            patrolName: patrolName,
            timestamp: data.timestamp,
            mode: data.mode,
            distance: data.distance,
            testMode: data.testMode,
            location: data.location,
          };
        }));

        logger.info('簽到紀錄已取得', {
          currentUserId,
          targetUserId,
          isAdmin,
          count: checkins.length,
        });

        res.status(200).json({
          ok: true,
          checkins: checkins,
        });
      } catch (error) {
        logger.error('獲取簽到紀錄失敗', error);
        res.status(500).json({
          ok: false,
          message: `獲取簽到紀錄失敗: ${error.message}`,
        });
      }
    },
);

/**
 * 獲取測試模式狀態 (HTTP Endpoint)
 */
exports.getTestModeStatus = onRequest(
    {
      region: 'asia-east2',
      cors: true,
    },
    async (req, res) => {
      try {
        if (req.method !== 'GET') {
          res.status(405).json({
            ok: false,
            message: 'Only GET method is allowed',
          });
          return;
        }

        const decodedToken = await verifyPlatformToken(req, res);
        if (!decodedToken) return;

        const settingsDoc = await admin.firestore()
            .collection('settings')
            .doc('system')
            .get();

        const testMode = settingsDoc.exists ?
            (settingsDoc.data().testMode || false) : false;

        res.status(200).json({
          ok: true,
          testMode: testMode,
        });
      } catch (error) {
        logger.error('獲取測試模式狀態失敗', error);
        res.status(500).json({
          ok: false,
          message: `獲取測試模式狀態失敗: ${error.message}`,
        });
      }
    },
);

/**
 * 更新測試模式 (HTTP Endpoint)
 */
exports.updateTestMode = onRequest(
    {
      region: 'asia-east2',
      cors: true,
    },
    async (req, res) => {
      try {
        if (req.method !== 'POST') {
          res.status(405).json({
            ok: false,
            message: 'Only POST method is allowed',
          });
          return;
        }

        const decodedToken = await verifyPlatformToken(req, res);
        if (!decodedToken) return;

        const {testMode} = req.body;

        if (typeof testMode !== 'boolean') {
          res.status(400).json({
            ok: false,
            message: 'testMode must be a boolean',
          });
          return;
        }

        await admin.firestore()
            .collection('settings')
            .doc('system')
            .set({testMode: testMode}, {merge: true});

        logger.info('測試模式已更新', {
          userId: decodedToken.uid,
          testMode,
        });

        res.status(200).json({
          ok: true,
          testMode: testMode,
        });
      } catch (error) {
        logger.error('更新測試模式失敗', error);
        res.status(500).json({
          ok: false,
          message: `更新測試模式失敗: ${error.message}`,
        });
      }
    },
);

/**
 * 儲存巡邏點 (新增或更新) (HTTP Endpoint)
 */
exports.savePatrol = onRequest(
    {
      region: 'asia-east2',
      cors: true,
    },
    async (req, res) => {
      try {
        if (req.method !== 'POST') {
          res.status(405).json({
            ok: false,
            message: 'Only POST method is allowed',
          });
          return;
        }

        const decodedToken = await verifyPlatformToken(req, res);
        if (!decodedToken) return;

        const {
          id,
          name,
          lat,
          lng,
          radius,
          qr,
          active,
          skipDistanceCheck,
          verificationMode,
          minInterval,
          requirePhoto,
          tolerance,
          description,
        } = req.body;

        if (!name || lat === undefined || lng === undefined) {
          res.status(400).json({
            ok: false,
            message: 'Missing required fields: name, lat, lng',
          });
          return;
        }

        const patrolData = {
          name,
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          radius: parseInt(radius) || 50,
          qr: qr || '',
          active: active !== false,
          skipDistanceCheck: skipDistanceCheck || false,
          verificationMode: verificationMode || 'gps',
          minInterval: parseInt(minInterval) || 5,
          requirePhoto: requirePhoto || false,
          tolerance: parseInt(tolerance) || 50,
          description: description || '',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        let patrolId;
        if (id) {
          await admin.firestore()
              .collection('patrols')
              .doc(id)
              .set(patrolData, {merge: true});
          patrolId = id;
          logger.info('巡邏點已更新', {userId: decodedToken.uid, patrolId});
        } else {
          patrolData.createdAt = admin.firestore.FieldValue.serverTimestamp();
          const docRef = await admin.firestore()
              .collection('patrols')
              .add(patrolData);
          patrolId = docRef.id;
          logger.info('巡邏點已新增', {userId: decodedToken.uid, patrolId});
        }

        res.status(200).json({
          ok: true,
          patrolId: patrolId,
        });
      } catch (error) {
        logger.error('儲存巡邏點失敗', error);
        res.status(500).json({
          ok: false,
          message: `儲存巡邏點失敗: ${error.message}`,
        });
      }
    },
);

/**
 * 刪除巡邏點 (HTTP Endpoint)
 */
exports.deletePatrol = onRequest(
    {
      region: 'asia-east2',
      cors: true,
    },
    async (req, res) => {
      try {
        if (req.method !== 'POST') {
          res.status(405).json({
            ok: false,
            message: 'Only POST method is allowed',
          });
          return;
        }

        const decodedToken = await verifyPlatformToken(req, res);
        if (!decodedToken) return;

        const {patrolId} = req.body;

        if (!patrolId) {
          res.status(400).json({
            ok: false,
            message: 'Missing patrolId',
          });
          return;
        }

        await admin.firestore()
            .collection('patrols')
            .doc(patrolId)
            .delete();

        logger.info('巡邏點已刪除', {
          userId: decodedToken.uid,
          patrolId,
        });

        res.status(200).json({
          ok: true,
        });
      } catch (error) {
        logger.error('刪除巡邏點失敗', error);
        res.status(500).json({
          ok: false,
          message: `刪除巡邏點失敗: ${error.message}`,
        });
      }
    },
);

/**
 * 獲取儀表板統計 (HTTP Endpoint)
 */
exports.getDashboardStats = onRequest(
    {
      region: 'asia-east2',
      cors: true,
    },
    async (req, res) => {
      try {
        if (req.method !== 'GET') {
          res.status(405).json({
            ok: false,
            message: 'Only GET method is allowed',
          });
          return;
        }

        const decodedToken = await verifyPlatformToken(req, res);
        if (!decodedToken) return;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [
          patrolsSnapshot,
          todayCheckinsSnapshot,
          allCheckinsSnapshot,
        ] = await Promise.all([
          admin.firestore().collection('patrols').get(),
          admin.firestore()
              .collection('checkins')
              .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(today))
              .get(),
          admin.firestore()
              .collection('checkins')
              .orderBy('timestamp', 'desc')
              .limit(10)
              .get(),
        ]);

        const recentCheckins = [];
        for (const doc of allCheckinsSnapshot.docs) {
          const data = doc.data();
          
          let patrolName = '未知巡邏點';
          if (data.patrolId) {
            const patrolDoc = await admin.firestore()
                .collection('patrols')
                .doc(data.patrolId)
                .get();
            if (patrolDoc.exists) {
              patrolName = patrolDoc.data().name;
            }
          }

          recentCheckins.push({
            id: doc.id,
            userId: data.userId,
            patrolName: patrolName,
            timestamp: data.timestamp,
            mode: data.mode,
          });
        }

        const stats = {
          totalPatrols: patrolsSnapshot.size,
          todayCheckins: todayCheckinsSnapshot.size,
          recentCheckins: recentCheckins,
        };

        res.status(200).json({
          ok: true,
          stats: stats,
        });
      } catch (error) {
        logger.error('獲取儀表板統計失敗', error);
        res.status(500).json({
          ok: false,
          message: `獲取儀表板統計失敗: ${error.message}`,
        });
      }
    },
);

/**
 * 更新巡邏點 QR Code (HTTP Endpoint)
 * 防摸魚功能：定期或手動更新 QR Code 以防止偽造
 */
exports.refreshPatrolQRCode = onRequest(
    {
      region: 'asia-east2',
      cors: true,
    },
    async (req, res) => {
      try {
        if (req.method !== 'POST') {
          res.status(405).json({
            ok: false,
            message: 'Only POST method is allowed',
          });
          return;
        }

        const decodedToken = await verifyPlatformToken(req, res);
        if (!decodedToken) return;

        const {patrolId} = req.body;

        if (!patrolId) {
          res.status(400).json({
            ok: false,
            message: 'Missing patrolId',
          });
          return;
        }

        // 取得巡邏點資料
        const patrolRef = admin.firestore()
            .collection('patrols')
            .doc(patrolId);
        const patrolDoc = await patrolRef.get();

        if (!patrolDoc.exists) {
          res.status(404).json({
            ok: false,
            message: '巡邏點不存在',
          });
          return;
        }

        const patrolData = patrolDoc.data();

        // 檢查是否可以更新（避免過於頻繁）
        const minRotationMinutes = patrolData.minQrRotationMinutes || 15;
        if (!shouldRefreshToken(patrolData.qrTokenUpdatedAt, minRotationMinutes)) {
          res.status(429).json({
            ok: false,
            message: `QR Code 更新過於頻繁，請至少間隔 ${minRotationMinutes} 分鐘`,
          });
          return;
        }

        // 生成新的 QR Token
        const newToken = generateSecureToken();
        const newQRCode = generateQRPayload(patrolId, newToken);
        const newVersion = (patrolData.qrTokenVersion || 0) + 1;

        // 更新巡邏點（使用 transaction 防止競爭條件）
        await admin.firestore().runTransaction(async (transaction) => {
          transaction.update(patrolRef, {
            qr: newQRCode,
            qrToken: newToken,
            qrTokenVersion: newVersion,
            qrTokenUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        });

        logger.info('巡邏點 QR Code 已更新', {
          userId: decodedToken.uid,
          patrolId,
          version: newVersion,
        });

        res.status(200).json({
          ok: true,
          qrCode: newQRCode,
          version: newVersion,
        });
      } catch (error) {
        logger.error('更新 QR Code 失敗', error);
        res.status(500).json({
          ok: false,
          message: `更新 QR Code 失敗: ${error.message}`,
        });
      }
    },
);

/**
 * 批次異常偵測 (HTTP Endpoint)
 * 防摸魚功能：分析最近的簽到記錄，標記異常行為
 */
exports.detectAnomalies = onRequest(
    {
      region: 'asia-east2',
      cors: true,
    },
    async (req, res) => {
      try {
        if (req.method !== 'POST') {
          res.status(405).json({
            ok: false,
            message: 'Only POST method is allowed',
          });
          return;
        }

        const decodedToken = await verifyPlatformToken(req, res);
        if (!decodedToken) return;

        // 取得最近 X 小時的簽到記錄
        const hoursAgo = parseInt(req.body.hoursAgo) || 24;
        const cutoffTimeMs = Date.now() - (hoursAgo * 60 * 60 * 1000);
        const cutoffTime = admin.firestore.Timestamp.fromMillis(cutoffTimeMs);

        const checkinsSnapshot = await admin.firestore()
            .collection('checkins')
            .where('timestamp', '>=', cutoffTime)
            .orderBy('timestamp', 'desc')
            .get();

        logger.info('開始批次異常偵測', {
          hoursAgo,
          totalRecords: checkinsSnapshot.size,
        });

        let anomalyCount = 0;
        const batch = admin.firestore().batch();

        // 按用戶分組檢測
        const userCheckins = {};
        checkinsSnapshot.forEach((doc) => {
          const data = doc.data();
          const userId = data.userId;
          if (!userCheckins[userId]) {
            userCheckins[userId] = [];
          }
          userCheckins[userId].push({
            id: doc.id,
            ref: doc.ref,
            ...data,
          });
        });

        // 檢測每個用戶的簽到異常
        for (const userId in userCheckins) {
          if (Object.hasOwnProperty.call(userCheckins, userId)) {
            const checkins = userCheckins[userId].sort((a, b) => b.timestamp - a.timestamp);

            for (let i = 0; i < checkins.length; i++) {
              const checkin = checkins[i];
              const prevCheckin = i < checkins.length - 1 ? checkins[i + 1] : null;

              // 跳過已標記的異常
              if (checkin.anomaly) continue;

              // 取得巡邏點設定
              let minInterval = 5;
              try {
                const patrolDoc = await admin.firestore()
                    .collection('patrols')
                    .doc(checkin.patrolId)
                    .get();
                if (patrolDoc.exists) {
                  minInterval = patrolDoc.data().minInterval || 5;
                }
              } catch (error) {
                logger.warn('無法取得巡邏點設定', {patrolId: checkin.patrolId});
              }

              // 轉換當前簽到的時間戳
              let currentTimestamp = checkin.timestamp;
              if (typeof currentTimestamp !== 'number') {
                if (currentTimestamp && currentTimestamp.toMillis) {
                  currentTimestamp = currentTimestamp.toMillis();
                } else if (currentTimestamp && currentTimestamp.seconds) {
                  currentTimestamp = currentTimestamp.seconds * 1000;
                } else {
                  currentTimestamp = Date.now();
                }
              }

              // 執行異常偵測
              const anomalyResult = detectCheckinAnomalies({
                lastCheckin: prevCheckin,
                currentTimestamp: currentTimestamp,
                minIntervalMinutes: minInterval,
                currentLat: checkin.location?._latitude || checkin.location?.latitude,
                currentLng: checkin.location?._longitude || checkin.location?.longitude,
                currentPatrolId: checkin.patrolId,
              });

              // 如果有異常，更新記錄
              if (anomalyResult.anomaly) {
                batch.update(checkin.ref, {
                  anomaly: true,
                  anomalyReasons: anomalyResult.anomalyReasons,
                  anomalyScore: anomalyResult.anomalyScore,
                  processedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                anomalyCount++;
              }
            }
          }
        }

        // 批次提交更新
        await batch.commit();

        logger.info('批次異常偵測完成', {
          totalRecords: checkinsSnapshot.size,
          anomalyCount,
        });

        res.status(200).json({
          ok: true,
          totalRecords: checkinsSnapshot.size,
          anomalyCount,
        });
      } catch (error) {
        logger.error('批次異常偵測失敗', error);
        res.status(500).json({
          ok: false,
          message: `批次異常偵測失敗: ${error.message}`,
        });
      }
    },
);
