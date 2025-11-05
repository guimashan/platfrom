/**
 * Cloud Functions 主入口點
 * 龜馬山 goLine 平台
 */

const platformFunctions = require('./src/platform');
const checkinFunctions = require('./src/checkin');
const messagingFunctions = require('./src/messaging');
const serviceFunctions = require('./src/service');

// 導出 Platform Functions
exports.generateCustomToken = platformFunctions.generateCustomToken;
exports.generateCustomTokenFromLiff = platformFunctions.generateCustomTokenFromLiff;
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

// 導出 Service Functions
exports.submitRegistration = serviceFunctions.submitRegistration;

// 導出 LINE Messaging API Functions
exports.lineWebhook = messagingFunctions.lineWebhook;
