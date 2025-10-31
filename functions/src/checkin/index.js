/**
 * Check-in Functions
 * 處理 GPS 簽到與距離驗證
 */

const {onRequest} = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const {logger} = require('firebase-functions/v2');

// 初始化 Firebase Admin (如果尚未初始化)
if (admin.apps.length === 0) {
  admin.initializeApp();
}

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
 * 驗證簽到距離
 * 檢查使用者 GPS 位置是否在巡邏點容許範圍內
 */
exports.verifyCheckinDistance = onRequest(
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
        const userId = decodedToken.uid;

        const {patrolId, lat, lng} = req.body;

        if (!patrolId || lat === undefined || lng === undefined) {
          res.status(400).json({
            ok: false,
            code: '1000_INVALID_REQUEST',
            message: 'Missing patrolId, lat, or lng',
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
        const tolerance = patrolData.tolerance || 30; // 預設 30 公尺

        // 計算距離
        const distance = calculateDistance(
            lat,
            lng,
            patrolData.lat,
            patrolData.lng,
        );

        logger.info('簽到距離計算', {
          userId,
          patrolId,
          distance,
          tolerance,
        });

        // 判斷是否在範圍內
        if (distance <= tolerance) {
          // 簽到成功,寫入紀錄
          const checkinData = {
            userId: userId,
            patrolId: patrolId,
            lat: lat,
            lng: lng,
            distance: distance,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            mode: 'normal',
          };

          await admin.firestore()
              .collection('checkins')
              .add(checkinData);

          logger.info('簽到成功', {userId, patrolId, distance});

          res.json({
            ok: true,
            distanceMeters: distance,
            patrolId: patrolId,
            createdAt: new Date().toISOString(),
          });
        } else {
          // 超出範圍
          logger.warn('簽到失敗 - 超出範圍', {
            userId,
            patrolId,
            distance,
            tolerance,
          });

          res.json({
            ok: false,
            code: '1001_OUT_OF_RANGE',
            distanceMeters: distance,
            allowedMeters: tolerance,
          });
        }
      } catch (error) {
        logger.error('簽到驗證失敗', error);
        res.status(500).json({
          ok: false,
          code: '4000_INTERNAL_ERROR',
          message: error.message,
        });
      }
    },
);
