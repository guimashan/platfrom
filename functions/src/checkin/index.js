/**
 * Check-in Functions
 * 處理 GPS 簽到與距離驗證
 */

const {onCall, HttpsError} = require('firebase-functions/v2/https');
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
exports.verifyCheckinDistance = onCall(
    {region: 'asia-east2'},
    async (request) => {
      try {
        // 驗證使用者是否已登入
        if (!request.auth || !request.auth.uid) {
          throw new HttpsError(
              'unauthenticated',
              'User must be authenticated to check in',
          );
        }

        const userId = request.auth.uid;
        const {patrolId, lat, lng} = request.data;

        // 驗證必要參數
        if (!patrolId || lat === undefined || lng === undefined) {
          return {
            ok: false,
            code: '1000_INVALID_REQUEST',
            message: 'Missing patrolId, lat, or lng',
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

          return {
            ok: true,
            distanceMeters: distance,
            patrolId: patrolId,
            createdAt: new Date().toISOString(),
          };
        } else {
          // 超出範圍
          logger.warn('簽到失敗 - 超出範圍', {
            userId,
            patrolId,
            distance,
            tolerance,
          });

          return {
            ok: false,
            code: '1001_OUT_OF_RANGE',
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
