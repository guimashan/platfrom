/**
 * 異常偵測服務
 */

/**
 * 計算兩個 GPS 座標之間的距離 (公尺)
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
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
 * 檢查時間間隔異常
 * @param {Object} lastCheckin - 上次簽到記錄
 * @param {number} currentTimestamp - 當前簽到時間戳（毫秒）
 * @param {number} minIntervalMinutes - 最小間隔（分鐘）
 * @returns {Object} {isAnomaly, reason, score}
 */
function checkIntervalAnomaly(lastCheckin, currentTimestamp, minIntervalMinutes) {
  if (!lastCheckin || !currentTimestamp) {
    return {isAnomaly: false, reason: null, score: 0};
  }

  // 轉換 Firestore Timestamp 為毫秒
  let lastTime = 0;
  if (lastCheckin.timestamp) {
    if (typeof lastCheckin.timestamp === 'number') {
      lastTime = lastCheckin.timestamp;
    } else if (lastCheckin.timestamp.toMillis) {
      lastTime = lastCheckin.timestamp.toMillis();
    } else if (lastCheckin.timestamp.seconds) {
      lastTime = lastCheckin.timestamp.seconds * 1000;
    }
  }

  if (lastTime === 0) {
    return {isAnomaly: false, reason: null, score: 0};
  }

  const diffMinutes = (currentTimestamp - lastTime) / (1000 * 60);

  if (diffMinutes < minIntervalMinutes) {
    const score = Math.min(100, Math.floor((1 - diffMinutes / minIntervalMinutes) * 100));
    return {
      isAnomaly: true,
      reason: `簽到間隔過短 (${Math.round(diffMinutes)} 分鐘 < ${minIntervalMinutes} 分鐘)`,
      score: score,
    };
  }

  return {isAnomaly: false, reason: null, score: 0};
}

/**
 * 檢查位移速度異常
 * @param {Object} lastCheckin - 上次簽到記錄
 * @param {number} currentTimestamp - 當前簽到時間戳（毫秒）
 * @param {number} currentLat - 當前緯度
 * @param {number} currentLng - 當前經度
 * @param {number} maxSpeedKmh - 最大合理速度（公里/小時），預設 100
 * @returns {Object} {isAnomaly, reason, score}
 */
function checkSpeedAnomaly(lastCheckin, currentTimestamp, currentLat, currentLng, maxSpeedKmh = 100) {
  if (!lastCheckin || !lastCheckin.location || !currentTimestamp || !currentLat || !currentLng) {
    return {isAnomaly: false, reason: null, score: 0};
  }

  const lastLat = lastCheckin.location._latitude || lastCheckin.location.latitude;
  const lastLng = lastCheckin.location._longitude || lastCheckin.location.longitude;

  // 轉換 Firestore Timestamp 為毫秒
  let lastTime = 0;
  if (lastCheckin.timestamp) {
    if (typeof lastCheckin.timestamp === 'number') {
      lastTime = lastCheckin.timestamp;
    } else if (lastCheckin.timestamp.toMillis) {
      lastTime = lastCheckin.timestamp.toMillis();
    } else if (lastCheckin.timestamp.seconds) {
      lastTime = lastCheckin.timestamp.seconds * 1000;
    }
  }

  if (lastTime === 0) {
    return {isAnomaly: false, reason: null, score: 0};
  }

  const distance = calculateDistance(lastLat, lastLng, currentLat, currentLng);
  const diffHours = (currentTimestamp - lastTime) / (1000 * 60 * 60);

  if (diffHours === 0 || diffHours < 0) {
    return {isAnomaly: false, reason: null, score: 0};
  }

  const speedKmh = (distance / 1000) / diffHours;

  if (speedKmh > maxSpeedKmh) {
    const score = Math.min(100, Math.floor((speedKmh / maxSpeedKmh) * 50 + 50));
    return {
      isAnomaly: true,
      reason: `移動速度異常 (${Math.round(speedKmh)} km/h > ${maxSpeedKmh} km/h)`,
      score: score,
    };
  }

  return {isAnomaly: false, reason: null, score: 0};
}

/**
 * 檢查重複簽到異常
 * @param {Object} lastCheckin - 上次簽到記錄
 * @param {number} currentTimestamp - 當前簽到時間戳（毫秒）
 * @param {string} currentPatrolId - 當前巡邏點 ID
 * @param {number} minRepeatMinutes - 重複簽到最小間隔（分鐘），預設 60
 * @returns {Object} {isAnomaly, reason, score}
 */
function checkRepeatAnomaly(lastCheckin, currentTimestamp, currentPatrolId, minRepeatMinutes = 60) {
  if (!lastCheckin || !currentTimestamp || lastCheckin.patrolId !== currentPatrolId) {
    return {isAnomaly: false, reason: null, score: 0};
  }

  // 轉換 Firestore Timestamp 為毫秒
  let lastTime = 0;
  if (lastCheckin.timestamp) {
    if (typeof lastCheckin.timestamp === 'number') {
      lastTime = lastCheckin.timestamp;
    } else if (lastCheckin.timestamp.toMillis) {
      lastTime = lastCheckin.timestamp.toMillis();
    } else if (lastCheckin.timestamp.seconds) {
      lastTime = lastCheckin.timestamp.seconds * 1000;
    }
  }

  if (lastTime === 0) {
    return {isAnomaly: false, reason: null, score: 0};
  }

  const diffMinutes = (currentTimestamp - lastTime) / (1000 * 60);

  if (diffMinutes < minRepeatMinutes) {
    const score = Math.floor((1 - diffMinutes / minRepeatMinutes) * 80);
    return {
      isAnomaly: true,
      reason: `短時間內重複簽到同一點 (${Math.round(diffMinutes)} 分鐘 < ${minRepeatMinutes} 分鐘)`,
      score: score,
    };
  }

  return {isAnomaly: false, reason: null, score: 0};
}

/**
 * 綜合異常檢測
 * @param {Object} params - 檢測參數
 * @returns {Object} {anomaly, anomalyReasons, anomalyScore}
 */
function detectCheckinAnomalies(params) {
  const {
    lastCheckin,
    currentTimestamp,
    minIntervalMinutes,
    currentLat,
    currentLng,
    currentPatrolId,
  } = params;

  // 轉換當前時間戳（確保是數字）
  let timestamp = currentTimestamp;
  if (typeof timestamp !== 'number') {
    if (timestamp && timestamp.toMillis) {
      timestamp = timestamp.toMillis();
    } else if (timestamp && timestamp.seconds) {
      timestamp = timestamp.seconds * 1000;
    } else {
      timestamp = Date.now();
    }
  }

  const checks = [
    checkIntervalAnomaly(lastCheckin, timestamp, minIntervalMinutes),
    checkSpeedAnomaly(lastCheckin, timestamp, currentLat, currentLng),
    checkRepeatAnomaly(lastCheckin, timestamp, currentPatrolId),
  ];

  const anomalyReasons = checks
      .filter((check) => check.isAnomaly)
      .map((check) => check.reason);

  const anomalyScore = checks.reduce((sum, check) => sum + check.score, 0);

  return {
    anomaly: anomalyReasons.length > 0,
    anomalyReasons: anomalyReasons,
    anomalyScore: Math.min(100, anomalyScore),
  };
}

module.exports = {
  calculateDistance,
  checkIntervalAnomaly,
  checkSpeedAnomaly,
  checkRepeatAnomaly,
  detectCheckinAnomalies,
};
