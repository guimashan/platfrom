/**
 * 簽到管理後台共用模組
 * 處理權限檢查、導航、API 封裝、異常偵測
 */

import { platformAuth, API_ENDPOINTS } from '/js/firebase-init.js';
import { checkAuth, logout } from '/js/auth-guard.js';
import { callAPI } from '/js/api-helper.js';

export let currentUser = null;
export let currentUserData = null;

/**
 * 初始化管理後台
 * @param {Object} options - 配置選項
 * @param {Array} options.requiredRoles - 需要的角色
 * @param {Function} options.onSuccess - 認證成功回調
 * @param {string} options.activePage - 當前活躍頁面
 */
export async function initManagePage(options = {}) {
    const {
        requiredRoles = ['admin_checkin', 'superadmin'],
        onSuccess,
        activePage = 'dashboard'
    } = options;

    try {
        const { user, userData } = await checkAuth({
            requiredRoles,
            onSuccess: ({ user, userData }) => {
                currentUser = user;
                currentUserData = userData;

                // 隱藏登入提示，顯示主要內容
                const loginPrompt = document.getElementById('loginPrompt');
                const mainApp = document.getElementById('mainApp');
                
                if (loginPrompt) loginPrompt.style.display = 'none';
                if (mainApp) mainApp.style.display = 'block';

                // 設置用戶資訊
                setupUserInfo(userData);
                
                // 設置導航高亮（現代化布局）
                setupModernNav(activePage);
                
                // 設置側邊欄導航（舊版布局，向後兼容）
                setupSidebar(activePage);
                
                // 設置登出按鈕
                setupLogoutButton();

                if (onSuccess) onSuccess({ user, userData });
            }
        });

        return { user, userData };
    } catch (error) {
        console.error('初始化管理後台失敗:', error);
        throw error;
    }
}

/**
 * 設置用戶資訊顯示
 */
function setupUserInfo(userData) {
    const userNameEl = document.getElementById('userName');
    const userRoleEl = document.getElementById('userRole');

    if (userNameEl) {
        userNameEl.textContent = userData.displayName || '管理員';
    }

    if (userRoleEl) {
        const roles = userData.roles || [];
        let roleText = '一般用戶';
        
        if (roles.includes('superadmin')) {
            roleText = '超級管理員';
        } else if (roles.includes('admin_checkin')) {
            roleText = '簽到管理員';
        } else if (roles.includes('poweruser_checkin')) {
            roleText = '簽到幹部';
        }
        
        userRoleEl.textContent = roleText;
    }
}

/**
 * 設置現代化導航高亮（2025 新版）
 */
function setupModernNav(activePage) {
    const navItems = document.querySelectorAll('.modern-nav-item');
    if (navItems.length === 0) return;

    const roles = currentUserData?.roles || [];
    const isSuperadmin = roles.includes('superadmin');

    navItems.forEach(item => {
        const page = item.getAttribute('data-page');
        
        // 移除所有 active class
        item.classList.remove('is-active');
        item.removeAttribute('aria-current');
        
        // 設置當前頁面高亮
        if (page === activePage) {
            item.classList.add('is-active');
            item.setAttribute('aria-current', 'page');
        }

        // 隱藏角色權限頁（非 superadmin）
        if (page === 'user' && !isSuperadmin) {
            item.style.display = 'none';
        }
    });
}

/**
 * 設置側邊欄導航（舊版布局，向後兼容）
 */
function setupSidebar(activePage) {
    const navItems = [
        { id: 'dashboard', name: '一覽表', icon: '📊', href: '/checkin/manage/dashboard.html' },
        { id: 'record', name: '簽到紀錄', icon: '📝', href: '/checkin/manage/record.html' },
        { id: 'patrol', name: '巡邏點', icon: '📍', href: '/checkin/manage/patrol.html' },
        { id: 'user', name: '角色權限', icon: '👥', href: '/checkin/manage/user.html', requireSuperadmin: true }
    ];

    const sidebar = document.getElementById('manageSidebar');
    if (!sidebar) return;

    const roles = currentUserData?.roles || [];
    const isSuperadmin = roles.includes('superadmin');

    sidebar.innerHTML = navItems
        .filter(item => !item.requireSuperadmin || isSuperadmin)
        .map(item => `
            <a href="${item.href}" class="sidebar-item ${item.id === activePage ? 'active' : ''}">
                <span class="sidebar-icon">${item.icon}</span>
                <span class="sidebar-text">${item.name}</span>
            </a>
        `).join('');
}

