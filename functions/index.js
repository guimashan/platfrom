/**
 * Cloud Functions 主入口點
 * 龜馬山 goLine 平台
 */

const platformFunctions = require('./src/platform');
const checkinFunctions = require('./src/checkin');

// 導出 Platform Functions
exports.generateCustomToken = platformFunctions.generateCustomToken;
exports.updateUserRole = platformFunctions.updateUserRole;

// 導出 Check-in Functions
exports.verifyCheckinDistance = checkinFunctions.verifyCheckinDistance;
