import {
    checkManagePermission,
    showLoading,
    showMessage,
    logout,
    manageAPI,
    API_ENDPOINTS
} from './manage-common.js';

let allRecords = [];
let filteredRecords = [];
let currentPage = 1;
const recordsPerPage = 50;
let patrols = [];

// 初始化頁面
(async function init() {
    try {
        showLoading(true);

        // 檢查權限
        const hasPermission = await checkManagePermission();
        if (!hasPermission) {
            window.location.href = '/checkin/checkin.html';
            return;
        }

        // 載入巡邏點列表（用於篩選）
        await loadPatrols();

        // 載入簽到紀錄
        await loadRecords();

        // 設置預設日期（最近 7 天）並自動套用篩選
        const today = new Date();
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 7);

        document.getElementById('filterStartDate').valueAsDate = sevenDaysAgo;
        document.getElementById('filterEndDate').valueAsDate = today;

        // 自動套用 7 天篩選
        applyFilters();

    } catch (error) {
        console.error('初始化失敗:', error);
        showMessage('初始化失敗: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
})();

/**
 * 載入巡邏點列表
 */
async function loadPatrols() {
    try {
        const response = await manageAPI(API_ENDPOINTS.getPatrols);
        
        if (!response.ok) {
            throw new Error(response.message || '載入巡邏點失敗');
        }

        patrols = response.patrols || [];

        // 填充巡邏點篩選下拉選單
        const filterPatrol = document.getElementById('filterPatrol');
        filterPatrol.innerHTML = '<option value="">全部巡邏點</option>';
        
        patrols.forEach(patrol => {
            const option = document.createElement('option');
            option.value = patrol.id;
            option.textContent = patrol.name;
            filterPatrol.appendChild(option);
        });

    } catch (error) {
        console.error('載入巡邏點失敗:', error);
        showMessage('載入巡邏點失敗: ' + error.message, 'error');
    }
}

/**
 * 載入簽到紀錄
 */
async function loadRecords() {
    try {
        showLoading(true);

        const response = await manageAPI(API_ENDPOINTS.getCheckinHistory, {
            method: 'GET',
            params: {
                limit: 1000
            }
        });

        if (!response.ok) {
            throw new Error(response.message || '載入簽到紀錄失敗');
        }

        allRecords = response.checkins || [];
        filteredRecords = [...allRecords];

        // 更新統計
        updateStats();

        // 重置到第一頁
        currentPage = 1;
        renderTable();

    } catch (error) {
        console.error('載入簽到紀錄失敗:', error);
        showMessage('載入簽到紀錄失敗: ' + error.message, 'error');
        
        // 顯示空狀態
        const tbody = document.getElementById('recordsTableBody');
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    <div class="empty-state-icon">❌</div>
                    <div>載入失敗：${error.message}</div>
                </td>
            </tr>
        `;
    } finally {
        showLoading(false);
    }
}

/**
 * 更新統計數據
 */
function updateStats() {
    const total = filteredRecords.length;
    
    // 計算今日簽到數
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const today = filteredRecords.filter(r => r.timestamp >= todayStart.getTime()).length;
    
    // 計算測試模式數
    const testMode = filteredRecords.filter(r => r.testMode === true).length;
    
    // 計算異常簽到數（檢查 anomaly 或 hasAnomaly 欄位）
    const anomaly = filteredRecords.filter(r => r.anomaly === true || r.hasAnomaly === true).length;

    document.getElementById('totalCount').textContent = total.toLocaleString();
    document.getElementById('todayCount').textContent = today.toLocaleString();
    document.getElementById('testModeCount').textContent = testMode.toLocaleString();
    document.getElementById('anomalyCount').textContent = anomaly.toLocaleString();
}

/**
 * 渲染表格
 */
function renderTable() {
    const tbody = document.getElementById('recordsTableBody');
    
    if (filteredRecords.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">
                    <div class="empty-state-icon">📭</div>
                    <div>沒有符合條件的簽到紀錄</div>
                </td>
            </tr>
        `;
        updatePagination();
        return;
    }

    // 分頁計算
    const startIndex = (currentPage - 1) * recordsPerPage;
    const endIndex = Math.min(startIndex + recordsPerPage, filteredRecords.length);
    const pageRecords = filteredRecords.slice(startIndex, endIndex);

    tbody.innerHTML = pageRecords.map(record => {
        const time = new Date(record.timestamp);
        const timeStr = time.toLocaleString('zh-TW', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });

        const modeClass = record.mode || 'gps';
        const modeText = {
            'gps': 'GPS 定位',
            'qr': 'QR Code',
            'both': '雙重驗證'
        }[modeClass] || record.mode;

        const distanceText = record.distance !== undefined 
            ? `${Math.round(record.distance)}m` 
            : '-';

        const locationHtml = record.location
            ? `<a href="https://www.google.com/maps?q=${record.location._latitude},${record.location._longitude}" 
                  target="_blank" class="location-link">
                  📍 查看地圖
               </a>`
            : '-';

        const testModeHtml = record.testMode
            ? '<span class="test-mode-badge">測試</span>'
            : '';

        // 照片欄位（未來實作）
        const photoHtml = record.photoUrl
            ? `<img src="${record.photoUrl}" alt="簽到照片" class="photo-thumbnail" onclick="window.open('${record.photoUrl}', '_blank')">`
            : '<span style="color: #999; font-size: 12px;">-</span>';

        // 狀態欄位（檢查異常）
        const hasAnomaly = record.anomaly === true || record.hasAnomaly === true;
        const statusHtml = hasAnomaly
            ? '<span class="anomaly-badge">⚠️ 異常</span>'
            : '<span style="color: #28a745;">✅ 正常</span>';

        return `
            <tr>
                <td>${timeStr}</td>
                <td style="font-family: monospace; font-size: 12px;">${record.userId.substring(0, 8)}...</td>
                <td><strong>${record.patrolName}</strong></td>
                <td>
                    <span class="mode-badge ${modeClass}">${modeText}</span>
                    ${testModeHtml}
                </td>
                <td>${distanceText}</td>
                <td>${locationHtml}</td>
                <td>${photoHtml}</td>
                <td>${statusHtml}</td>
            </tr>
        `;
    }).join('');

    updatePagination();
}

