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

import { setStorage, getStorage, removeStorage } from './cookie-utils.js';

// LINE Login Web API 設定
const LINE_CHANNEL_ID = '2008269293';
const CANONICAL_ORIGIN = 'https://go.guimashan.org.tw';
const LINE_CALLBACK_URL = CANONICAL_ORIGIN + '/callback.html';

// 初始化認證狀態監聽（僅供首頁使用）
export function initAuthStateListener() {
    onAuthStateChanged(platformAuth, async (user) => {
        if (user) {
            console.log('使用者已登入:', user.uid);
            await handleUserLogin(user);
        } else {
            console.log('使用者未登入');
            showLoginPage();
        }
    });
}

// 處理 LINE 登入（導出供服務頁面使用）
export async function handleLineLogin() {
    try {
        // 🔒 確保在正式域名上執行 OAuth（避免跨域問題）
        const currentOrigin = window.location.origin;
        if (currentOrigin !== CANONICAL_ORIGIN) {
            console.log(`🔄 重定向到正式域名: ${CANONICAL_ORIGIN}`);
            // 保存當前路徑，稍後導回
            const returnPath = window.location.pathname + window.location.search;
            setStorage('line_login_return_url', returnPath, 600);
            // 導向正式域名，讓用戶從正式域名啟動 OAuth
            window.location.href = CANONICAL_ORIGIN + returnPath;
            return;
        }
        
        // 🔒 產生密碼學安全的隨機 state 用於 CSRF 防護
        const state = crypto.randomUUID();
        
        // 💾 使用混合儲存策略（Cookie + sessionStorage 雙重後備）
        setStorage('line_login_state', state, 600); // 10分鐘過期
        
        // 💾 記住用戶原本想去的頁面（只在還沒記錄時儲存，避免覆蓋）
        if (!getStorage('line_login_return_url')) {
            const returnUrl = window.location.pathname + window.location.search;
            setStorage('line_login_return_url', returnUrl, 600);
            console.log('💾 [auth.js] 儲存返回URL:', returnUrl);
        } else {
            console.log('💾 [auth.js] 已有返回URL，不覆蓋:', getStorage('line_login_return_url'));
        }

        // 驗證儲存已正確設置
        const verifyState = getStorage('line_login_state');
        console.log('💾 [auth.js] 設置登入 state:', {
            state: state.substring(0, 8) + '...',
            verified: verifyState === state,
            returnUrl: getStorage('line_login_return_url')
        });

        // 構建 LINE 授權 URL
        const lineAuthUrl = new URL('https://access.line.me/oauth2/v2.1/authorize');
        lineAuthUrl.searchParams.append('response_type', 'code');
        lineAuthUrl.searchParams.append('client_id', LINE_CHANNEL_ID);
        lineAuthUrl.searchParams.append('redirect_uri', LINE_CALLBACK_URL);
        lineAuthUrl.searchParams.append('state', state);
        lineAuthUrl.searchParams.append('scope', 'profile openid email');

        // 導向 LINE 授權頁面
        console.log('🚀 [auth.js] 導向 LINE 授權頁面');
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
        
        // 如果沒有 data-module 屬性，代表是公開服務卡片，保持顯示
        if (!module) {
            card.style.display = 'block';
            return;
        }
        
        let canAccess = false;
        let isVisible = false;
        
        if (module === 'checkin') {
            // 奉香簽到：所有人可見可點擊
            canAccess = true;
            isVisible = true;
        } else if (module === 'service') {
            // 神務服務：所有人可見可點擊
            canAccess = true;
            isVisible = true;
        } else if (module === 'schedule') {
            // 排班系統：所有人可見但鎖定（不可點擊）
            canAccess = false;
            isVisible = true;
        } else if (module === 'manage') {
            // 系統管理：只有管理員可見
            const isAdmin = roles.some(role => 
                role === 'poweruser' ||
                role === 'admin' ||
                role.startsWith('poweruser_') || 
                role.startsWith('admin_') || 
                role === 'superadmin'
            );
            canAccess = isAdmin;
            isVisible = isAdmin;
        }
        
        if (isVisible) {
            card.style.display = 'block';
            // 只有可點擊的模組才綁定事件
            if (canAccess && !card.classList.contains('module-card-locked')) {
                card.addEventListener('click', () => handleModuleClick(module));
            }
        } else {
            card.style.display = 'none';
        }
    });
}

// 處理模組點擊
function handleModuleClick(module) {
    const routes = {
        'checkin': '/checkin/checkin.html',
        'service': '/service/service.html',
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
    if (userInfo) userInfo.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'none';
    
    // 顯示模組網格，讓未登入使用者也能看到公開模組
    if (moduleGrid) moduleGrid.classList.add('active');
    
    // 控制未登入時的模組顯示
    const modules = document.querySelectorAll('.module-card');
    modules.forEach(card => {
        const module = card.dataset.module;
        
        if (!module) {
            card.style.display = 'block';
            return;
        }
        
        // 未登入時的顯示規則
        if (module === 'checkin' || module === 'service' || module === 'schedule') {
            // 奉香簽到、神務服務、排班系統：所有人可見
            card.style.display = 'block';
            // 綁定點擊事件（除了鎖定的排班系統）
            if (module !== 'schedule' && !card.classList.contains('module-card-locked')) {
                card.addEventListener('click', () => handleModuleClick(module));
            }
        } else if (module === 'manage') {
            // 系統管理：未登入時隱藏
            card.style.display = 'none';
        }
    });
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

// 導出認證相關函數
export { platformAuth };
