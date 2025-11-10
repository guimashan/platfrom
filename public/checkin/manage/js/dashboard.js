/**
 * Dashboard（一覽表）控制器
 */

import { 
    initManagePage, 
    showMessage, 
    showLoading, 
    formatDateTime,
    detectCheckinAnomaly,
    manageAPI,
    API_ENDPOINTS
} from './manage-common.js';

let stats = null;
let recentCheckins = [];
let trendChart = null;
let currentPeriod = 30;

// 初始化頁面
(async function init() {
    try {
        await initManagePage({
            requiredRoles: ['admin_checkin', 'poweruser_checkin', 'superadmin'],
            activePage: 'dashboard',
            onSuccess: async () => {
                await loadDashboardData();
                setupEventListeners();
            }
        });
    } catch (error) {
        console.error('Dashboard 初始化失敗:', error);
        showMessage('載入失敗: ' + error.message, 'error');
    }
})();

/**
 * 載入儀表板資料
 */
async function loadDashboardData() {
    try {
        showLoading(true);

        // 並行載入所有資料
        const [statsResult, patrolsResult, checkinsResult] = await Promise.all([
            manageAPI(API_ENDPOINTS.getDashboardStats),
            manageAPI(API_ENDPOINTS.getPatrols),
            manageAPI(API_ENDPOINTS.getCheckinHistory + '?limit=20')
        ]);

        stats = statsResult;
        const patrols = patrolsResult.patrols || [];
        recentCheckins = checkinsResult.records || [];

        // 更新 KPI
        updateKPIs(stats, patrols);

        // 更新巡邏點狀態
        updatePatrolStatus(patrols, recentCheckins);

        // 更新最近簽到
        updateRecentCheckins(recentCheckins);

        // 更新異常警報
        updateAnomalyAlerts(recentCheckins);

        // 初始化趨勢圖表
        await initTrendChart(currentPeriod);

    } catch (error) {
        console.error('載入資料失敗:', error);
        showMessage('載入資料失敗: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * 更新 KPI 卡片
 */
function updateKPIs(stats, patrols) {
    // 今日簽到數
    document.getElementById('todayCount').textContent = stats?.todayCount || 0;

    // 活躍用戶
    document.getElementById('activeUsers').textContent = stats?.activeUsers || 0;

    // 異常簽到數
    const anomalyCount = recentCheckins.filter(record => {
        const detection = detectCheckinAnomaly(record);
        return detection.hasAnomaly;
    }).length;
    document.getElementById('anomalyCount').textContent = anomalyCount;

    // 巡邏點數量
    const activePatrols = patrols.filter(p => p.active !== false).length;
    document.getElementById('patrolCount').textContent = activePatrols;
}

/**
 * 更新巡邏點狀態
 */
function updatePatrolStatus(patrols, checkins) {
    const container = document.getElementById('patrolStatus');
    
    if (patrols.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">尚無巡邏點</p>';
        return;
    }

    // 計算每個巡邏點今日的簽到數
    const today = new Date().toISOString().split('T')[0];
    const todayCheckins = checkins.filter(c => {
        const checkinDate = new Date(c.checkinAt).toISOString().split('T')[0];
        return checkinDate === today;
    });

    const html = `
        <table class="manage-table">
            <thead>
                <tr>
                    <th>巡邏點</th>
                    <th>今日簽到</th>
                    <th>驗證模式</th>
                    <th>狀態</th>
                </tr>
            </thead>
            <tbody>
                ${patrols.map(patrol => {
                    const count = todayCheckins.filter(c => c.patrolId === patrol.id).length;
                    const mode = patrol.verificationMode || 'gps';
                    const modeText = {
                        'gps': '📍 GPS',
                        'qr': '📷 QR Code',
                        'both': '📍+📷 雙重驗證'
                    }[mode] || mode;
                    
                    return `
                        <tr>
                            <td><strong>${patrol.name}</strong></td>
                            <td>${count} 次</td>
                            <td>${modeText}</td>
                            <td>
                                ${patrol.active !== false 
                                    ? '<span style="color: #28a745;">✓ 啟用</span>' 
                                    : '<span style="color: #999;">✗ 停用</span>'}
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = html;
}

/**
 * 更新最近簽到
 */
function updateRecentCheckins(checkins) {
    const container = document.getElementById('recentCheckins');
    
    if (checkins.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">今日尚無簽到記錄</p>';
        return;
    }

    const html = `
        <table class="manage-table">
            <thead>
                <tr>
                    <th>時間</th>
                    <th>用戶</th>
                    <th>巡邏點</th>
                    <th>模式</th>
                    <th>狀態</th>
                </tr>
            </thead>
            <tbody>
                ${checkins.slice(0, 10).map(record => {
                    const detection = detectCheckinAnomaly(record);
                    const modeIcon = record.mode === 'qr' ? '📷' : '📍';
                    
                    return `
                        <tr>
                            <td>${formatDateTime(record.checkinAt)}</td>
                            <td>${record.userName || record.userId}</td>
                            <td>${record.patrolName || record.patrolId}</td>
                            <td>${modeIcon} ${record.mode?.toUpperCase() || 'GPS'}</td>
                            <td>
                                ${detection.hasAnomaly 
                                    ? `<span class="anomaly-badge ${detection.severity >= 3 ? 'high' : detection.severity >= 2 ? 'medium' : 'low'}">異常</span>`
                                    : '<span style="color: #28a745;">✓ 正常</span>'}
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = html;
}

/**
 * 更新異常警報
 */
function updateAnomalyAlerts(checkins) {
    const anomalies = checkins
        .map(record => ({
            record,
            detection: detectCheckinAnomaly(record)
        }))
        .filter(item => item.detection.hasAnomaly)
        .slice(0, 5);

    const container = document.getElementById('anomalyAlerts');
    
    if (anomalies.length === 0) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'block';
    
    const listHTML = `
        <table class="manage-table">
            <thead>
                <tr>
                    <th>時間</th>
                    <th>用戶</th>
                    <th>巡邏點</th>
                    <th>異常原因</th>
                </tr>
            </thead>
            <tbody>
                ${anomalies.map(({ record, detection }) => `
                    <tr>
                        <td>${formatDateTime(record.checkinAt)}</td>
                        <td>${record.userName || record.userId}</td>
                        <td>${record.patrolName || record.patrolId}</td>
                        <td>
                            ${detection.anomalies.map(a => 
                                `<span class="anomaly-badge ${a.severity}">${a.message}</span>`
                            ).join(' ')}
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    document.getElementById('anomalyList').innerHTML = listHTML;
}

/**
 * 初始化趨勢圖表
 */
async function initTrendChart(days = 30) {
    try {
        const response = await manageAPI(`${API_ENDPOINTS.getDashboardStats}?days=${days}`);
        const chartData = response.trendData || generateMockTrendData(days);

        const ctx = document.getElementById('checkinTrendChart');
        if (!ctx) return;

        // 銷毀現有圖表
        if (trendChart) {
            trendChart.destroy();
        }

        // 創建新圖表
        trendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartData.labels,
                datasets: [{
                    label: '簽到數',
                    data: chartData.checkins,
                    borderColor: '#B8860B',
                    backgroundColor: 'rgba(184, 134, 11, 0.1)',
                    tension: 0.4,
                    fill: true
                }, {
                    label: '異常數',
                    data: chartData.anomalies,
                    borderColor: '#DC3545',
                    backgroundColor: 'rgba(220, 53, 69, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('初始化圖表失敗:', error);
    }
}

/**
 * 生成模擬趨勢數據（當 API 未提供時）
 */
function generateMockTrendData(days) {
    const labels = [];
    const checkins = [];
    const anomalies = [];

    for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        labels.push(`${date.getMonth() + 1}/${date.getDate()}`);
        checkins.push(Math.floor(Math.random() * 20) + 5);
        anomalies.push(Math.floor(Math.random() * 3));
    }

    return { labels, checkins, anomalies };
}

/**
 * 設置事件監聽器
 */
function setupEventListeners() {
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            showMessage('正在重新整理...', 'info');
            await loadDashboardData();
            showMessage('資料已更新', 'success');
        });
    }

    // 圖表週期切換
    const chart7Days = document.getElementById('chart7Days');
    const chart30Days = document.getElementById('chart30Days');

    if (chart7Days) {
        chart7Days.addEventListener('click', async () => {
            currentPeriod = 7;
            chart7Days.classList.add('btn-primary');
            chart30Days.classList.remove('btn-primary');
            await initTrendChart(7);
        });
    }

    if (chart30Days) {
        chart30Days.addEventListener('click', async () => {
            currentPeriod = 30;
            chart30Days.classList.add('btn-primary');
            chart7Days.classList.remove('btn-primary');
            await initTrendChart(30);
        });
    }

    // 自動刷新（每30秒）
    setInterval(async () => {
        await loadDashboardData();
    }, 30000);
}
