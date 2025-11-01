/**
 * 奉香簽到儀表板
 */

import { platformAuth, platformDb, API_ENDPOINTS } from '/js/firebase-init.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getDoc, doc, collection, getDocs, query, orderBy, limit as firestoreLimit } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { logout } from '/js/auth.js';
import { callAPI } from '/js/api-helper.js';

let currentUser = null;
let allRecords = [];
let filteredRecords = [];
let patrolsList = {};
let usersMap = {};

const ITEMS_PER_PAGE = 50;
let currentPage = 1;

// 監聽認證狀態
onAuthStateChanged(platformAuth, async (user) => {
    if (!user) {
        window.location.href = '/checkin/manage/index.html';
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
        await init();
    } catch (error) {
        console.error('權限檢查失敗:', error);
        alert('權限驗證失敗');
        window.location.href = '/';
    }
});

async function init() {
    try {
        // 顯示載入狀態
        document.getElementById('todayCount').textContent = '載入中...';
        document.getElementById('weekCount').textContent = '載入中...';
        document.getElementById('activeUsers').textContent = '載入中...';
        document.getElementById('totalCount').textContent = '載入中...';
        
        // 載入所有數據
        await Promise.all([
            loadPatrols(),
            loadUsers(),
            loadAllRecords()
        ]);
        
        // 計算統計數據
        calculateStats();
        
        // 初始化篩選
        filteredRecords = [...allRecords];
        renderRecords();
        
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
        // 保留第一個 "全部" 選項
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
        const result = await callAPI(API_ENDPOINTS.getCheckinHistory, {
            method: 'GET',
            params: { limit: 1000 } // 載入最近 1000 筆
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

    const todayRecords = allRecords.filter(r => {
        const recordDate = r.timestamp?._seconds ? new Date(r.timestamp._seconds * 1000) : new Date(0);
        return recordDate >= todayStart;
    });

    const weekRecords = allRecords.filter(r => {
        const recordDate = r.timestamp?._seconds ? new Date(r.timestamp._seconds * 1000) : new Date(0);
        return recordDate >= weekStart;
    });

    const activeUsersSet = new Set(weekRecords.map(r => r.userId));

    document.getElementById('todayCount').textContent = todayRecords.length;
    document.getElementById('weekCount').textContent = weekRecords.length;
    document.getElementById('activeUsers').textContent = activeUsersSet.size;
    document.getElementById('totalCount').textContent = allRecords.length;

    // 計算趨勢
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const yesterdayRecords = allRecords.filter(r => {
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
    const lastWeekRecords = allRecords.filter(r => {
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

function applyFilters() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const patrolId = document.getElementById('patrolFilter').value;
    const method = document.getElementById('methodFilter').value;
    const testMode = document.getElementById('testModeFilter').value;
    const userSearch = document.getElementById('userSearch').value.toLowerCase();

    filteredRecords = allRecords.filter(record => {
        // 日期篩選
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

        // 巡邏點篩選
        if (patrolId && record.patrolId !== patrolId) return false;

        // 簽到方式篩選（注意：API 返回的是 mode，不是 method）
        if (method) {
            const recordMode = record.mode || 'gps';
            if (method === 'qrcode' && recordMode !== 'qr') return false;
            if (method === 'gps' && recordMode !== 'gps') return false;
        }

        // 測試模式篩選
        if (testMode) {
            const isTestMode = record.testMode === true;
            if (testMode === 'true' && !isTestMode) return false;
            if (testMode === 'false' && isTestMode) return false;
        }

        // 用戶搜尋
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
        // 優先使用 API 返回的 userName，否則從 usersMap 查找
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

    // 使用 SheetJS 匯出 Excel
    const data = filteredRecords.map(record => {
        const timestamp = record.timestamp?._seconds ? new Date(record.timestamp._seconds * 1000) : new Date();
        // 優先使用 API 返回的 userName
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

    // 動態載入 SheetJS
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
    document.getElementById('testModeFilter').value = '';
    document.getElementById('userSearch').value = '';
    
    filteredRecords = [...allRecords];
    currentPage = 1;
    renderRecords();
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
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
