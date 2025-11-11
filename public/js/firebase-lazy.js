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
