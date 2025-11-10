/**
 * Firebase 延遲載入 Helper
 * 統一管理 Firebase SDK 的動態載入，避免頁面載入時的效能問題
 */

let firebaseInitPromise = null;
let authModulePromise = null;

/**
 * 載入 Firebase 核心模組（記憶化）
 * @returns {Promise} Firebase init 模組
 */
export async function loadFirebaseCore() {
    if (!firebaseInitPromise) {
        firebaseInitPromise = import('/js/firebase-init.js');
    }
    return firebaseInitPromise;
}

/**
 * 確保 Firebase Auth 已載入
 * @returns {Promise<{platformAuth, onAuthStateChanged}>}
 */
export async function ensureAuth() {
    const firebaseInit = await loadFirebaseCore();
    const { onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js');
    
    return {
        platformAuth: firebaseInit.platformAuth,
        onAuthStateChanged
    };
}

/**
 * 確保 Firebase Firestore 已載入
 * @returns {Promise<{platformDb, doc, getDoc, setDoc, collection, query, where, orderBy, getDocs}>}
 */
export async function ensureFirestore() {
    const firebaseInit = await loadFirebaseCore();
    const firestoreModule = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
    
    return {
        platformDb: firebaseInit.platformDb,
        ...firestoreModule
    };
}

/**
 * 確保 Firebase Functions 已載入
 * @returns {Promise<{platformFunctions, httpsCallable}>}
 */
export async function ensureFunctions() {
    const firebaseInit = await loadFirebaseCore();
    const { httpsCallable } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js');
    
    return {
        platformFunctions: firebaseInit.platformFunctions,
        httpsCallable
    };
}

/**
 * 載入完整的認證模組（包含 LINE 登入等）
 * @returns {Promise} auth.js 模組
 */
export async function loadAuthModule() {
    if (!authModulePromise) {
        await loadFirebaseCore(); // 確保 Firebase 先載入
        authModulePromise = import('/js/auth.js');
    }
    return authModulePromise;
}

/**
 * 檢查是否有快取的登入狀態（用於判斷是否需要載入 Firebase）
 * @returns {boolean} 是否可能已登入
 */
export function hasCachedAuth() {
    // 檢查 sessionStorage 是否有登入相關資訊
    const hasReturnUrl = sessionStorage.getItem('line_login_return_url');
    const hasAuthState = sessionStorage.getItem('line_login_state');
    
    // 檢查 URL 是否有認證參數
    const urlParams = new URLSearchParams(window.location.search);
    const hasAuthParams = urlParams.has('code') || urlParams.has('state');
    
    // 檢查 referrer 是否來自 LINE
    const fromLine = document.referrer.includes('line.me');
    
    return !!(hasReturnUrl || hasAuthState || hasAuthParams || fromLine);
}

/**
 * 顯示載入指示器
 * @param {string} elementId 載入指示器的 DOM ID
 * @param {boolean} show 是否顯示
 */
export function toggleLoadingIndicator(elementId = 'loadingIndicator', show = true) {
    const indicator = document.getElementById(elementId);
    if (indicator) {
        indicator.classList.toggle('hidden', !show);
    }
}

/**
 * 為需要認證的頁面建立延遲載入 guard
 * 只在檢測到使用者可能已登入時才載入 Firebase
 * 
 * @param {Function} onAuthenticated 認證成功後的回調函數
 * @param {Function} onUnauthenticated 未認證時的回調函數
 */
export async function createAuthGuard(onAuthenticated, onUnauthenticated) {
    try {
        // 載入 Firebase Auth
        const { platformAuth, onAuthStateChanged } = await ensureAuth();
        
        // 監聽認證狀態
        onAuthStateChanged(platformAuth, async (user) => {
            if (user) {
                await onAuthenticated(user);
            } else {
                await onUnauthenticated();
            }
        });
    } catch (error) {
        console.error('Auth guard 初始化失敗:', error);
        if (onUnauthenticated) {
            await onUnauthenticated();
        }
    }
}

/**
 * 為服務申請頁面建立互動時載入的 handler
 * 只在使用者點擊提交時才載入 Firebase
 * 
 * @param {string} formId 表單 ID
 * @param {Function} onSubmit 提交時的處理函數
 */
export function createLazyFormHandler(formId, onSubmit) {
    const form = document.getElementById(formId);
    if (!form) {
        console.warn(`找不到表單: ${formId}`);
        return;
    }
    
    let firebaseLoaded = false;
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // 第一次提交時載入 Firebase
        if (!firebaseLoaded) {
            toggleLoadingIndicator('loadingIndicator', true);
            try {
                await loadFirebaseCore();
                firebaseLoaded = true;
            } catch (error) {
                console.error('Firebase 載入失敗:', error);
                alert('系統載入失敗，請重新整理頁面');
                return;
            } finally {
                toggleLoadingIndicator('loadingIndicator', false);
            }
        }
        
        // 執行提交處理
        await onSubmit(e);
    });
}
