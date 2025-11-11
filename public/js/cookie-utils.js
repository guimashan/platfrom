// Cookie 工具函數 - 專門用於 OAuth state 儲存
// 在無痕模式下，Cookie 比 sessionStorage 更可靠

/**
 * 設置 Cookie
 * @param {string} name - Cookie 名稱
 * @param {string} value - Cookie 值
 * @param {number} maxAge - 過期時間（秒），預設 600 秒（10 分鐘）
 */
export function setCookie(name, value, maxAge = 600) {
    const cookieOptions = [
        `${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
        'path=/',
        'SameSite=Lax', // 允許 OAuth 跳轉時攜帶 Cookie
        `max-age=${maxAge}` // 設定過期時間
    ];
    
    // 如果是 HTTPS，添加 Secure 屬性
    if (window.location.protocol === 'https:') {
        cookieOptions.push('Secure');
    }
    
    document.cookie = cookieOptions.join('; ');
    
    console.log(`🍪 [Cookie] 設置: ${name} = ${value.substring(0, 8)}...`);
}

/**
 * 獲取 Cookie
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
            console.log(`🍪 [Cookie] 讀取: ${name} = ${value.substring(0, 8)}...`);
            return value;
        }
    }
    
    console.log(`🍪 [Cookie] 未找到: ${name}`);
    return null;
}

/**
 * 刪除 Cookie
 * @param {string} name - Cookie 名稱
 */
export function removeCookie(name) {
    const cookieOptions = [
        `${encodeURIComponent(name)}=`,
        'path=/',
        'SameSite=Lax',
        'max-age=0'
    ];
    
    // 如果是 HTTPS，必須添加 Secure 屬性才能正確刪除
    if (window.location.protocol === 'https:') {
        cookieOptions.push('Secure');
    }
    
    document.cookie = cookieOptions.join('; ');
    console.log(`🍪 [Cookie] 刪除: ${name}`);
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
