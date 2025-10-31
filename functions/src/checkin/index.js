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
        // 驗證使用者是否已登入
        if (!request.auth || !request.auth.uid) {
          throw new HttpsError(
              'unauthenticated',
              'User must be authenticated to check in',
          );
        }

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
        const tolerance = patrolData.tolerance || 30; // 預設 30 公尺
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
