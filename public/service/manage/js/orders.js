import { checkAuth, logout } from '/js/auth-guard.js';
import { platformAuth } from '/js/firebase-init.js';

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

/**
 * 將國曆日期轉換為農曆日期
 * @param {string} gregorianDate - 國曆日期 (YYYY-MM-DD 格式)
 * @returns {string} 農曆日期字串
 */
function convertToLunar(gregorianDate) {
    if (!gregorianDate) return '';
    
    try {
        // 解析國曆日期
        const [year, month, day] = gregorianDate.split('-').map(Number);
        
        // 使用 lunar-javascript 庫進行轉換
        const solar = Solar.fromYmd(year, month, day);
        const lunar = solar.getLunar();
        
        // 格式化農曆日期
        const lunarMonth = lunar.getMonth();
        const lunarDay = lunar.getDay();
        const isLeapMonth = lunar.isLeap();
        
        // 取得天干地支紀年
        const yearInGanZhi = lunar.getYearInGanZhi(); // 例如：甲辰
        
        // 月份名稱
        const monthNames = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '臘'];
        const monthName = monthNames[lunarMonth - 1] || lunarMonth;
        
        // 日期名稱
        const dayNames = ['初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
                          '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
                          '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'];
        const dayName = dayNames[lunarDay - 1] || lunarDay;
        
        // 組合農曆日期字串（使用天干地支紀年）
        const leapPrefix = isLeapMonth ? '閏' : '';
        return `${yearInGanZhi}年 ${leapPrefix}${monthName}月${dayName}`;
        
    } catch (error) {
        console.error('農曆轉換失敗:', error);
        return '';
    }
}

(async function init() {
    try {
        const { user } = await checkAuth({
            requiredRoles: ['poweruser_service', 'admin_service', 'superadmin']
        });
        
        currentUser = user;
        
        // 認證成功：隱藏登入提示，顯示主要內容
        document.getElementById('loginPrompt').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
        
        document.getElementById('logoutBtn').addEventListener('click', logout);
        
        document.getElementById('filterServiceType').addEventListener('change', applyFilters);
        document.getElementById('filterStatus').addEventListener('change', applyFilters);
        document.getElementById('filterSearch').addEventListener('input', applyFilters);
        
        await loadOrders();
        
    } catch (error) {
        console.error('初始化失敗:', error);
        alert('權限不足或載入失敗: ' + error.message);
        window.location.href = '/';
    }
})();

async function loadOrders() {
    try {
        const result = await callAPI('getRegistrationsV2');
        allOrders = result.result.registrations || [];
        
        console.log('載入訂單:', allOrders.length, '筆');
        applyFilters();
        
    } catch (error) {
        console.error('載入訂單失敗:', error);
        showEmptyState('載入失敗: ' + error.message);
    }
}

function applyFilters() {
    const serviceType = document.getElementById('filterServiceType').value;
    const status = document.getElementById('filterStatus').value;
    const search = document.getElementById('filterSearch').value.toLowerCase();
    
    let filtered = allOrders;
    
    if (serviceType) {
        filtered = filtered.filter(o => o.serviceType === serviceType);
    }
    
    if (status) {
        filtered = filtered.filter(o => o.status === status);
    }
    
    if (search) {
        filtered = filtered.filter(o => {
            const searchText = `${o.orderId} ${o.contactInfo?.name || ''} ${o.contactInfo?.phone || ''}`.toLowerCase();
            return searchText.includes(search);
        });
    }
    
    renderOrders(filtered);
}

