/**
 * 認證模組
 * 處理 LINE 登入與角色導向
 */

import { 
    platformAuth, 
    platformDb,
    platformFunctions 
} from './firebase-init.js';

import { 
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

import { 
    doc,
    getDoc,
    setDoc,
    serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

import {
    httpsCallable
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js';

// LINE Login Web API 設定
const LINE_CHANNEL_ID = '2008269293';
const LINE_CALLBACK_URL = window.location.origin + '/callback.html';

// 監聽認證狀態
onAuthStateChanged(platformAuth, async (user) => {
    if (user) {
        console.log('使用者已登入:', user.uid);
        await handleUserLogin(user);
    } else {
        console.log('使用者未登入');
        showLoginPage();
    }
});

// 處理 LINE 登入
async function handleLineLogin() {
    try {
        // 產生隨機 state 用於安全驗證
        const state = Math.random().toString(36).substring(2, 15);
        sessionStorage.setItem('line_login_state', state);

        // 構建 LINE 授權 URL
        const lineAuthUrl = new URL('https://access.line.me/oauth2/v2.1/authorize');
        lineAuthUrl.searchParams.append('response_type', 'code');
        lineAuthUrl.searchParams.append('client_id', LINE_CHANNEL_ID);
        lineAuthUrl.searchParams.append('redirect_uri', LINE_CALLBACK_URL);
        lineAuthUrl.searchParams.append('state', state);
        lineAuthUrl.searchParams.append('scope', 'profile openid');

        // 導向 LINE 授權頁面
        window.location.href = lineAuthUrl.toString();
        
    } catch (error) {
        console.error('LINE 登入失敗:', error);
        alert('登入失敗: ' + error.message);
    }
}

// 更新使用者資料功能已移至 Cloud Function (generateCustomToken)

// 處理使用者登入後的導向
async function handleUserLogin(user) {
    try {
        const userRef = doc(platformDb, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
            console.log('使用者資料不存在,等待建立...');
            return;
        }
        
        const userData = userSnap.data();
        const roles = userData.roles || ['user'];
        
        console.log('使用者角色:', roles);
        
        // 根據角色導向不同頁面
        redirectByRole(roles);
        
    } catch (error) {
        console.error('處理使用者登入失敗:', error);
    }
}

// 根據角色導向
function redirectByRole(roles) {
    // 如果在首頁,根據角色導向
    if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
        if (roles.includes('superadmin')) {
            window.location.href = '/admin/dashboard.html';
        } else if (roles.includes('admin_checkin') || roles.includes('admin_service') || roles.includes('admin_schedule')) {
            window.location.href = '/admin/index.html';
        } else if (roles.includes('poweruser')) {
            window.location.href = '/service/index.html';
        } else {
            window.location.href = '/checkin/index.html';
        }
    }
}

// 顯示登入頁面
function showLoginPage() {
    // 已在首頁,不需要重定向
}

// 登出功能
export async function logout() {
    try {
        await platformAuth.signOut();
        window.location.href = '/';
    } catch (error) {
        console.error('登出失敗:', error);
    }
}

// 綁定登入按鈕事件
document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('lineLoginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', handleLineLogin);
    }
});

// 導出認證相關函數
export { platformAuth, handleLineLogin };
