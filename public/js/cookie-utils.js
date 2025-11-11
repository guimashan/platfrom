// 混合儲存工具函數 - Cookie + sessionStorage 雙重後備
// 優先使用 Cookie（支援無痕模式），失敗時自動降級為 sessionStorage

/**
 * 設置儲存（同時使用 Cookie 和 sessionStorage）
 * @param {string} name - 儲存鍵名
 * @param {string} value - 儲存值
 * @param {number} maxAge - Cookie 過期時間（秒），預設 600 秒（10 分鐘）
 */
export function setStorage(name, value, maxAge = 600) {
    let cookieSuccess = false;
    let sessionSuccess = false;
    
    // 嘗試 1: 設置 Cookie
    try {
        const cookieOptions = [
            `${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
            'path=/',
            'SameSite=Lax',
            `max-age=${maxAge}`
        ];
        
        if (window.location.protocol === 'https:') {
            cookieOptions.push('Secure');
        }
        
        document.cookie = cookieOptions.join('; ');
        
        // 驗證是否成功
        if (getCookie(name) === value) {
            cookieSuccess = true;
            console.log(`✅ [Storage] Cookie 設置成功: ${name}`);
        }
    } catch (e) {
        console.warn(`⚠️ [Storage] Cookie 設置失敗: ${e.message}`);
    }
    
    // 嘗試 2: 設置 sessionStorage（後備方案）
    try {
        sessionStorage.setItem(name, value);
        sessionSuccess = true;
        console.log(`✅ [Storage] sessionStorage 設置成功: ${name}`);
    } catch (e) {
        console.warn(`⚠️ [Storage] sessionStorage 設置失敗: ${e.message}`);
    }
    
    if (!cookieSuccess && !sessionSuccess) {
        throw new Error('無法儲存登入會話：Cookie 和 sessionStorage 都不可用。請檢查瀏覽器設定。');
    }
    
    console.log(`💾 [Storage] ${name} 儲存狀態: Cookie=${cookieSuccess}, sessionStorage=${sessionSuccess}`);
}

/**
 * 設置 Cookie（僅供內部使用）
 * @param {string} name - Cookie 名稱
 * @param {string} value - Cookie 值
 * @param {number} maxAge - 過期時間（秒），預設 600 秒（10 分鐘）
 */
export function setCookie(name, value, maxAge = 600) {
    const cookieOptions = [
        `${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
        'path=/',
        'SameSite=Lax',
        `max-age=${maxAge}`
    ];
    
    if (window.location.protocol === 'https:') {
        cookieOptions.push('Secure');
    }
    
    document.cookie = cookieOptions.join('; ');
    console.log(`🍪 [Cookie] 設置: ${name} = ${value.substring(0, 8)}...`);
}

/**
 * 獲取儲存（優先 Cookie，後備 sessionStorage）
 * @param {string} name - 儲存鍵名
 * @returns {string|null} - 儲存值，如果不存在則返回 null
 */
export function getStorage(name) {
    // 嘗試 1: 從 Cookie 讀取
    try {
        const cookieValue = getCookie(name);
        if (cookieValue) {
            console.log(`✅ [Storage] 從 Cookie 讀取: ${name}`);
            return cookieValue;
        }
    } catch (e) {
        console.warn(`⚠️ [Storage] Cookie 讀取失敗: ${e.message}`);
    }
    
    // 嘗試 2: 從 sessionStorage 讀取（後備方案）
    try {
        const sessionValue = sessionStorage.getItem(name);
        if (sessionValue) {
            console.log(`✅ [Storage] 從 sessionStorage 讀取: ${name}`);
            return sessionValue;
        }
    } catch (e) {
        console.warn(`⚠️ [Storage] sessionStorage 讀取失敗: ${e.message}`);
    }
    
    console.log(`❌ [Storage] 未找到: ${name}`);
    return null;
}

/**
 * 獲取 Cookie（僅供內部使用）
 * @param {string} name - Cookie 名稱
 * @returns {string|null} - Cookie 值，如果不存在則返回 null
 */
export function getCookie(name) {
    const encodedName = encodeURIComponent(name);
    const cookies = document.cookie.split(';');
    
    for (let cookie of cookies) {
        cookie = cookie.trim();
        if (cookie.startsWith(encodedName + '=')) {
            const value = decodeURIComponent(cookie.substring(encodedName.length + 1));
            return value;
        }
    }
    
    return null;
}

/**
 * 刪除儲存（同時刪除 Cookie 和 sessionStorage）
 * @param {string} name - 儲存鍵名
 */
export function removeStorage(name) {
    // 刪除 Cookie
    try {
        removeCookie(name);
        console.log(`✅ [Storage] Cookie 已刪除: ${name}`);
    } catch (e) {
        console.warn(`⚠️ [Storage] Cookie 刪除失敗: ${e.message}`);
    }
    
    // 刪除 sessionStorage
    try {
        sessionStorage.removeItem(name);
        console.log(`✅ [Storage] sessionStorage 已刪除: ${name}`);
    } catch (e) {
        console.warn(`⚠️ [Storage] sessionStorage 刪除失敗: ${e.message}`);
    }
}

/**
 * 刪除 Cookie（僅供內部使用）
 * @param {string} name - Cookie 名稱
 */
export function removeCookie(name) {
    const cookieOptions = [
        `${encodeURIComponent(name)}=`,
        'path=/',
        'SameSite=Lax',
        'max-age=0'
    ];
    
    if (window.location.protocol === 'https:') {
        cookieOptions.push('Secure');
    }
    
    document.cookie = cookieOptions.join('; ');
}

/**
 * 檢查 Cookie 是否可用
 * @returns {boolean} - 如果可用返回 true
 */
export function isCookieAvailable() {
    try {
        const testName = '__cookie_test__';
        setCookie(testName, 'test', 1);
        const testValue = getCookie(testName);
        removeCookie(testName);
        return testValue === 'test';
    } catch (e) {
        console.error('🍪 [Cookie] Cookie 不可用:', e);
        return false;
    }
}