/**
 * 更新分頁控制
 */
function updatePagination() {
    const totalRecords = filteredRecords.length;
    const totalPages = Math.ceil(totalRecords / recordsPerPage);
    const startIndex = (currentPage - 1) * recordsPerPage + 1;
    const endIndex = Math.min(currentPage * recordsPerPage, totalRecords);

    document.getElementById('paginationInfo').textContent = 
        `顯示 ${startIndex.toLocaleString()} - ${endIndex.toLocaleString()} 筆，共 ${totalRecords.toLocaleString()} 筆`;

    document.getElementById('prevBtn').disabled = currentPage === 1;
    document.getElementById('nextBtn').disabled = currentPage >= totalPages || totalPages === 0;
}

/**
 * 套用篩選
 */
function applyFilters() {
    const startDate = document.getElementById('filterStartDate').value;
    const endDate = document.getElementById('filterEndDate').value;
    const patrolId = document.getElementById('filterPatrol').value;
    const mode = document.getElementById('filterMode').value;
    const testMode = document.getElementById('filterTestMode').value;
    const userId = document.getElementById('filterUserId').value.trim();

    filteredRecords = allRecords.filter(record => {
        // 日期篩選
        if (startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            if (record.timestamp < start.getTime()) return false;
        }

        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            if (record.timestamp > end.getTime()) return false;
        }

        // 巡邏點篩選
        if (patrolId && record.patrolId !== patrolId) return false;

        // 簽到方式篩選
        if (mode && record.mode !== mode) return false;

        // 測試模式篩選
        if (testMode === 'true' && !record.testMode) return false;
        if (testMode === 'false' && record.testMode) return false;

        // 用戶 ID 篩選
        if (userId && !record.userId.includes(userId)) return false;

        // 異常狀態篩選
        const anomaly = document.getElementById('filterAnomaly').value;
        const hasAnomaly = record.anomaly === true || record.hasAnomaly === true;
        if (anomaly === 'true' && !hasAnomaly) return false;
        if (anomaly === 'false' && hasAnomaly) return false;

        return true;
    });

    // 更新統計
    updateStats();

    // 重置到第一頁
    currentPage = 1;
    renderTable();

    showMessage(`已套用篩選，找到 ${filteredRecords.length} 筆記錄`, 'success');
};

