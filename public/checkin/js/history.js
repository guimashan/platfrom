/**
 * 簽到紀錄頁面
 */

import { platformAuth, API_ENDPOINTS } from '/js/firebase-init.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { logout } from '/js/auth.js';
import { callAPI } from '/js/api-helper.js';

let currentUser = null;

// 監聽認證狀態
onAuthStateChanged(platformAuth, async (user) => {
    if (!user) {
        window.location.href = '/';
        return;
    }
    currentUser = user;
    
    // 認證成功：隱藏登入提示，顯示主要內容
    document.getElementById('loginPrompt').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
    
    await loadHistory();
});

// 載入簽到紀錄
async function loadHistory() {
    const historyList = document.getElementById('historyList');
    
    try {
        historyList.innerHTML = '<p>載入中...</p>';
        
        const result = await callAPI(API_ENDPOINTS.getCheckinHistory + '?limit=50', {
            method: 'GET'
        });
        
        const checkins = result.checkins || [];
        
        if (checkins.length === 0) {
            historyList.innerHTML = '<p class="no-data">尚無簽到紀錄</p>';
            return;
        }
        
        let html = '<div class="history-table"><table><thead><tr><th>時間</th><th>巡邏點</th><th>模式</th><th>距離</th></tr></thead><tbody>';
        
        checkins.forEach(checkin => {
            const timestamp = checkin.timestamp?.toDate ? checkin.timestamp.toDate() : new Date(checkin.timestamp?._seconds * 1000 || Date.now());
            const distance = checkin.distance ? checkin.distance.toFixed(1) : 'N/A';
            const mode = checkin.mode === 'qr' ? 'QR' : 'GPS';
            
            html += `
                <tr>
                    <td>${formatDateTime(timestamp)}</td>
                    <td>${checkin.patrolName || checkin.patrolId}</td>
                    <td>${mode}</td>
                    <td>${distance} m</td>
                </tr>
            `;
        });
        
        html += '</tbody></table></div>';
        historyList.innerHTML = html;
        
    } catch (error) {
        console.error('載入紀錄失敗:', error);
        historyList.innerHTML = '<p class="error">載入失敗,請重新整理頁面</p>';
    }
}

// 格式化日期時間
function formatDateTime(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}`;
}

// 綁定事件
document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
});
