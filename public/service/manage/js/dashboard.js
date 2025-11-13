import { platformAuth } from '/js/firebase-init.js';
import { logout } from '/js/auth.js';

let currentUser = null;
let allOrders = [];

const API_BASE = 'https://asia-east2-service-b9d4a.cloudfunctions.net';

async function callAPI(endpoint, data = {}) {
    const idToken = await platformAuth.currentUser.getIdToken();
    const response = await fetch(`${API_BASE}/${endpoint}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ data })
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || '請求失敗');
    }
    
    return response.json();
}

export async function init() {
    try {
        currentUser = platformAuth.currentUser;
        
        if (!currentUser) {
            console.error('無法取得用戶資訊');
            window.location.href = '/';
            return;
        }
        
        const mainApp = document.getElementById('mainApp');
        if (mainApp) {
            mainApp.style.display = 'block';
        }
        
        document.getElementById('logoutBtn').addEventListener('click', logout);
        
        await loadStats();
    } catch (error) {
        console.error('初始化失敗:', error);
        alert('載入資料失敗，請重新整理頁面');
    }
}

async function loadStats() {
    try {
        const result = await callAPI('getRegistrations');
        allOrders = result.result.registrations || [];
        
        const totalOrders = allOrders.length;
        const pendingOrders = allOrders.filter(o => o.status === 'pending_manual_payment').length;
        const paidOrders = allOrders.filter(o => o.status === 'paid_offline').length;
        const totalAmount = allOrders
            .filter(o => o.status === 'paid_offline')
            .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
        
        document.getElementById('totalOrders').textContent = totalOrders;
        document.getElementById('pendingOrders').textContent = pendingOrders;
        document.getElementById('paidOrders').textContent = paidOrders;
        document.getElementById('totalAmount').textContent = `NT$ ${totalAmount.toLocaleString()}`;
        
        renderServiceStats();
        
    } catch (error) {
        console.error('載入統計失敗:', error);
        document.getElementById('serviceStats').innerHTML = '<p class="error">載入失敗，請重新整理頁面</p>';
    }
}

function renderServiceStats() {
    const statsContainer = document.getElementById('serviceStats');
    
    const serviceTypes = {
        'dd': '龜馬山一點靈',
        'nd': '年斗法會',
        'ld': '禮斗法會',
        'zy': '中元法會',
        'ps': '普施法會',
        'qj': '秋祭法會',
        'bg': '建宮廟款',
        'xy': '添香油',
        'ftp': '福田_信眾個人',
        'ftc': '福田_企業團體',
        'fty': '福田_Youth 會'
    };
    
    const stats = {};
    allOrders.forEach(order => {
        const type = order.serviceType || 'unknown';
        if (!stats[type]) {
            stats[type] = { count: 0, amount: 0 };
        }
        stats[type].count++;
        if (order.status === 'paid_offline') {
            stats[type].amount += (order.totalAmount || 0);
        }
    });
    
    let html = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem;">
    `;
    
    Object.entries(stats).forEach(([type, data]) => {
        const typeName = serviceTypes[type] || type;
        html += `
            <div style="background: #f5f5f5; padding: 1rem; border-radius: 8px; border-left: 4px solid #8A2BE2;">
                <div style="font-size: 1.5rem; font-weight: bold; color: #333; margin-bottom: 0.5rem;">${data.count}</div>
                <div style="color: #666; font-size: 0.9rem; margin-bottom: 0.5rem;">${typeName}</div>
                <div style="color: #8A2BE2; font-weight: 500;">NT$ ${data.amount.toLocaleString()}</div>
            </div>
        `;
    });
    
    html += `</div>`;
    
    if (Object.keys(stats).length === 0) {
        html = '<p class="no-data">暫無報名資料</p>';
    }
    
    statsContainer.innerHTML = html;
}