function renderOrders(orders) {
    const tbody = document.getElementById('ordersTableBody');
    
    if (orders.length === 0) {
        showEmptyState('目前沒有符合條件的訂單');
        return;
    }
    
    tbody.innerHTML = orders.map(order => `
        <tr>
            <td><code>${order.orderId.substring(0, 8)}...</code></td>
            <td>${getServiceTypeName(order.serviceType)}</td>
            <td>${order.contactInfo?.name || '-'}</td>
            <td>${order.contactInfo?.phone || '-'}</td>
            <td><strong>NT$ ${order.totalAmount?.toLocaleString() || 0}</strong></td>
            <td><span class="status-badge status-${getStatusClass(order.status)}">${getStatusName(order.status)}</span></td>
            <td>${formatDate(order.createdAt)}</td>
            <td>
                <button class="btn-view" onclick="viewOrder('${order.orderId}')">查看</button>
            </td>
        </tr>
    `).join('');
}

function showEmptyState(message) {
    const tbody = document.getElementById('ordersTableBody');
    tbody.innerHTML = `
        <tr>
            <td colspan="8" class="empty-state">
                <div class="empty-state-icon">📋</div>
                <div>${message}</div>
            </td>
        </tr>
    `;
}

window.viewOrder = async function(orderId) {
    try {
        const modal = document.getElementById('orderModal');
        const modalBody = document.getElementById('modalBody');
        
        modalBody.innerHTML = '<div style="text-align:center; padding:40px;">載入中...</div>';
        modal.style.display = 'block';
        
        const result = await callAPI('getRegistrationDetailV2', { orderId });
        const order = result.result.registration;
        const paymentSecret = result.result.paymentSecret;
        
        renderOrderDetail(order, paymentSecret);
        
    } catch (error) {
        console.error('載入訂單詳情失敗:', error);
        alert('載入失敗: ' + error.message);
        closeOrderModal();
    }
};

