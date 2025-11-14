/**
 * 簽到記錄查詢
 */

import { platformAuth, platformDb, checkinFunctions, API_ENDPOINTS } from '/js/firebase-init.js';
import { onAuthStateChanged, signInWithCustomToken } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getDoc, doc, collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { httpsCallable } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js';
import { logout } from '/js/auth.js';
import { callAPI } from '/js/api-helper.js';

let currentUser = null;
let currentUserRoles = [];
let allRecords = [];
let filteredRecords = [];
let patrolsList = {};
let usersMap = {};

const ITEMS_PER_PAGE = 50;
let currentPage = 1;

// 由 HTML checkAdminAuth 成功後調用此函數初始化
export async function init() {
    try {
        // HTML 已經驗證過權限，直接取得當前用戶
        currentUser = platformAuth.currentUser;
        
        if (!currentUser) {
            console.error('無法取得用戶資訊');
            window.location.href = '/';
            return;
        }
        
        // 顯示主要內容區域
        const mainApp = document.getElementById('mainApp');
        if (mainApp) {
            mainApp.style.display = 'block';
        }
        
        // 取得用戶角色
        const userDoc = await getDoc(doc(platformDb, 'users', currentUser.uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            currentUserRoles = userData.roles || [];
        }
        
        // 載入資料並初始化
        await initializeData();
    } catch (error) {
        console.error('初始化失敗:', error);
        alert('載入資料失敗，請重新整理頁面');
    }
}

async function initializeData() {
    await Promise.all([
        loadPatrols(),
        loadUsers(),
        loadAllRecords()
    ]);
    
    applyFilters();
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
        // 使用 Callable Function (部署在 checkin-76c77)
        const getCheckinHistory = httpsCallable(checkinFunctions, 'getCheckinHistoryCallable');
        const result = await getCheckinHistory({ limit: 50000 });
        
        allRecords = result.data.checkins || [];
        
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
