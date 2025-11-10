/**
 * 簽到記錄查詢
 */

import { platformAuth, platformDb, API_ENDPOINTS } from '/js/firebase-init.js';
import { onAuthStateChanged, signInWithCustomToken } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getDoc, doc, collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { logout } from '/js/auth.js';
import { callAPI } from '/js/api-helper.js';

const isLiffEnvironment = typeof window.liff !== 'undefined';
const LIFF_ID = '2008269293-Nl2pZBpV';

let currentUser = null;
let currentUserRoles = [];
let allRecords = [];
let filteredRecords = [];
let patrolsList = {};
let usersMap = {};

const ITEMS_PER_PAGE = 50;
let currentPage = 1;

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
        await Promise.all([
            loadPatrols(),
            loadUsers(),
            loadAllRecords()
        ]);
        
        applyFilters();
    } catch (error) {
        console.error('初始化失敗:', error);
        alert('載入資料失敗，請重新整理頁面');
    }
}

async function loadPatrols() {
    try {
        const result = await callAPI(API_ENDPOINTS.getPatrols, {
            method: 'GET'
        });
        
        const patrols = result.patrols || [];
        patrolsList = {};
        
        const patrolFilter = document.getElementById('patrolFilter');
        patrolFilter.innerHTML = '<option value="">全部</option>';
        
        patrols.forEach(patrol => {
            patrolsList[patrol.id] = patrol;
            
            const option = document.createElement('option');
            option.value = patrol.id;
            option.textContent = patrol.name;
            patrolFilter.appendChild(option);
        });
        
        console.log(`已載入 ${patrols.length} 個巡邏點`);
    } catch (error) {
        console.error('載入巡邏點失敗:', error);
    }
}

async function loadUsers() {
    try {
        const usersSnapshot = await getDocs(collection(platformDb, 'users'));
        usersMap = {};
        
        usersSnapshot.forEach(doc => {
            usersMap[doc.id] = doc.data();
        });
        
        console.log(`已載入 ${usersSnapshot.size} 個用戶`);
    } catch (error) {
        console.error('載入用戶失敗:', error);
    }
}

async function loadAllRecords() {
    try {
        const result = await callAPI(API_ENDPOINTS.getCheckinHistory + '?limit=50000', {
            method: 'GET'
        });
        
        allRecords = result.checkins || [];
        
        console.log(`已載入 ${allRecords.length} 筆簽到記錄`);
    } catch (error) {
        console.error('載入簽到記錄失敗:', error);
        allRecords = [];
    }
}

function applyFilters() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const patrolId = document.getElementById('patrolFilter').value;
    const method = document.getElementById('methodFilter').value;
    const userSearch = document.getElementById('userSearch').value.toLowerCase();

    const isAdmin = currentUserRoles.some(role => 
        role === 'superadmin' || role === 'admin_checkin'
    );

    filteredRecords = allRecords.filter(record => {
        if (!isAdmin && record.userId !== currentUser.uid) {
            return false;
        }

        if (startDate) {
            const recordDate = record.timestamp?._seconds ? new Date(record.timestamp._seconds * 1000) : new Date(0);
            const start = new Date(startDate);
            if (recordDate < start) return false;
        }

        if (endDate) {
            const recordDate = record.timestamp?._seconds ? new Date(record.timestamp._seconds * 1000) : new Date(0);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            if (recordDate > end) return false;
        }

        if (patrolId && record.patrolId !== patrolId) return false;

        if (method) {
            const recordMode = record.mode || 'gps';
            if (method === 'qrcode' && recordMode !== 'qr') return false;
            if (method === 'gps' && recordMode !== 'gps') return false;
        }

        if (userSearch) {
            const userName = usersMap[record.userId]?.displayName || '';
            const userId = record.userId || '';
            if (!userName.toLowerCase().includes(userSearch) && 
                !userId.toLowerCase().includes(userSearch)) {
                return false;
            }
        }

        return true;
    });

    currentPage = 1;
    renderRecords();
}