function renderOrderDetail(order, paymentSecret) {
    const modalBody = document.getElementById('modalBody');
    
    // 判斷是點燈服務還是年斗服務
    const isNiandou = order.serviceType === 'niandou';
    const sectionTitle = isNiandou ? '🎯 報名者名單' : '🕯️ 點燈名單';
    const personLabel = isNiandou ? '報名者' : '點燈人';
    
    const applicantsList = order.applicants?.map((a, index) => {
        // 處理 bazi (可能是字串或物件)
        let baziHtml = '';
        if (a.bazi) {
            if (typeof a.bazi === 'object') {
                // 年斗法會的 bazi 物件 - 使用表格式排版
                const lunarDate = a.bazi.birthDate ? convertToLunar(a.bazi.birthDate) : '';
                baziHtml = `
                    <div style="background: #f9f9f9; padding: 10px; border-radius: 6px; margin: 8px 0;">
                        <div style="display: grid; grid-template-columns: auto 1fr; gap: 8px; font-size: 0.9rem;">
                            ${a.bazi.gender ? `<div style="color: #666;">性別：</div><div><strong>${a.bazi.gender}</strong></div>` : ''}
                            ${a.bazi.birthDate ? `
                                <div style="color: #666;">生辰：</div>
                                <div>
                                    <div><strong>國曆：${a.bazi.birthDate}</strong></div>
                                    ${lunarDate ? `<div style="color: #8A2BE2; margin-top: 2px;"><strong>農曆：${lunarDate}</strong></div>` : ''}
                                </div>
                            ` : ''}
                            ${a.bazi.shengxiao ? `<div style="color: #666;">生肖：</div><div><strong>${a.bazi.shengxiao}</strong></div>` : ''}
                            ${a.bazi.time ? `<div style="color: #666;">時辰：</div><div><strong>${a.bazi.time}</strong></div>` : ''}
                        </div>
                    </div>
                `;
            } else {
                // 點燈服務的 bazi 字串（舊格式，僅國曆）
                const lunarDate = convertToLunar(a.bazi);
                baziHtml = `
                    <div style="margin: 8px 0;">
                        <div><span style="color: #666;">生辰：</span><strong>國曆 ${a.bazi}</strong></div>
                        ${lunarDate ? `<div style="margin-top: 4px;"><span style="color: #666;"></span><strong style="color: #8A2BE2;">農曆 ${lunarDate}</strong></div>` : ''}
                    </div>
                `;
            }
        }
        
        // 處理點燈資訊
        let serviceHtml = '';
        if (a.lights) {
            const lightsHtml = Object.entries(a.lights)
                .filter(([name, count]) => count > 0)
                .map(([name, count]) => `<div style="padding: 4px 0;">• ${name} <strong>x ${count}</strong></div>`)
                .join('') || '<div>無</div>';
            serviceHtml = `
                <div style="margin-top: 8px;">
                    <div style="color: #666; margin-bottom: 4px;">點燈項目：</div>
                    <div style="padding-left: 10px;">${lightsHtml}</div>
                </div>
            `;
        }
        
        // 處理年斗資訊
        if (a.douTypes) {
            const dousHtml = Object.entries(a.douTypes)
                .filter(([name, selected]) => selected === true)
                .map(([name]) => `<div style="padding: 4px 0;">• ${name}</div>`)
                .join('') || '<div>無</div>';
            serviceHtml = `
                <div style="margin-top: 8px;">
                    <div style="color: #666; margin-bottom: 4px;">年斗項目：</div>
                    <div style="padding-left: 10px;">${dousHtml}</div>
                </div>
            `;
        }
        
        // 處理事業年斗資訊
        let businessHtml = '';
        if (a.businessInfo && (a.businessInfo.title || a.businessInfo.address)) {
            businessHtml = `
                <div style="background: #fff3cd; padding: 8px; border-radius: 4px; margin-top: 8px; border-left: 3px solid #ffc107;">
                    <div style="font-size: 0.85rem; color: #856404;">
                        <div><strong>📍 事業年斗資訊</strong></div>
                        ${a.businessInfo.title ? `<div style="margin-top: 4px;">抬頭：${a.businessInfo.title}</div>` : ''}
                        ${a.businessInfo.address ? `<div>地址：${a.businessInfo.address}</div>` : ''}
                    </div>
                </div>
            `;
        }
        
        return `
            <div class="detail-row">
                <div class="detail-label">${personLabel} ${index + 1}</div>
                <div class="detail-value">
                    <div style="font-size: 1.1rem; color: var(--primary-gold-dark); margin-bottom: 8px;">
                        <strong>${a.applicantName || '未填寫'}</strong>
                    </div>
                    ${baziHtml}
                    ${serviceHtml}
                    ${businessHtml}
                </div>
            </div>
        `;
    }).join('') || `<div class="detail-row"><div class="detail-value">無${personLabel}資料</div></div>`;
    
    let paymentInfoHtml = '';
    if (paymentSecret && order.status === 'pending_manual_payment') {
        const pi = paymentSecret.paymentInfo || {};
        paymentInfoHtml = `
            <div class="detail-section">
                <div class="payment-warning">
                    <div class="payment-warning-title">
                        ⚠️ 機密資訊 - 僅限授權人員查看
                    </div>
                    <p style="margin:5px 0; color:#856404;">請於刷卡後立即點擊「確認收款」以刪除此機密資訊</p>
                </div>
                <h3>💳 信用卡資訊</h3>
                <div class="card-info">
                    <div class="card-info-row">
                        <div class="detail-label">持卡人姓名</div>
                        <div class="detail-value">${pi.cardHolderName || '-'}</div>
                    </div>
                    <div class="card-info-row">
                        <div class="detail-label">信用卡卡號</div>
                        <div class="detail-value"><code>${pi.cardNumber || '-'}</code></div>
                    </div>
                    <div class="card-info-row">
                        <div class="detail-label">有效期限</div>
                        <div class="detail-value">${pi.cardExpiry || '-'}</div>
                    </div>
                    <div class="card-info-row">
                        <div class="detail-label">安全碼 (CVV)</div>
                        <div class="detail-value"><code>${pi.cardCVV || '-'}</code></div>
                    </div>
                </div>
            </div>
        `;
    }
    
    modalBody.innerHTML = `
        <div class="detail-section">
            <h3>📋 訂單資訊</h3>
            <div class="detail-row">
                <div class="detail-label">訂單編號</div>
                <div class="detail-value"><code>${order.orderId}</code></div>
            </div>
            <div class="detail-row">
                <div class="detail-label">服務類型</div>
                <div class="detail-value">${getServiceTypeName(order.serviceType)}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">訂單狀態</div>
                <div class="detail-value"><span class="status-badge status-${getStatusClass(order.status)}">${getStatusName(order.status)}</span></div>
            </div>
            <div class="detail-row">
                <div class="detail-label">應繳金額</div>
                <div class="detail-value"><strong style="color:var(--primary-gold); font-size:18px;">NT$ ${order.totalAmount?.toLocaleString() || 0}</strong></div>
            </div>
            <div class="detail-row">
                <div class="detail-label">建立時間</div>
                <div class="detail-value">${formatDate(order.createdAt)}</div>
            </div>
        </div>
        
        <div class="detail-section">
            <h3>📞 聯絡資訊</h3>
            <div class="detail-row">
                <div class="detail-label">報名姓名</div>
                <div class="detail-value">${order.contactInfo?.name || '-'}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">連絡電話</div>
                <div class="detail-value">${order.contactInfo?.phone || '-'}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">電子信箱</div>
                <div class="detail-value">${order.contactInfo?.email || '-'}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">通訊地址</div>
                <div class="detail-value">${order.contactInfo?.address || '-'}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">感謝狀領取</div>
                <div class="detail-value">${order.contactInfo?.receiptOption === 'send' ? '寄發感謝狀' : '親自領取'}</div>
            </div>
        </div>
        
        <div class="detail-section">
            <h3>${sectionTitle}</h3>
            ${applicantsList}
        </div>
        
        ${paymentInfoHtml}
        
        ${order.otherNote ? `
        <div class="detail-section">
            <h3>📝 其他備註</h3>
            <div class="detail-value">${order.otherNote}</div>
        </div>
        ` : ''}
        
        <div class="modal-footer">
            <button class="btn-cancel" onclick="closeOrderModal()">關閉</button>
            ${order.status === 'pending_manual_payment' ? 
                `<button class="btn-confirm" onclick="confirmOrderPayment('${order.orderId}')">✓ 確認收款</button>` : 
                ''}
        </div>
    `;
}

