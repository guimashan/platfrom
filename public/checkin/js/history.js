/**
 * 簽到紀錄頁面
 */

import { platformAuth, API_ENDPOINTS } from '/js/firebase-init.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { logout } from '/js/auth.js';

let currentUser = null;

// 監聽認證狀態
onAuthStateChanged(platformAuth, async (user) => {
    if (!user) {
        window.location.href = '/';
        return;
    }
    currentUser = user;
    
    // 認證成功：顯示主要內容
    const mainApp = document.getElementById('mainApp');
    if (mainApp) {
        mainApp.style.display = 'block';
    }
    
    await loadHistory();
});

// 載入簽到紀錄
async function loadHistory() {
    const historyList = document.getElementById('historyList');
    
    try {
        historyList.innerHTML = '<p>載入中...</p>';
        
        // 手動調用 API（支援跨專案認證）
        const idToken = await platformAuth.currentUser.getIdToken();
        const response = await fetch(API_ENDPOINTS.getCheckinHistory, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify({ limit: 50 })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error?.message || '載入失敗');
        }
        
        const checkins = data.result?.checkins || [];
        
        if (checkins.length === 0) {
            historyList.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; color: #999;">
                    <div style="font-size: 64px; margin-bottom: 20px;">📋</div>
                    <div>尚無簽到紀錄</div>
                </div>
            `;
            return;
        }
        
        let html = `
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr>
                        <th style="padding: 15px; text-align: left;">簽到時間</th>
                        <th style="padding: 15px; text-align: left;">巡邏點名稱</th>
                        <th style="padding: 15px; text-align: left;">簽到方式</th>
                        <th style="padding: 15px; text-align: left;">距離</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        checkins.forEach(checkin => {
            const timestamp = checkin.timestamp?.toDate ? checkin.timestamp.toDate() : new Date(checkin.timestamp?._seconds * 1000 || Date.now());
            const distance = checkin.distance ? checkin.distance.toFixed(1) : 'N/A';
            const mode = checkin.mode === 'qr' ? '📱 QR Code' : '📍 GPS 定位';
            
            html += `
                <tr>
                    <td style="padding: 12px 15px; border-bottom: 1px solid #f0f0f0;">${formatDateTime(timestamp)}</td>
                    <td style="padding: 12px 15px; border-bottom: 1px solid #f0f0f0;"><strong>${checkin.patrolName || checkin.patrolId}</strong></td>
                    <td style="padding: 12px 15px; border-bottom: 1px solid #f0f0f0;">${mode}</td>
                    <td style="padding: 12px 15px; border-bottom: 1px solid #f0f0f0;">${distance} 公尺</td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';
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
