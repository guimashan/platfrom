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

import { 
    showAuthUI, 
    hideAuthUI, 
    showMainContent, 
    showAuthError 
} from './auth-ui.js';

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
        let settled = false;
        
        // 輔助函數：確保 Promise 只被 settle 一次
        const settleOnce = (unsubscribe, settler) => {
            if (settled) return;
            settled = true;
            unsubscribe();
            settler();
        };

        const unsubscribe = onAuthStateChanged(platformAuth, async (user) => {
            try {
                if (!user) {
                    if (redirectToLogin) {
                        // 💾 記住用戶原本想去的頁面（包括首頁）
                        const returnUrl = window.location.pathname + window.location.search;
                        sessionStorage.setItem('line_login_return_url', returnUrl);
                        console.log('🔵 [auth-guard] 未登入，儲存返回URL:', returnUrl);
                        console.log('🔵 [auth-guard] sessionStorage已設定，準備跳轉到首頁');
                        
                        // 先 reject Promise，再延遲跳轉確保 sessionStorage 已寫入
                        settleOnce(unsubscribe, () => reject(new Error('重定向到登入頁')));
                        setTimeout(() => {
                            window.location.href = '/';
                        }, 100);
                    } else {
                        if (onFail) onFail({ error: 'NOT_AUTHENTICATED' });
                        settleOnce(unsubscribe, () => reject(new Error('使用者未登入')));
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
                        
                        settleOnce(unsubscribe, () => reject(new Error('使用者資料不存在')));
                        setTimeout(() => {
                            window.location.href = '/';
                        }, 100);
                    } else {
                        if (onFail) onFail({ error: 'USER_NOT_FOUND' });
                        settleOnce(unsubscribe, () => reject(new Error('使用者資料不存在')));
                    }
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
                            settleOnce(unsubscribe, () => reject(new Error('權限不足')));
                            setTimeout(() => {
                                window.location.href = '/';
                            }, 100);
                        } else {
                            if (onFail) onFail({ 
                                error: 'INSUFFICIENT_PERMISSIONS',
                                userRoles,
                                requiredRoles
                            });
                            settleOnce(unsubscribe, () => reject(new Error('權限不足')));
                        }
                        return;
                    }
                }

                const result = {
                    user,
                    userData,
                    roles: userRoles
                };

                if (onSuccess) onSuccess(result);
                settleOnce(unsubscribe, () => resolve(result));

            } catch (error) {
                console.error('認證檢查失敗:', error);
                if (redirectToLogin) {
                    alert('認證檢查失敗: ' + error.message);
                    settleOnce(unsubscribe, () => reject(error));
                    setTimeout(() => {
                        window.location.href = '/';
                    }, 100);
                } else {
                    if (onFail) onFail({ error: 'CHECK_FAILED', details: error });
                    settleOnce(unsubscribe, () => reject(error));
                }
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

    if (avatarElement) {
        avatarElement.src = userData.pictureUrl || '/images/default-avatar.svg';
        avatarElement.alt = userData.displayName || '使用者頭像';
        avatarElement.onerror = function() {
            this.src = '/images/default-avatar.svg';
        };
    }

    if (rolesElement) {
        const roles = userData.roles || ['user'];
        const roleText = roles.map(r => roleNames[r] || r).join(', ');
        rolesElement.textContent = roleText;
    }
}

/**
 * 檢查認證狀態並使用 UI 提示（不跳轉）
 * @param {Object} options - 設定選項
 * @param {Function} options.onAuthenticated - 認證成功回調
 * @param {Function} options.onUnauthenticated - 未認證回調
 * @param {string[]} options.requiredRoles - 必要角色（可選）
 * @returns {Promise<void>}
 */
