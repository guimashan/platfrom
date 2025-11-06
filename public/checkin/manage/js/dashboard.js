/**
 * 奉香簽到儀表板 - 統計總覽
 */

import { platformAuth, platformDb, API_ENDPOINTS } from '/js/firebase-init.js';
import { onAuthStateChanged, signInWithCustomToken } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getDoc, doc } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { logout } from '/js/auth.js';
import { callAPI } from '/js/api-helper.js';

const isLiffEnvironment = typeof window.liff !== 'undefined';
const LIFF_ID = '2008269293-Nl2pZBpV';

let currentUser = null;
let currentUserRoles = [];
let allRecords = [];

async function initLiffAuth() {
    try {
        console.log('開始初始化 LIFF...');
        
        await liff.init({ liffId: LIFF_ID });
        console.log('LIFF 初始化成功');
        
        if (!liff.isLoggedIn()) {
            console.log('用戶未登入，執行登入...');
            liff.login();
            return false;
        }
        
        const profile = await liff.getProfile();
        console.log('LINE 用戶:', profile.displayName);
        
        const idToken = liff.getIDToken();
        console.log('準備交換 Firebase Token...');
        
        const response = await fetch('https://asia-east2-platform-bc783.cloudfunctions.net/generateCustomTokenFromLiff', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                liffIdToken: idToken,
                lineUserId: profile.userId,
                displayName: profile.displayName,
                pictureUrl: profile.pictureUrl
            })
        });
        
        const data = await response.json();
        console.log('Token 交換響應:', data);
        
        if (!response.ok || !data.ok) {
            throw new Error(data.message || 'Firebase Token 交換失敗');
        }
        
        await signInWithCustomToken(platformAuth, data.customToken);
        console.log('Firebase 登入成功');
        
        const userAvatarEl = document.getElementById('userAvatar');
        const userNameEl = document.getElementById('userName');
        if (userAvatarEl) userAvatarEl.src = profile.pictureUrl;
        if (userNameEl) userNameEl.textContent = profile.displayName;
        
        window.closeLiffWindow = () => liff.closeWindow();
        
        return true;
    } catch (error) {
        console.error('LIFF 初始化失敗:', error);
        alert('LIFF 初始化失敗: ' + error.message);
        return false;
    }
}

async function handleAuth(user) {
    if (!user) {
        if (!isLiffEnvironment) {
            window.location.href = '/checkin/manage/index.html';
        }
        return;
    }
    
    try {
        const userDoc = await getDoc(doc(platformDb, 'users', user.uid));
        if (!userDoc.exists()) {
            alert('找不到用戶資料');
            window.location.href = '/';
            return;
        }
        
        const userData = userDoc.data();
        const roles = userData.roles || [];
        
        const hasPermission = roles.some(role => 
            role === 'poweruser_checkin' || role === 'admin_checkin' || role === 'superadmin'
        );
        
        if (!hasPermission) {
            alert('您沒有權限存取此頁面');
            window.location.href = '/';
            return;
        }
        
        currentUser = user;
        currentUserRoles = roles;
        
        document.getElementById('loginPrompt').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
        
        await init();
    } catch (error) {
        console.error('權限檢查失敗:', error);
        alert('權限驗證失敗');
        window.location.href = '/';
    }
}

onAuthStateChanged(platformAuth, handleAuth);

if (isLiffEnvironment) {
    (async () => {
        await initLiffAuth();
    })();
}

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
