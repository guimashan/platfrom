// 最簡單可靠的儲存方案 - 使用 localStorage
// localStorage 在同域下永久保存，不受跳轉影響

export function saveState(state, returnUrl) {
    try {
        localStorage.setItem('line_state', state);
        localStorage.setItem('line_return', returnUrl);
        return true;
    } catch (e) {
        console.error('❌ 儲存失敗:', e);
        return false;
    }
}

export function getState() {
    try {
        const state = localStorage.getItem('line_state');
        return state;
    } catch (e) {
        console.error('❌ 讀取失敗:', e);
        return null;
    }
}

export function getReturnUrl() {
    try {
        return localStorage.getItem('line_return') || '/';
    } catch (e) {
        return '/';
    }
}

export function clearAuth() {
    try {
        localStorage.removeItem('line_state');
        localStorage.removeItem('line_return');
    } catch (e) {
        console.error('❌ 清除失敗:', e);
    }
}
