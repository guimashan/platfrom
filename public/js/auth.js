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
        // 🔒 產生密碼學安全的隨機 state 用於 CSRF 防護
        const state = crypto.randomUUID();
        sessionStorage.setItem('line_login_state', state);
        
        // 💾 記住用戶原本想去的頁面（只在還沒記錄時儲存，避免覆蓋）
        if (!sessionStorage.getItem('line_login_return_url')) {
            const returnUrl = window.location.pathname + window.location.search;
            sessionStorage.setItem('line_login_return_url', returnUrl);
            console.log('🔵 [auth.js] 儲存返回URL:', returnUrl);
        } else {
            console.log('🔵 [auth.js] 已有返回URL，不覆蓋:', sessionStorage.getItem('line_login_return_url'));
        }

        // 構建 LINE 授權 URL
        const lineAuthUrl = new URL('https://access.line.me/oauth2/v2.1/authorize');
        lineAuthUrl.searchParams.append('response_type', 'code');
        lineAuthUrl.searchParams.append('client_id', LINE_CHANNEL_ID);
        lineAuthUrl.searchParams.append('redirect_uri', LINE_CALLBACK_URL);
        lineAuthUrl.searchParams.append('state', state);
        lineAuthUrl.searchParams.append('scope', 'profile openid email');

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
    const currentPath = window.location.pathname;
    
    // 如果在首頁,顯示模組選單而不是自動導向
    if (currentPath === '/' || currentPath === '/index.html') {
        showModuleGrid(roles);
        return;
    }
    
    // 其他頁面：用戶已經在目標頁面，不需要重定向
    // 各頁面的 auth-guard 會自行處理權限檢查
    console.log('使用者已在頁面:', currentPath);
}

// 顯示模組選單
function showModuleGrid(roles) {
    const loginCard = document.getElementById('loginCard');
    const moduleGrid = document.getElementById('moduleGrid');
    const userInfo = document.getElementById('userInfo');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (loginCard) loginCard.style.display = 'none';
    if (moduleGrid) moduleGrid.classList.add('active');
    if (userInfo) {
        userInfo.style.display = 'flex';
        updateUserInfo();
    }
    if (logoutBtn) logoutBtn.style.display = 'block';
    
    // 根據角色控制可見模組
    const modules = document.querySelectorAll('.module-card');
    modules.forEach(card => {
        const module = card.dataset.module;
        let canAccess = false;
        
        if (module === 'checkin') {
            canAccess = true;
        } else if (module === 'service') {
            canAccess = roles.includes('poweruser_service') || roles.includes('admin_service') || roles.includes('superadmin');
        } else if (module === 'schedule') {
            canAccess = roles.includes('admin_schedule') || roles.includes('superadmin');
        } else if (module === 'manage') {
            canAccess = roles.includes('admin_checkin') || roles.includes('admin_service') || 
                       roles.includes('admin_schedule') || roles.includes('superadmin');
        }
        
        if (canAccess) {
            card.style.display = 'block';
            card.addEventListener('click', () => handleModuleClick(module));
        } else {
            card.style.display = 'none';
        }
    });
}

// 處理模組點擊
function handleModuleClick(module) {
    const routes = {
        'checkin': '/checkin/index.html',
        'service': '/service/index.html',
        'schedule': '/schedule/index.html',
        'manage': '/manage/index.html'
    };
    
    if (routes[module]) {
        window.location.href = routes[module];
    }
}

// 更新使用者資訊顯示
async function updateUserInfo() {
    try {
        const user = platformAuth.currentUser;
        if (!user) return;
        
        const userRef = doc(platformDb, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
            const userData = userSnap.data();
            const userName = document.getElementById('userName');
            const userAvatar = document.getElementById('userAvatar');
            const userRoles = document.getElementById('userRoles');
            
            if (userName) userName.textContent = userData.displayName || '使用者';
            if (userAvatar) userAvatar.src = userData.pictureUrl || '/images/default-avatar.svg';
            if (userRoles) {
                const roleNames = {
                    'user': '一般使用者',
                    'poweruser_checkin': '簽到幹部',
                    'poweruser_service': '神務幹部',
                    'poweruser_schedule': '排班幹部',
                    'admin_checkin': '簽到管理員',
                    'admin_service': '神務管理員',
                    'admin_schedule': '排班管理員',
                    'superadmin': '超級管理員'
                };
                const roles = userData.roles || ['user'];
                const roleText = roles.map(r => roleNames[r] || r).join(', ');
                userRoles.textContent = `權限: ${roleText}`;
            }
        }
    } catch (error) {
        console.error('更新使用者資訊失敗:', error);
    }
}

// 顯示登入頁面
function showLoginPage() {
    const loginCard = document.getElementById('loginCard');
    const moduleGrid = document.getElementById('moduleGrid');
    const userInfo = document.getElementById('userInfo');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (loginCard) loginCard.style.display = 'block';
    if (moduleGrid) moduleGrid.classList.remove('active');
    if (userInfo) userInfo.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'none';
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

// 綁定事件
document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('lineLoginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (loginBtn) {
        loginBtn.addEventListener('click', handleLineLogin);
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
});

// 導出認證相關函數
export { platformAuth, handleLineLogin };
