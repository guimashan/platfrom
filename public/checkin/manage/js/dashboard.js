/**
 * 奉香簽到儀表板 - 統計總覽
 */

import { platformAuth, platformDb, API_ENDPOINTS } from '/js/firebase-init.js';
import { onAuthStateChanged, signInWithCustomToken } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getDoc, doc } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { logout } from '/js/auth.js';
import { callAPI } from '/js/api-helper.js';

let currentUser = null;
let currentUserRoles = [];
let allRecords = [];

// 初始化（HTML checkAdminAuth 已確保認證完成）
(async function initModule() {
    const user = platformAuth.currentUser;
    if (!user) {
        console.error('❌ 用戶未登入，這不應該發生');
        return;
    }
    
    currentUser = user;
    
    // 載入用戶角色
    try {
        const userDoc = await getDoc(doc(platformDb, 'users', user.uid));
        if (userDoc.exists()) {
            currentUserRoles = userDoc.data().roles || [];
        }
    } catch (error) {
        console.error('載入用戶資料失敗:', error);
    }
    
    // 顯示主要內容
    const mainApp = document.getElementById('mainApp');
    if (mainApp) {
        mainApp.style.display = 'block';
    }
    
    await init();
})();

async function init() {
    try {
        document.getElementById('todayCount').textContent = '載入中...';
        document.getElementById('weekCount').textContent = '載入中...';
        document.getElementById('activeUsers').textContent = '載入中...';
        document.getElementById('totalCount').textContent = '載入中...';
        
        await loadAllRecords();
        calculateStats();
    } catch (error) {
        console.error('初始化失敗:', error);
        alert('載入資料失敗，請重新整理頁面');
    }
}

async function loadAllRecords() {
    try {
        const result = await callAPI(API_ENDPOINTS.getCheckinHistory + '?limit=10000', {
            method: 'GET'
        });
        
        allRecords = result.checkins || [];
        console.log(`已載入 ${allRecords.length} 筆簽到記錄`);
    } catch (error) {
        console.error('載入簽到記錄失敗:', error);
        allRecords = [];
    }
}

function calculateStats() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);

    const isAdmin = currentUserRoles.some(role => 
        role === 'superadmin' || role === 'admin_checkin'
    );

    const visibleRecords = isAdmin ? allRecords : allRecords.filter(r => r.userId === currentUser.uid);

    const todayRecords = visibleRecords.filter(r => {
        const recordDate = r.timestamp?._seconds ? new Date(r.timestamp._seconds * 1000) : new Date(0);
        return recordDate >= todayStart;
    });

    const weekRecords = visibleRecords.filter(r => {
        const recordDate = r.timestamp?._seconds ? new Date(r.timestamp._seconds * 1000) : new Date(0);
        return recordDate >= weekStart;
    });

    const activeUsersSet = new Set(weekRecords.map(r => r.userId));

    document.getElementById('todayCount').textContent = todayRecords.length;
    document.getElementById('weekCount').textContent = weekRecords.length;
    document.getElementById('activeUsers').textContent = activeUsersSet.size;
    document.getElementById('totalCount').textContent = visibleRecords.length;

    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const yesterdayRecords = visibleRecords.filter(r => {
        const recordDate = r.timestamp?._seconds ? new Date(r.timestamp._seconds * 1000) : new Date(0);
        return recordDate >= yesterdayStart && recordDate < todayStart;
    });

    const todayChange = todayRecords.length - yesterdayRecords.length;
    const todayTrend = document.getElementById('todayTrend');
    if (todayChange > 0) {
        todayTrend.textContent = `↑ 比昨天多 ${todayChange} 次`;
        todayTrend.style.color = '#4caf50';
    } else if (todayChange < 0) {
        todayTrend.textContent = `↓ 比昨天少 ${Math.abs(todayChange)} 次`;
        todayTrend.style.color = '#f44336';
    } else {
        todayTrend.textContent = '與昨天相同';
        todayTrend.style.color = '#999';
    }

    const lastWeekStart = new Date(weekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekRecords = visibleRecords.filter(r => {
        const recordDate = r.timestamp?._seconds ? new Date(r.timestamp._seconds * 1000) : new Date(0);
        return recordDate >= lastWeekStart && recordDate < weekStart;
    });

    const weekChange = weekRecords.length - lastWeekRecords.length;
    const weekTrend = document.getElementById('weekTrend');
    if (weekChange > 0) {
        weekTrend.textContent = `↑ 比上週多 ${weekChange} 次`;
        weekTrend.style.color = '#4caf50';
    } else if (weekChange < 0) {
        weekTrend.textContent = `↓ 比上週少 ${Math.abs(weekChange)} 次`;
        weekTrend.style.color = '#f44336';
    } else {
        weekTrend.textContent = '與上週相同';
        weekTrend.style.color = '#999';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (!isLiffEnvironment) {
        document.getElementById('logoutBtn')?.addEventListener('click', logout);
    }
});