/**
 * 設置登出按鈕
 */
function setupLogoutButton() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
}

/**
 * 檢查用戶是否有特定權限
 */
export function hasPermission(requiredRole) {
    const roles = currentUserData?.roles || [];
    
    if (roles.includes('superadmin')) return true;
    
    if (Array.isArray(requiredRole)) {
        return requiredRole.some(role => roles.includes(role));
    }
    
    return roles.includes(requiredRole);
}

/**
 * 顯示訊息提示
 */
export function showMessage(message, type = 'info') {
    const messageEl = document.getElementById('globalMessage');
    if (!messageEl) {
        console.log(`[${type}] ${message}`);
        return;
    }

    messageEl.textContent = message;
    messageEl.className = `global-message ${type}`;
    messageEl.style.display = 'block';

    setTimeout(() => {
        messageEl.style.display = 'none';
    }, 5000);
}

/**
 * 顯示載入中狀態
 */
export function showLoading(show = true) {
    const loadingEl = document.getElementById('globalLoading');
    if (loadingEl) {
        loadingEl.style.display = show ? 'flex' : 'none';
    }
}

/**
 * 格式化日期時間
 */
export function formatDateTime(timestamp) {
    if (!timestamp) return '-';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    
    return new Intl.DateTimeFormat('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    }).format(date);
}

/**
 * 格式化日期（不含時間）
 */
export function formatDate(timestamp) {
    if (!timestamp) return '-';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    
    return new Intl.DateTimeFormat('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(date);
}

/**
 * 異常偵測：檢查簽到是否異常
 */
export function detectCheckinAnomaly(record, previousRecord = null) {
    const anomalies = [];

    // 檢查 1: 時間間隔過短（如果有前一筆記錄）
    if (previousRecord) {
        const currentTime = record.checkinAt.toDate ? record.checkinAt.toDate() : new Date(record.checkinAt);
        const previousTime = previousRecord.checkinAt.toDate ? previousRecord.checkinAt.toDate() : new Date(previousRecord.checkinAt);
        
        const timeDiff = (currentTime - previousTime) / 1000 / 60; // 分鐘
        
        if (timeDiff < 3) {
            anomalies.push({
                type: 'TIME_TOO_CLOSE',
                message: `簽到間隔過短 (${timeDiff.toFixed(1)} 分鐘)`,
                severity: 'high'
            });
        }
    }

    // 檢查 2: GPS 距離過遠（如果有位置資訊）
    if (record.distanceMeters && record.distanceMeters > 100) {
        anomalies.push({
            type: 'GPS_TOO_FAR',
            message: `距離巡邏點過遠 (${record.distanceMeters.toFixed(1)} 公尺)`,
            severity: 'medium'
        });
    }

    // 檢查 3: 深夜異常簽到
    const hour = new Date(record.checkinAt).getHours();
    if (hour >= 0 && hour < 6) {
        anomalies.push({
            type: 'LATE_NIGHT',
            message: `深夜時段簽到 (${hour}:00)`,
            severity: 'low'
        });
    }

    // 檢查 4: 沒有照片（如果系統要求拍照）
    if (record.requirePhoto && !record.photoUrl) {
        anomalies.push({
            type: 'NO_PHOTO',
            message: '缺少簽到照片',
            severity: 'medium'
        });
    }

    return {
        hasAnomaly: anomalies.length > 0,
        anomalies,
        severity: anomalies.length > 0 ? Math.max(...anomalies.map(a => 
            a.severity === 'high' ? 3 : a.severity === 'medium' ? 2 : 1
        )) : 0
    };
}

/**
 * 計算兩個 GPS 座標之間的距離（公尺）
 */
export function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371e3; // 地球半徑（公尺）
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

/**
 * API 封裝：呼叫簽到相關 API
 */
export async function manageAPI(endpoint, options = {}) {
    try {
        showLoading(true);
        
        const idToken = await platformAuth.currentUser.getIdToken();
        
        const response = await fetch(endpoint, {
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`,
                ...options.headers
            },
            body: options.body ? JSON.stringify(options.body) : undefined
        });

        const result = await response.json();
        
        if (!result.ok && result.ok !== undefined) {
            throw new Error(result.message || '操作失敗');
        }

        return result;
    } catch (error) {
        console.error('API 呼叫失敗:', error);
        throw error;
    } finally {
        showLoading(false);
    }
}

// 匯出 API 端點
export { API_ENDPOINTS };
