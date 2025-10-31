/**
 * 奉香簽到儀表板
 */

import { platformAuth, platformDb, checkinDb } from '/js/firebase-init.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { 
    collection, 
    query, 
    where,
    orderBy,
    limit,
    getDocs,
    getDoc,
    doc,
    Timestamp
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { logout } from '/js/auth.js';

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
        const role = userData.role || 'user';
        
        if (role !== 'poweruser' && role !== 'admin' && role !== 'SuperAdmin') {
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
        await Promise.all([
            loadPatrols(),
            loadUsers(),
            loadAllRecords()
        ]);
        calculateStats();
        renderRecords();
    } catch (error) {
        console.error('初始化失敗:', error);
        alert('載入資料失敗，請重新整理頁面');
    }
}

async function loadPatrols() {
    const patrolsRef = collection(checkinDb, 'patrols');
    const snapshot = await getDocs(patrolsRef);
    
    snapshot.forEach(doc => {
        patrolsList[doc.id] = doc.data();
    });

    const patrolFilter = document.getElementById('patrolFilter');
    Object.keys(patrolsList).forEach(id => {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = patrolsList[id].name || id;
        patrolFilter.appendChild(option);
    });
}

async function loadUsers() {
    const usersRef = collection(platformDb, 'users');
    const snapshot = await getDocs(usersRef);
    
    snapshot.forEach(doc => {
        usersMap[doc.id] = doc.data();
    });
}

async function loadAllRecords() {
    const recordsList = document.getElementById('recordsList');
    recordsList.innerHTML = '<p class="loading">載入簽到記錄中...</p>';

    const checkinsRef = collection(checkinDb, 'checkins');
    const q = query(checkinsRef, orderBy('timestamp', 'desc'), limit(1000));
    
    const snapshot = await getDocs(q);
    
    allRecords = [];
    snapshot.forEach(doc => {
        allRecords.push({
            id: doc.id,
            ...doc.data()
        });
    });

    filteredRecords = [...allRecords];
}

function calculateStats() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);

    const todayRecords = allRecords.filter(r => {
        const recordDate = r.timestamp?.toDate() || new Date(0);
        return recordDate >= todayStart;
    });

    const weekRecords = allRecords.filter(r => {
        const recordDate = r.timestamp?.toDate() || new Date(0);
        return recordDate >= weekStart;
    });

    const activeUsersSet = new Set(weekRecords.map(r => r.userId));

    document.getElementById('todayCount').textContent = todayRecords.length;
    document.getElementById('weekCount').textContent = weekRecords.length;
    document.getElementById('activeUsers').textContent = activeUsersSet.size;
    document.getElementById('totalCount').textContent = allRecords.length;

    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const yesterdayRecords = allRecords.filter(r => {
        const recordDate = r.timestamp?.toDate() || new Date(0);
        return recordDate >= yesterdayStart && recordDate < todayStart;
    });

    const todayChange = todayRecords.length - yesterdayRecords.length;
    const todayTrend = document.getElementById('todayTrend');
    if (todayChange > 0) {
        todayTrend.textContent = `↑ 比昨天多 ${todayChange} 次`;
    } else if (todayChange < 0) {
        todayTrend.textContent = `↓ 比昨天少 ${Math.abs(todayChange)} 次`;
    } else {
        todayTrend.textContent = '與昨天相同';
    }

    const lastWeekStart = new Date(weekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekRecords = allRecords.filter(r => {
        const recordDate = r.timestamp?.toDate() || new Date(0);
        return recordDate >= lastWeekStart && recordDate < weekStart;
    });

    const weekChange = weekRecords.length - lastWeekRecords.length;
    const weekTrend = document.getElementById('weekTrend');
    if (weekChange > 0) {
        weekTrend.textContent = `↑ 比上週多 ${weekChange} 次`;
    } else if (weekChange < 0) {
        weekTrend.textContent = `↓ 比上週少 ${Math.abs(weekChange)} 次`;
    } else {
        weekTrend.textContent = '與上週相同';
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
        if (startDate) {
            const recordDate = record.timestamp?.toDate() || new Date(0);
            const start = new Date(startDate);
            if (recordDate < start) return false;
        }

        if (endDate) {
            const recordDate = record.timestamp?.toDate() || new Date(0);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            if (recordDate > end) return false;
        }

        if (patrolId && record.patrolId !== patrolId) return false;

        if (method && record.method !== method) return false;

        if (testMode) {
            const isTestMode = record.testMode === true;
            if (testMode === 'true' && !isTestMode) return false;
            if (testMode === 'false' && isTestMode) return false;
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
        const timestamp = record.timestamp?.toDate() || new Date();
        const userName = usersMap[record.userId]?.displayName || '未知用戶';
        const patrolName = patrolsList[record.patrolId]?.name || record.patrolId;
        const distance = record.distance !== undefined ? `${record.distance.toFixed(1)} m` : 'N/A';
        const method = record.method === 'gps' ? 'GPS 定位' : 'QR Code';
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

function exportToCSV() {
    if (filteredRecords.length === 0) {
        alert('沒有資料可以匯出');
        return;
    }

    let csv = '\uFEFF時間,用戶名稱,用戶ID,巡邏點,距離(m),簽到方式,測試模式\n';

    filteredRecords.forEach(record => {
        const timestamp = record.timestamp?.toDate() || new Date();
        const userName = usersMap[record.userId]?.displayName || '未知用戶';
        const userId = record.userId || '';
        const patrolName = patrolsList[record.patrolId]?.name || record.patrolId;
        const distance = record.distance !== undefined ? record.distance.toFixed(1) : 'N/A';
        const method = record.method === 'gps' ? 'GPS定位' : 'QRCode';
        const testMode = record.testMode ? '是' : '否';

        csv += `"${formatDateTime(timestamp)}","${userName}","${userId}","${patrolName}","${distance}","${method}","${testMode}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `簽到記錄_${formatDateForFile(new Date())}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    document.getElementById('exportBtn')?.addEventListener('click', exportToCSV);
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