/**
 * 重置篩選
 */
function resetFilters() {
    document.getElementById('filterStartDate').value = '';
    document.getElementById('filterEndDate').value = '';
    document.getElementById('filterPatrol').value = '';
    document.getElementById('filterMode').value = '';
    document.getElementById('filterTestMode').value = '';
    document.getElementById('filterUserId').value = '';
    document.getElementById('filterAnomaly').value = '';

    filteredRecords = [...allRecords];
    updateStats();
    currentPage = 1;
    renderTable();

    showMessage('已重置篩選條件', 'success');
};

/**
 * 重新整理
 */
async function refreshRecords() {
    await loadRecords();
    showMessage('已重新整理', 'success');
};

/**
 * 上一頁
 */
function previousPage() {
    if (currentPage > 1) {
        currentPage--;
        renderTable();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};

/**
 * 下一頁
 */
function nextPage() {
    const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderTable();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};

/**
 * 導出為 Excel
 */
function exportToExcel() {
    if (filteredRecords.length === 0) {
        showMessage('沒有資料可以導出', 'warning');
        return;
    }

    try {
        // 準備導出資料
        const exportData = filteredRecords.map(record => {
            const time = new Date(record.timestamp);
            
            return {
                '時間': time.toLocaleString('zh-TW'),
                '用戶 ID': record.userId,
                '巡邏點': record.patrolName,
                '簽到方式': {
                    'gps': 'GPS 定位',
                    'qr': 'QR Code',
                    'both': '雙重驗證'
                }[record.mode] || record.mode,
                '距離 (m)': record.distance !== undefined ? Math.round(record.distance) : '',
                '緯度': record.location ? record.location._latitude : '',
                '經度': record.location ? record.location._longitude : '',
                '測試模式': record.testMode ? '是' : '否',
                '照片 URL': record.photoUrl || '',
                '狀態': (record.anomaly === true || record.hasAnomaly === true) ? '異常' : '正常'
            };
        });

        // 建立工作表
        const ws = XLSX.utils.json_to_sheet(exportData);

        // 設置欄寬
        ws['!cols'] = [
            { wch: 20 },  // 時間
            { wch: 15 },  // 用戶 ID
            { wch: 20 },  // 巡邏點
            { wch: 12 },  // 簽到方式
            { wch: 10 },  // 距離
            { wch: 12 },  // 緯度
            { wch: 12 },  // 經度
            { wch: 10 },  // 測試模式
            { wch: 40 },  // 照片 URL
            { wch: 8 }    // 狀態
        ];

        // 建立工作簿
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '簽到紀錄');

        // 生成檔案名稱
        const now = new Date();
        const filename = `簽到紀錄_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}.xlsx`;

        // 下載檔案
        XLSX.writeFile(wb, filename);

        showMessage(`已導出 ${filteredRecords.length} 筆記錄到 Excel`, 'success');

    } catch (error) {
        console.error('導出 Excel 失敗:', error);
        showMessage('導出 Excel 失敗: ' + error.message, 'error');
    }
};

// 匯出函數到全域供 HTML onclick 使用
window.applyFilters = applyFilters;
window.resetFilters = resetFilters;
window.refreshRecords = refreshRecords;
window.previousPage = previousPage;
window.nextPage = nextPage;
window.exportToExcel = exportToExcel;
window.logout = logout;
