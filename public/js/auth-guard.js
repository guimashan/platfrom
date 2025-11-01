/**
 * 共用認證守衛模組
 * 可複製至其他模組使用
 */

import { 
    platformAuth, 
    platformDb 
} from './firebase-init.js';

import { 
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

import { 
    doc,
    getDoc
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

/**
 * 檢查使用者認證狀態
 * @param {Object} options - 設定選項
 * @param {string[]} options.requiredRoles - 必要角色（任一符合即可）
 * @param {boolean} options.redirectToLogin - 未登入時是否導向登入頁（預設: true）
 * @param {Function} options.onSuccess - 認證成功回調
 * @param {Function} options.onFail - 認證失敗回調
 * @returns {Promise<Object>} 使用者資料
 */
export async function checkAuth(options = {}) {
    const {
        requiredRoles = null,
        redirectToLogin = true,
        onSuccess = null,
        onFail = null
    } = options;

    return new Promise((resolve, reject) => {
        onAuthStateChanged(platformAuth, async (user) => {
            try {
                if (!user) {
                    if (redirectToLogin) {
                        // 💾 記住用戶原本想去的頁面（包括首頁）
                        const returnUrl = window.location.pathname + window.location.search;
                        sessionStorage.setItem('line_login_return_url', returnUrl);
                        console.log('🔵 [auth-guard] 未登入，儲存返回URL:', returnUrl);
                        console.log('🔵 [auth-guard] sessionStorage已設定，準備跳轉到首頁');
                        
                        // 延遲跳轉，確保 sessionStorage 已寫入
                        setTimeout(() => {
                            window.location.href = '/';
                        }, 100);
                    } else {
                        if (onFail) onFail({ error: 'NOT_AUTHENTICATED' });
                        reject(new Error('使用者未登入'));
                    }
                    return;
                }

                const userRef = doc(platformDb, 'users', user.uid);
                const userSnap = await getDoc(userRef);

                if (!userSnap.exists()) {
                    if (redirectToLogin) {
                        alert('使用者資料不存在，請重新登入');
                        await platformAuth.signOut();
                        // 💾 記住用戶原本想去的頁面（包括首頁）
                        const returnUrl = window.location.pathname + window.location.search;
                        sessionStorage.setItem('line_login_return_url', returnUrl);
                        window.location.href = '/';
                    }
                    if (onFail) onFail({ error: 'USER_NOT_FOUND' });
                    reject(new Error('使用者資料不存在'));
                    return;
                }

                const userData = userSnap.data();
                const userRoles = userData.roles || ['user'];

                if (requiredRoles && requiredRoles.length > 0) {
                    const hasRequiredRole = requiredRoles.some(role => 
                        userRoles.includes(role)
                    );

                    if (!hasRequiredRole) {
                        if (redirectToLogin) {
                            alert('您沒有存取此頁面的權限');
                            // 權限不足時不記錄返回URL，因為用戶不應該回到這個頁面
                            window.location.href = '/';
                        }
                        if (onFail) onFail({ 
                            error: 'INSUFFICIENT_PERMISSIONS',
                            userRoles,
                            requiredRoles
                        });
                        reject(new Error('權限不足'));
                        return;
                    }
                }

                const result = {
                    user,
                    userData,
                    roles: userRoles
                };

                if (onSuccess) onSuccess(result);
                resolve(result);

            } catch (error) {
                console.error('認證檢查失敗:', error);
                if (redirectToLogin) {
                    alert('認證檢查失敗: ' + error.message);
                    window.location.href = '/';
                }
                if (onFail) onFail({ error: 'CHECK_FAILED', details: error });
                reject(error);
            }
        });
    });
}

/**
 * 檢查使用者是否有特定角色
 * @param {string[]} roles - 使用者角色
 * @param {string|string[]} requiredRoles - 必要角色
 * @returns {boolean} 是否有權限
 */
export function hasRole(roles, requiredRoles) {
    const required = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    return required.some(role => roles.includes(role));
}

/**
 * 登出功能
 */
export async function logout() {
    try {
        await platformAuth.signOut();
        window.location.href = '/';
    } catch (error) {
        console.error('登出失敗:', error);
        alert('登出失敗: ' + error.message);
    }
}

/**
 * 顯示使用者資訊
 * @param {Object} userData - 使用者資料
 * @param {Object} elements - DOM 元素
 */
export function displayUserInfo(userData, elements = {}) {
    const { 
        nameElement = null,
        avatarElement = null,
        rolesElement = null
    } = elements;

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

    if (nameElement) {
        nameElement.textContent = userData.displayName || '使用者';
    }

    if (avatarElement && userData.pictureUrl) {
        avatarElement.src = userData.pictureUrl;
        avatarElement.alt = userData.displayName || '使用者頭像';
    }

    if (rolesElement) {
        const roles = userData.roles || ['user'];
        const roleText = roles.map(r => roleNames[r] || r).join(', ');
        rolesElement.textContent = roleText;
    }
}

export default {
    checkAuth,
    hasRole,
    logout,
    displayUserInfo
};
