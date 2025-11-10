/**
 * Cloud Functions 主入口點 - 微服務架構
 * 龜馬山 goLine 平台
 * 
 * 根據專案 ID 條件導出對應的 Functions，避免重複部署
 */

const platformFunctions = require('./src/platform');
const checkinFunctions = require('./src/checkin');
const messagingFunctions = require('./src/messaging');
const serviceFunctions = require('./src/service');

// 取得當前專案 ID（部署時由 Firebase 自動設定）
const PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;

// === Platform 專案 (platform-bc783) ===
// 功能：LINE Bot + 用戶管理（LIFF 相關功能已移除）
if (!PROJECT_ID || PROJECT_ID === 'platform-bc783') {
  // Platform Functions - 用戶登入與權限管理
  exports.generateCustomToken = platformFunctions.generateCustomToken;
  exports.updateUserRole = platformFunctions.updateUserRole;

  // LINE Messaging API Functions - LINE Bot Webhook
  exports.lineMessaging = messagingFunctions.lineMessaging;
}

// === Check-in 專案 (checkin-76c77) ===
// 功能：GPS 簽到系統
if (!PROJECT_ID || PROJECT_ID === 'checkin-76c77') {
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
  exports.refreshPatrolQRCode = checkinFunctions.refreshPatrolQRCode;
  exports.detectAnomalies = checkinFunctions.detectAnomalies;
}

// === Service 專案 (service-b9d4a) ===
// 功能：神務服務（法會報名、訂單管理、付款確認）
if (!PROJECT_ID || PROJECT_ID === 'service-b9d4a') {
  exports.submitRegistration = serviceFunctions.submitRegistration;
  exports.getRegistrations = serviceFunctions.getRegistrations;
  exports.getRegistrationDetail = serviceFunctions.getRegistrationDetail;
  exports.getPublicOrderDetail = serviceFunctions.getPublicOrderDetail;
  exports.confirmPayment = serviceFunctions.confirmPayment;
}

// === Schedule 專案 (schedule-48ff9) ===
// 功能：志工排班系統（待開發）
// if (!PROJECT_ID || PROJECT_ID === 'schedule-48ff9') {
//   // 排班相關 functions 將在此處導出
// }