window.confirmOrderPayment = async function(orderId) {
    if (!confirm('確認已完成刷卡並收款？\n\n點擊「確定」後，訂單狀態將更新為「已付款」，且信用卡機密資訊將永久刪除。')) {
        return;
    }
    
    try {
        await callAPI('confirmPaymentV2', { orderId });
        
        alert('收款確認成功！信用卡資訊已刪除。');
        
        closeOrderModal();
        await loadOrders();
        
    } catch (error) {
        console.error('確認收款失敗:', error);
        alert('操作失敗: ' + error.message);
    }
};

window.closeOrderModal = function() {
    document.getElementById('orderModal').style.display = 'none';
};

window.onclick = function(event) {
    const modal = document.getElementById('orderModal');
    if (event.target === modal) {
        closeOrderModal();
    }
};

function getServiceTypeName(type) {
    const names = {
        'lightup': '線上點燈',
        'niandou': '年斗法會',
        'zhongyuan': '中元普渡'
    };
    return names[type] || type;
}

function getStatusName(status) {
    const names = {
        'pending_manual_payment': '待付款',
        'paid_offline': '已付款',
        'cancelled': '已取消'
    };
    return names[status] || status;
}

function getStatusClass(status) {
    if (status === 'pending_manual_payment') return 'pending';
    if (status === 'paid_offline') return 'paid';
    if (status === 'cancelled') return 'cancelled';
    return 'pending';
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