function renderRecords() {
    const recordsList = document.getElementById('recordsList');
    const pagination = document.getElementById('pagination');

    if (filteredRecords.length === 0) {
        recordsList.innerHTML = '<p class="no-data">沒有符合條件的簽到記錄</p>';
        pagination.style.display = 'none';
        return;
    }

    const totalPages = Math.ceil(filteredRecords.length / ITEMS_PER_PAGE);
    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIdx = Math.min(startIdx + ITEMS_PER_PAGE, filteredRecords.length);
    const pageRecords = filteredRecords.slice(startIdx, endIdx);

    let html = `
        <table>
            <thead>
                <tr>
                    <th>時間</th>
                    <th>用戶</th>
                    <th>巡邏點</th>
                    <th>距離</th>
                    <th>方式</th>
                    <th>狀態</th>
                </tr>
            </thead>
            <tbody>
    `;

    pageRecords.forEach(record => {
        const timestamp = record.timestamp?._seconds ? new Date(record.timestamp._seconds * 1000) : new Date();
        const userName = record.userName || usersMap[record.userId]?.displayName || '未知用戶';
        const patrolName = record.patrolName || patrolsList[record.patrolId]?.name || record.patrolId;
        const distance = record.distance !== undefined ? `${record.distance.toFixed(1)} m` : 'N/A';
        const method = (record.mode === 'qr') ? 'QR Code' : 'GPS 定位';
        const testMode = record.testMode ? '<span class="badge warning">測試</span>' : '<span class="badge success">正式</span>';

        html += `
            <tr>
                <td>${formatDateTime(timestamp)}</td>
                <td>${userName}</td>
                <td>${patrolName}</td>
                <td>${distance}</td>
                <td>${method}</td>
                <td>${testMode}</td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    recordsList.innerHTML = html;

    document.getElementById('pageInfo').textContent = `第 ${currentPage} / ${totalPages} 頁 (共 ${filteredRecords.length} 筆)`;
    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = currentPage === totalPages;
    pagination.style.display = 'block';
}

async function exportToExcel() {
    if (filteredRecords.length === 0) {
        alert('沒有資料可以匯出');
        return;
    }

    const data = filteredRecords.map(record => {
        const timestamp = record.timestamp?._seconds ? new Date(record.timestamp._seconds * 1000) : new Date();
        const userName = record.userName || usersMap[record.userId]?.displayName || '未知用戶';
        const patrolName = record.patrolName || patrolsList[record.patrolId]?.name || record.patrolId;
        const distance = record.distance !== undefined ? record.distance.toFixed(1) : 'N/A';
        const method = (record.mode === 'qr') ? 'QR Code' : 'GPS 定位';
        const testMode = record.testMode ? '是' : '否';

        return {
            '時間': formatDateTime(timestamp),
            '用戶名稱': userName,
            '用戶ID': record.userId || '',
            '巡邏點': patrolName,
            '距離(m)': distance,
            '簽到方式': method,
            '測試模式': testMode
        };
    });

    if (typeof XLSX === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js';
        script.onload = () => performExport(data);
        document.head.appendChild(script);
    } else {
        performExport(data);
    }
}

function performExport(data) {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '簽到記錄');
    
    const filename = `簽到記錄_${formatDateForFile(new Date())}.xlsx`;
    XLSX.writeFile(workbook, filename);
}

function formatDateTime(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function formatDateForFile(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}${month}${day}`;
}

function resetFilters() {
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    document.getElementById('patrolFilter').value = '';
    document.getElementById('methodFilter').value = '';
    document.getElementById('userSearch').value = '';
    
    applyFilters();
}

document.addEventListener('DOMContentLoaded', () => {
    if (!isLiffEnvironment) {
        document.getElementById('logoutBtn')?.addEventListener('click', logout);
    }
    
    document.getElementById('exportBtn')?.addEventListener('click', exportToExcel);
    document.getElementById('applyFilterBtn')?.addEventListener('click', applyFilters);
    document.getElementById('resetFilterBtn')?.addEventListener('click', resetFilters);
    
    document.getElementById('prevPage')?.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderRecords();
        }
    });
    
    document.getElementById('nextPage')?.addEventListener('click', () => {
        const totalPages = Math.ceil(filteredRecords.length / ITEMS_PER_PAGE);
        if (currentPage < totalPages) {
            currentPage++;
            renderRecords();
        }
    });
});
