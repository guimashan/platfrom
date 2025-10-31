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
    signInWithPopup,
    OAuthProvider,
    signInWithCustomToken,
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

// LINE OAuth Provider
const lineProvider = new OAuthProvider('oidc.line');

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
    const loadingIndicator = document.getElementById('loadingIndicator');
    const loginBtn = document.getElementById('lineLoginBtn');
    
    try {
        loadingIndicator?.classList.remove('hidden');
        loginBtn?.classList.add('hidden');

        // 使用 LINE OAuth Provider
        const result = await signInWithPopup(platformAuth, lineProvider);
        const user = result.user;
        
        console.log('LINE 登入成功:', user.uid);
        
        // 更新使用者資料
        await updateUserData(user);
        
    } catch (error) {
        console.error('LINE 登入失敗:', error);
        alert('登入失敗: ' + error.message);
        loadingIndicator?.classList.add('hidden');
        loginBtn?.classList.remove('hidden');
    }
}

// 更新使用者資料到 Firestore
async function updateUserData(user) {
    try {
        const userRef = doc(platformDb, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
            // 新使用者,建立基本資料
            await setDoc(userRef, {
                displayName: user.displayName || 'LINE 使用者',
                lineUserId: user.providerData[0]?.uid || '',
                email: user.email || '',
                roles: ['user'], // V3 架構: 使用陣列
                active: true,
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp()
            });
            console.log('新使用者資料已建立');
        } else {
            // 更新最後登入時間
            await setDoc(userRef, {
                lastLogin: serverTimestamp()
            }, { merge: true });
            console.log('使用者登入時間已更新');
        }
    } catch (error) {
        console.error('更新使用者資料失敗:', error);
    }
}

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
