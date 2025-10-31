/**
 * 動態儀表板
 * 根據使用者 roles 陣列顯示對應模組統計
 */

import { platformAuth, platformDb } from '/js/firebase-init.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { logout } from '/js/auth.js';

let currentUser = null;
let userRoles = [];

// 監聽認證狀態
onAuthStateChanged(platformAuth, async (user) => {
    if (!user) {
        window.location.href = '/';
        return;
    }
    currentUser = user;
    await loadDashboard();
});

// 載入儀表板
async function loadDashboard() {
    try {
        const userRef = doc(platformDb, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
            document.getElementById('dashboardGrid').innerHTML = '<p>無法載入使用者資料</p>';
            return;
        }
        
        const userData = userSnap.data();
        userRoles = userData.roles || [];
        
        renderDashboard();
    } catch (error) {
        console.error('載入儀表板失敗:', error);
        document.getElementById('dashboardGrid').innerHTML = '<p class="error">載入失敗</p>';
    }
}

// 渲染儀表板
function renderDashboard() {
    const grid = document.getElementById('dashboardGrid');
    let html = '<div style="display: grid; gap: 1.5rem; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));">';
    
    // superadmin 可以看到所有模組
    if (userRoles.includes('superadmin')) {
        html += createCard('奉香簽到模組', '管理巡邏點與簽到紀錄', '/checkin/admin.html', '#8A2BE2');
        html += createCard('神服服務模組', '審核服務申請', '/service/admin.html', '#FFD700');
        html += createCard('排班系統模組', '管理志工班表', '/schedule/admin.html', '#2ECC71');
        html += createCard('使用者管理', '管理角色與權限', '/admin/users.html', '#E74C3C');
    } else {
        // 根據角色顯示對應模組
        if (userRoles.includes('admin_checkin')) {
            html += createCard('奉香簽到模組', '管理巡邏點與簽到紀錄', '/checkin/admin.html', '#8A2BE2');
        }
        if (userRoles.includes('admin_service')) {
            html += createCard('神服服務模組', '審核服務申請', '/service/admin.html', '#FFD700');
        }
        if (userRoles.includes('admin_schedule')) {
            html += createCard('排班系統模組', '管理志工班表', '/schedule/admin.html', '#2ECC71');
        }
    }
    
    html += '</div>';
    
    if (html === '<div style="display: grid; gap: 1.5rem; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));"></div>') {
        html = '<p>您目前沒有管理權限</p>';
    }
    
    grid.innerHTML = html;
}

// 創建儀表板卡片
function createCard(title, description, link, color) {
    return `
        <div style="background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border-top: 4px solid ${color};">
            <h3 style="color: ${color}; margin-bottom: 0.5rem;">${title}</h3>
            <p style="color: #666; margin-bottom: 1.5rem;">${description}</p>
            <a href="${link}" style="display: inline-block; padding: 0.5rem 1.5rem; background: ${color}; color: white; text-decoration: none; border-radius: 8px; transition: opacity 0.3s;">
                進入管理
            </a>
        </div>
    `;
}

// 綁定登出按鈕
document.getElementById('logoutBtn')?.addEventListener('click', logout);
