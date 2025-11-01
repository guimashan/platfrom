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
exports.initializeDefaultPatrols = checkinFunctions.initializeDefaultPatrols;
exports.verifyCheckinDistance = checkinFunctions.verifyCheckinDistance;
exports.verifyCheckinV2 = checkinFunctions.verifyCheckinV2;
exports.getPatrols = checkinFunctions.getPatrols;
exports.getCheckinHistory = checkinFunctions.getCheckinHistory;
exports.getTestModeStatus = checkinFunctions.getTestModeStatus;
exports.updateTestMode = checkinFunctions.updateTestMode;
exports.savePatrol = checkinFunctions.savePatrol;
exports.deletePatrol = checkinFunctions.deletePatrol;
exports.getDashboardStats = checkinFunctions.getDashboardStats;
