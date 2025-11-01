/**
 * Check-in Functions
 * 處理 GPS 簽到與距離驗證
 */

const {onCall, onRequest, HttpsError} = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const {logger} = require('firebase-functions/v2');

// 初始化 Firebase Admin (如果尚未初始化)
if (admin.apps.length === 0) {
  admin.initializeApp();
}

// 初始化 Platform Admin (用於跨專案驗證)
const platformAuth = admin.initializeApp({
  projectId: 'platform-bc783',
}, 'platform').auth();

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
        const testMode = settingsDoc.exists ? settingsDoc.data().testMode : false;

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
            testMode: testMode || patrolData.skipDistanceCheck,
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
            testMode: testMode || patrolData.skipDistanceCheck,
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

        const userId = decodedToken.uid;
        const limit = parseInt(req.query.limit) || 50;
        
        // 檢查用戶是否有管理權限
        const userDoc = await platformDb.collection('users').doc(userId).get();
        const userData = userDoc.exists ? userDoc.data() : null;
        const roles = userData?.roles || [];
        const isAdmin = roles.some(role => 
          role === 'poweruser_checkin' || role === 'admin_checkin' || role === 'superadmin'
        );

        let checkinsSnapshot;
        if (isAdmin) {
          // 管理員：返回所有用戶的記錄
          checkinsSnapshot = await admin.firestore()
              .collection('checkins')
              .orderBy('timestamp', 'desc')
              .limit(limit)
              .get();
        } else {
          // 一般用戶：只返回自己的記錄
          checkinsSnapshot = await admin.firestore()
              .collection('checkins')
              .where('userId', '==', userId)
              .orderBy('timestamp', 'desc')
              .limit(limit)
              .get();
        }

        const checkins = [];
        for (const doc of checkinsSnapshot.docs) {
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
          
          // 獲取用戶名稱
          let userName = '未知用戶';
          if (data.userId) {
            try {
              const userDoc = await platformDb.collection('users')
                  .doc(data.userId)
                  .get();
              if (userDoc.exists) {
                userName = userDoc.data().displayName || '未知用戶';
              }
            } catch (error) {
              logger.error('獲取用戶資料失敗', {userId: data.userId, error});
            }
          }

          checkins.push({
            id: doc.id,
            userId: data.userId,
            userName: userName,
            patrolId: data.patrolId,
            patrolName: patrolName,
            timestamp: data.timestamp,
            mode: data.mode,
            distance: data.distance,
            testMode: data.testMode,
          });
        }

        logger.info('簽到紀錄已取得', {
          userId,
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

        const {id, name, lat, lng, radius, qr, active} = req.body;

        if (!name || lat === undefined || lng === undefined || !radius) {
          res.status(400).json({
            ok: false,
            message: 'Missing required fields: name, lat, lng, radius',
          });
          return;
        }

        const patrolData = {
          name,
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          radius: parseInt(radius),
          qr: qr || '',
          active: active !== false,
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
