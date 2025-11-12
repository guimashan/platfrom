import { platformAuth } from '/js/firebase-init.js';
import { logout } from '/js/auth.js';
import { callAPI } from '/js/api-helper.js';

let currentUser = null;
let userOrders = [];

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
        
        await loadUserOrders();
        
    } catch (error) {
        console.error('初始化失敗:', error);
        const ordersList = document.getElementById('ordersList');
        ordersList.innerHTML = '<p class="error" style="text-align: center; color: #dc3545; padding: 2rem;">載入失敗，請重新整理頁面</p>';
    }
}

async function loadUserOrders() {
    const ordersList = document.getElementById('ordersList');
    
    try {
        ordersList.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">載入中...</p>';
        
        const result = await callAPI('getUserRegistrations');
        userOrders = result.result.registrations || [];
        
        console.log(`載入了 ${userOrders.length} 筆報名記錄`);
        renderOrders();
        
    } catch (error) {
        console.error('載入報名記錄失敗:', error);
        ordersList.innerHTML = '<p class="error" style="text-align: center; color: #dc3545; padding: 2rem;">載入失敗：' + error.message + '</p>';
    }
}

function renderOrders() {
    const ordersList = document.getElementById('ordersList');
    
    if (userOrders.length === 0) {
        ordersList.innerHTML = `
            <div class="no-orders">
                <div class="no-orders-icon">📋</div>
                <h3>尚無報名記錄</h3>
                <p>您還沒有報名任何法會或服務</p>
                <button onclick="window.location.href='/service/service.html'" class="btn btn-primary" style="margin-top: 1rem;">前往報名</button>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    userOrders.forEach(order => {
        const serviceName = getServiceTypeName(order.serviceType);
        const statusBadge = getStatusBadge(order.status);
        const date = formatDate(order.createdAt);
        const amount = order.totalAmount || 0;
        
        html += `
            <div class="order-card">
                <div class="order-header">
                    <div>
                        <div class="order-title">${serviceName}</div>
                        <div class="order-id">訂單編號：${order.orderId}</div>
                    </div>
                    ${statusBadge}
                </div>
                <div class="order-body">
                    <div class="order-row">
                        <span class="order-label">報名日期</span>
                        <span class="order-value">${date}</span>
                    </div>
                    <div class="order-row">
                        <span class="order-label">聯絡人</span>
                        <span class="order-value">${order.contactInfo?.name || '-'}</span>
                    </div>
                    <div class="order-row">
                        <span class="order-label">聯絡電話</span>
                        <span class="order-value">${order.contactInfo?.phone || '-'}</span>
                    </div>
                    <div class="order-row">
                        <span class="order-label">報名金額</span>
                        <span class="order-amount">NT$ ${amount.toLocaleString()}</span>
                    </div>
                </div>
            </div>
        `;
    });
    
    ordersList.innerHTML = html;
}

function getServiceTypeName(serviceType) {
    const names = {
        'light': '線上點燈',
        'douType': '斗燈服務',
        'business': '安神明供奉',
        'dd': '線上點燈',
        'nd': '年斗法會',
        'ld': '禮斗法會',
        'qj': '秋祭法會',
        'ps': '普施法會',
        'bg': '建宮廟款',
        'xy': '添香油',
        'zy': '中元法會',
        'ftp': '福田會 個人入會',
        'fty': '福田少年會 個人入會',
        'ftc': '福田會 企業團體入會'
    };
    return names[serviceType] || serviceType;
}

function getStatusBadge(status) {
    const statusMap = {
        'pending_manual_payment': { text: '待付款', class: 'status-pending' },
        'paid_offline': { text: '已付款', class: 'status-paid' },
        'cancelled': { text: '已取消', class: 'status-cancelled' }
    };
    
    const statusInfo = statusMap[status] || { text: status, class: 'status-pending' };
    return `<span class="status-badge ${statusInfo.class}">${statusInfo.text}</span>`;
}

function formatDate(timestamp) {
    if (!timestamp) return '-';
    
    let date;
    if (timestamp.seconds) {
        date = new Date(timestamp.seconds * 1000);
    } else if (timestamp._seconds) {
        date = new Date(timestamp._seconds * 1000);
    } else {
        date = new Date(timestamp);
    }
    
    return date.toLocaleString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}
