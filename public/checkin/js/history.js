/**
 * 簽到紀錄頁面
 */

import { platformAuth, checkinDb } from '/js/firebase-init.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { 
    collection, 
    query, 
    where,
    orderBy,
    limit,
    getDocs
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { logout } from '/js/auth.js';

let currentUser = null;

// 監聽認證狀態
onAuthStateChanged(platformAuth, async (user) => {
    if (!user) {
        window.location.href = '/';
        return;
    }
    currentUser = user;
    await loadHistory();
});

// 載入簽到紀錄
async function loadHistory() {
    const historyList = document.getElementById('historyList');
    
    try {
        historyList.innerHTML = '<p>載入中...</p>';
        
        const checkinsRef = collection(checkinDb, 'checkins');
        const q = query(
            checkinsRef,
            where('userId', '==', currentUser.uid),
            orderBy('timestamp', 'desc'),
            limit(50)
        );
        
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            historyList.innerHTML = '<p class="no-data">尚無簽到紀錄</p>';
            return;
        }
        
        let html = '<div class="history-table"><table><thead><tr><th>時間</th><th>巡邏點</th><th>距離</th></tr></thead><tbody>';
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const timestamp = data.timestamp?.toDate() || new Date();
            const distance = data.distance?.toFixed(1) || 'N/A';
            
            html += `
                <tr>
                    <td>${formatDateTime(timestamp)}</td>
                    <td>${data.patrolId}</td>
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
