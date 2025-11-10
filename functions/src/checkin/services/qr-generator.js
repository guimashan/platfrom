/**
 * QR Code 生成與管理服務
 */

const crypto = require('crypto');

/**
 * 生成安全的 QR Token
 * 格式：UUID + short hash
 */
function generateSecureToken() {
  const uuid = crypto.randomUUID();
  const hash = crypto.randomBytes(4).toString('hex');
  return `${uuid}-${hash}`;
}

/**
 * 生成 QR Code 掃描內容
 * 格式：PATROL:{patrolId}:{token}
 */
function generateQRPayload(patrolId, token) {
  return `PATROL:${patrolId}:${token}`;
}

/**
 * 解析 QR Code 掃描內容
 * @returns {Object|null} {patrolId, token} 或 null（若格式錯誤）
 */
function parseQRPayload(qrCode) {
  if (!qrCode || typeof qrCode !== 'string') {
    return null;
  }

  const parts = qrCode.split(':');
  if (parts.length !== 3 || parts[0] !== 'PATROL') {
    return null;
  }

  return {
    patrolId: parts[1],
    token: parts[2],
  };
}

/**
 * 檢查 QR Token 是否需要更新
 * @param {Timestamp} lastUpdated - 上次更新時間
 * @param {number} minRotationMinutes - 最小更新間隔（分鐘）
 * @returns {boolean}
 */
function shouldRefreshToken(lastUpdated, minRotationMinutes = 15) {
  if (!lastUpdated) return true;

  const now = new Date();
  const lastUpdateTime = lastUpdated.toDate ? lastUpdated.toDate() : new Date(lastUpdated);
  const diffMinutes = (now - lastUpdateTime) / (1000 * 60);

  return diffMinutes >= minRotationMinutes;
}

module.exports = {
  generateSecureToken,
  generateQRPayload,
  parseQRPayload,
  shouldRefreshToken,
};
