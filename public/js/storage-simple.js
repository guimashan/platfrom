// 最簡單可靠的儲存方案 - 使用 localStorage
// localStorage 在同域下永久保存，不受跳轉影響

export function saveState(state, returnUrl) {
    try {
        localStorage.setItem('line_state', state);
        localStorage.setItem('line_return', returnUrl);
        console.log('✅ State 已儲存:', state.substring(0, 8));
        return true;
    } catch (e) {
        console.error('❌ 儲存失敗:', e);
        return false;
    }
}

export function getState() {
    try {
        const state = localStorage.getItem('line_state');
        console.log('📖 讀取 State:', state ? state.substring(0, 8) : 'null');
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
        console.log('🗑️ State 已清除');
    } catch (e) {
        console.error('❌ 清除失敗:', e);
    }
}