export async function checkAuthWithUI(options = {}) {
    const {
        onAuthenticated = null,
        onUnauthenticated = null,
        requiredRoles = null
    } = options;

    return new Promise((resolve) => {
        let settled = false;
        
        // 輔助函數：確保 Promise 只被 resolve 一次並清理監聽器
        const settleOnce = (unsubscribe, result) => {
            if (settled) return;
            settled = true;
            unsubscribe();
            resolve(result);
        };

        const unsubscribe = onAuthStateChanged(platformAuth, async (user) => {
            try {
                // 未登入：顯示登入 UI
                if (!user) {
                    const { handleLineLogin } = await import('./auth.js?v=2');
                    showAuthUI({
                        title: '請先登入',
                        message: '請使用 LINE 帳號登入系統',
                        onLogin: handleLineLogin
                    });
                    if (onUnauthenticated) onUnauthenticated();
                    settleOnce(unsubscribe, { authenticated: false });
                    return;
                }

                // 檢查用戶資料
                const userRef = doc(platformDb, 'users', user.uid);
                const userSnap = await getDoc(userRef);

                if (!userSnap.exists()) {
                    showAuthUI({
                        title: '資料錯誤',
                        message: '使用者資料不存在，請重新登入',
                        errorMessage: '無法取得您的資料，請重新登入',
                        onLogin: async () => {
                            await platformAuth.signOut();
                            const { handleLineLogin } = await import('./auth.js?v=2');
                            handleLineLogin();
                        }
                    });
                    if (onUnauthenticated) onUnauthenticated();
                    settleOnce(unsubscribe, { authenticated: false });
                    return;
                }

                const userData = userSnap.data();
                const userRoles = userData.roles || ['user'];

                // 檢查權限（如果有要求）
                if (requiredRoles && requiredRoles.length > 0) {
                    const hasRequiredRole = requiredRoles.some(role => 
                        userRoles.includes(role)
                    );

                    if (!hasRequiredRole) {
                        showAuthUI({
                            title: '權限不足',
                            message: '您沒有存取此頁面的權限',
                            errorMessage: `需要以下權限之一: ${requiredRoles.join(', ')}`,
                            onLogin: () => {
                                window.location.href = '/';
                            }
                        });
                        if (onUnauthenticated) onUnauthenticated();
                        settleOnce(unsubscribe, { authenticated: false, insufficientPermissions: true });
                        return;
                    }
                }

                // 認證成功：顯示主要內容
                showMainContent();
                
                const result = {
                    authenticated: true,
                    user,
                    userData,
                    roles: userRoles
                };

                if (onAuthenticated) onAuthenticated(result);
                settleOnce(unsubscribe, result);

            } catch (error) {
                console.error('認證檢查失敗:', error);
                showAuthUI({
                    title: '認證失敗',
                    message: '系統發生錯誤，請稍後再試',
                    errorMessage: error.message,
                    onLogin: () => window.location.reload()
                });
                if (onUnauthenticated) onUnauthenticated();
                settleOnce(unsubscribe, { authenticated: false, error });
            }
        });
    });
}

/**
 * 檢查管理員權限（專用於管理後台）
 * @param {string[]} requiredAdminRoles - 必要的管理員角色（預設: 檢查是否為任何管理員）
 * @returns {Promise<Object>} 認證結果
 */
export async function checkAdminAuth(requiredAdminRoles = null) {
    // 預設管理員角色列表
    const defaultAdminRoles = [
        'superadmin',
        'admin_checkin',
        'admin_service',
        'admin_schedule',
        'poweruser_checkin',
        'poweruser_service',
        'poweruser_schedule'
    ];

    const rolesToCheck = requiredAdminRoles || defaultAdminRoles;

    return checkAuthWithUI({
        requiredRoles: rolesToCheck,
        onAuthenticated: (result) => {
            console.log('✅ 管理員認證成功:', result.roles);
        },
        onUnauthenticated: () => {
            console.log('❌ 管理員認證失敗');
        }
    });
}

/**
 * 設置自動登入狀態監聽
 * 當用戶登入/登出時自動更新 UI
 * @param {Function} onAuthChange - 狀態變化回調
 * @returns {Function} 清理函數 - 呼叫以停止監聽
 */
export function setupAuthListener(onAuthChange = null) {
    const unsubscribe = onAuthStateChanged(platformAuth, async (user) => {
        if (user) {
            // 用戶已登入
            const userRef = doc(platformDb, 'users', user.uid);
            const userSnap = await getDoc(userRef);
            
            if (userSnap.exists()) {
                const userData = userSnap.data();
                showMainContent();
                if (onAuthChange) {
                    onAuthChange({
                        authenticated: true,
                        user,
                        userData,
                        roles: userData.roles || ['user']
                    });
                }
            }
        } else {
            // 用戶未登入
            if (onAuthChange) {
                onAuthChange({ authenticated: false });
            }
        }
    });
    
    // 返回清理函數
    return unsubscribe;
}

export default {
    checkAuth,
    checkAuthWithUI,
    checkAdminAuth,
    setupAuthListener,
    hasRole,
    logout,
    displayUserInfo
};
