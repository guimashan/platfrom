/**
 * Firebase 初始化模組
 * 初始化四個 Firebase 專案實例
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { getFunctions } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js';

// Firebase 配置 - 從環境變數讀取
const firebaseConfigs = {
    platform: {
        apiKey: "AIzaSyAcQJA7Tx0LnW8M51WM9bChvlAS_J7qcEw",
        authDomain: "platform-bc783.firebaseapp.com",
        projectId: "platform-bc783",
        storageBucket: "platform-bc783.firebasestorage.app",
        messagingSenderId: "971307854623",
        appId: "1:971307854623:web:29b96be8c4f0a457d19e2a"
    },
    checkin: {
        apiKey: "AIzaSyAnXFLHm7u9Ji0ualJDl9qGQQ1l4zcRnvg",
        authDomain: "checkin-76c77.firebaseapp.com",
        projectId: "checkin-76c77",
        storageBucket: "checkin-76c77.firebasestorage.app",
        messagingSenderId: "264033873783",
        appId: "1:264033873783:web:d871356277e5d06749fb72"
    },
    service: {
        apiKey: "AIzaSyAxuPR2U1Gk03fNOOPndC00XPnLeCuH57o",
        authDomain: "service-b9d4a.firebaseapp.com",
        projectId: "service-b9d4a",
        storageBucket: "service-b9d4a.firebasestorage.app",
        messagingSenderId: "662128429399",
        appId: "1:662128429399:web:3a132ce010d046649a1612"
    },
    schedule: {
        apiKey: "AIzaSyCnuspwgT20n5104dBtMVPfV54KclZI92s",
        authDomain: "schedule-48ff9.firebaseapp.com",
        projectId: "schedule-48ff9",
        storageBucket: "schedule-48ff9.firebasestorage.app",
        messagingSenderId: "135135952493",
        appId: "1:135135952493:web:24fdd0155b17c881014964"
    }
};

// 初始化 Firebase 應用實例
export const platformApp = initializeApp(firebaseConfigs.platform, 'platform');
export const checkinApp = initializeApp(firebaseConfigs.checkin, 'checkin');
export const serviceApp = initializeApp(firebaseConfigs.service, 'service');
export const scheduleApp = initializeApp(firebaseConfigs.schedule, 'schedule');

// 獲取服務實例
export const platformAuth = getAuth(platformApp);
export const platformDb = getFirestore(platformApp);
export const platformFunctions = getFunctions(platformApp, 'asia-east2');

export const checkinDb = getFirestore(checkinApp);
export const checkinFunctions = getFunctions(checkinApp, 'asia-east2');

export const serviceDb = getFirestore(serviceApp);
export const serviceFunctions = getFunctions(serviceApp, 'asia-east2');

export const scheduleDb = getFirestore(scheduleApp);
export const scheduleFunctions = getFunctions(scheduleApp, 'asia-east2');

// API Endpoints 配置 (使用 2nd Gen Cloud Functions URL)
export const API_ENDPOINTS = {
    // Platform 用戶管理 API
    updateUserRole: 'https://asia-east2-platform-bc783.cloudfunctions.net/updateUserRole',
    // 跨專案認證簽到 API (HTTP endpoint)
    verifyCheckinV2: 'https://verifycheckinv2-tcj2pvviia-df.a.run.app',
    // 巡邏點管理 API
    getPatrols: 'https://getpatrols-tcj2pvviia-df.a.run.app',
    savePatrol: 'https://savepatrol-tcj2pvviia-df.a.run.app',
    deletePatrol: 'https://deletepatrol-tcj2pvviia-df.a.run.app',
    // 簽到紀錄 API (V2 修復版本)
    getCheckinHistory: 'https://getcheckinhistoryv2-tcj2pvviia-df.a.run.app',
    // 儀表板 API
    getDashboardStats: 'https://getdashboardstats-tcj2pvviia-df.a.run.app',
    // 測試模式 API
    getTestModeStatus: 'https://gettestmodestatus-tcj2pvviia-df.a.run.app',
    updateTestMode: 'https://updatetestmode-tcj2pvviia-df.a.run.app',
    // 神務服務 API
    getUserRegistrations: 'https://asia-east2-service-b9d4a.cloudfunctions.net/getUserRegistrations'
};

// 開發環境設定 - 使用 Emulator
if (window.location.hostname === 'localhost' || window.location.hostname.includes('replit')) {
    // 注意: Emulator 設定需要在實際部署時移除
}
