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

/**
 * 格式化國曆日期
 * @param {string} gregorianDate - 國曆日期 (YYYY-MM-DD 格式)
 * @returns {string} 格式化後的國曆日期 (YYYY年MM月DD日)
 */
function formatGregorianDate(gregorianDate) {
    if (!gregorianDate) return '';
    
    try {
        const [year, month, day] = gregorianDate.split('-');
        return `${year}年${month}月${day}日`;
    } catch (error) {
        return gregorianDate;
    }
}

/**
 * 將國曆日期轉換為農曆日期
 * @param {string} gregorianDate - 國曆日期 (YYYY-MM-DD 格式)
 * @returns {string} 農曆日期字串
 */
function convertToLunar(gregorianDate) {
    if (!gregorianDate) return '';
    
    try {
        // 檢查 lunar-javascript 庫是否已載入
        if (typeof window.Solar === 'undefined') {
            console.error('lunar-javascript 庫尚未載入');
            return '';
        }
        
        // 解析國曆日期
        const [year, month, day] = gregorianDate.split('-').map(Number);
        
        // 使用 lunar-javascript 庫進行轉換
        const solar = window.Solar.fromYmd(year, month, day);
        const lunar = solar.getLunar();
        
        // 直接使用內建的 toString 方法
        // 格式範例：「二零二四年十月初四」或「二零二零年閏四月初八」
        const fullLunarStr = lunar.toString();
        
        // 取得天干地支紀年（例如：甲辰、壬寅）
        const yearInGanZhi = lunar.getYearInGanZhi();
        
        // 從 toString 結果中提取月日部分
        // toString 格式：「二零二四年十月初四」
        // 我們要：「甲辰年 十月初四日」
        const parts = fullLunarStr.match(/年(.+)/);
        const monthDayPart = parts ? parts[1] : '';
        
        // 組合最終格式：天干地支紀年 + 月日 + 日
        return `${yearInGanZhi}年 ${monthDayPart}日`;
        
    } catch (error) {
        console.error('農曆轉換失敗:', error, '日期:', gregorianDate);
        return '';
    }
}

// 動態載入 lunar-javascript 庫（只在需要時才載入）
let lunarLibraryLoading = false;
let lunarLibraryLoaded = false;

function loadLunarLibrary() {
    return new Promise((resolve) => {
        // 如果已經載入完成，直接返回
        if (lunarLibraryLoaded && typeof window.Solar !== 'undefined') {
            resolve();
            return;
        }
        
        // 如果正在載入中，等待載入完成
        if (lunarLibraryLoading) {
            const checkInterval = setInterval(() => {
                if (lunarLibraryLoaded && typeof window.Solar !== 'undefined') {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
            return;
        }
        
        // 開始載入
        lunarLibraryLoading = true;
        console.log('動態載入農曆庫...');
        
        const script = document.createElement('script');
        script.src = '/lib/lunar.js';
        script.onload = () => {
            lunarLibraryLoaded = true;
            lunarLibraryLoading = false;
            console.log('農曆庫載入成功');
            resolve();
        };
        script.onerror = () => {
            lunarLibraryLoading = false;
            console.error('農曆庫載入失敗，請檢查 /lib/lunar.js 是否存在');
            resolve();
        };
        
        document.head.appendChild(script);
    });
}

export async function init() {
    try {
        currentUser = platformAuth.currentUser;
        
        if (!currentUser) {
            console.error('無法取得用戶資訊');
            window.location.href = '/';
            return;
        }
        
        // 隱藏登入提示，顯示主內容
        const loginPrompt = document.getElementById('loginPrompt');
        const mainApp = document.getElementById('mainApp');
        
        if (loginPrompt) {
            loginPrompt.style.display = 'none';
        }
        if (mainApp) {
            mainApp.style.display = 'block';
        }
        
        // 綁定登出按鈕
        document.getElementById('logoutBtn').addEventListener('click', logout);
        
        document.getElementById('filterServiceType').addEventListener('change', applyFilters);
        document.getElementById('filterStatus').addEventListener('change', applyFilters);
        document.getElementById('filterSearch').addEventListener('input', applyFilters);
        
        await loadOrders();
        
    } catch (error) {
        console.error('初始化失敗:', error);
        alert('載入失敗: ' + error.message);
    }
}

async function loadOrders() {
    try {
        const result = await callAPI('getRegistrations');
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
        
        // 動態載入農曆庫（第一次查看訂單時才載入）
        await loadLunarLibrary();
        
        const result = await callAPI('getRegistrationDetail', { orderId });
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
    const isNiandou = order.serviceType === 'nd';
    const sectionTitle = isNiandou ? '🎯 報名者名單' : '🕯️ 點燈名單';
    const personLabel = isNiandou ? '報名者' : '點燈人';
    
    const applicantsList = order.applicants?.map((a, index) => {
        // 處理 bazi (可能是字串或物件)
        let baziHtml = '';
        if (a.bazi) {
            if (typeof a.bazi === 'object') {
                // 物件格式（新資料）- 使用表格式排版
                const gregorianDate = a.bazi.birthDate ? formatGregorianDate(a.bazi.birthDate) : '';
                const lunarDate = a.bazi.birthDate ? convertToLunar(a.bazi.birthDate) : '';
                baziHtml = `
                    <div style="background: #f9f9f9; padding: 10px; border-radius: 6px; margin: 8px 0;">
                        <div style="display: grid; grid-template-columns: auto 1fr; gap: 8px; font-size: 0.9rem;">
                            ${a.bazi.gender ? `<div style="color: #666;">性別：</div><div><strong>${a.bazi.gender}</strong></div>` : ''}
                            ${a.bazi.birthDate ? `
                                <div style="color: #666;">生辰：</div>
                                <div>
                                    <div><strong>國曆：${gregorianDate}</strong></div>
                                    ${lunarDate ? `<div style="color: #8A2BE2; margin-top: 2px;"><strong>農曆：${lunarDate}</strong></div>` : ''}
                                </div>
                            ` : ''}
                            ${a.bazi.shengxiao ? `<div style="color: #666;">生肖：</div><div><strong>${a.bazi.shengxiao}</strong></div>` : ''}
                            ${a.bazi.time ? `<div style="color: #666;">時辰：</div><div><strong>${a.bazi.time}</strong></div>` : ''}
                        </div>
                    </div>
                `;
            } else {
                // 字串格式（舊資料）- 使用相同的表格式排版
                const gregorianDate = formatGregorianDate(a.bazi);
                const lunarDate = convertToLunar(a.bazi);
                baziHtml = `
                    <div style="background: #f9f9f9; padding: 10px; border-radius: 6px; margin: 8px 0;">
                        <div style="display: grid; grid-template-columns: auto 1fr; gap: 8px; font-size: 0.9rem;">
                            <div style="color: #666;">生辰：</div>
                            <div>
                                <div><strong>國曆：${gregorianDate}</strong></div>
                                ${lunarDate ? `<div style="color: #8A2BE2; margin-top: 2px;"><strong>農曆：${lunarDate}</strong></div>` : ''}
                            </div>
                        </div>
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
        await callAPI('confirmPayment', { orderId });
        
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
        'dd': '線上點燈',
        'nd': '年斗法會',
        'ld': '禮斗法會',
        'qj': '秋祭法會',
        'ps': '普施法會',
        'bg': '建宮廟款',
        'xy': '添香油',
        'zy': '中元法會',
        'ftp': '福田會 信眾個人入會',
        'fty': '福田會 福田 Young會',
        'ftc': '福田會 企業團體入會'
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
