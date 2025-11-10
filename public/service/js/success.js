// 不再需要 Firebase 實例，改用公開 API

const SERVICE_NAMES = {
    dd: '線上點燈',
    nd: '年斗法會',
    ld: '禮斗法會',
    qj: '秋祭法會',
    ps: '普施法會',
    bg: '建宮廟款',
    xy: '添香油',
    zy: '中元法會',
    ftp: '福田會 個人入會',
    fty: '福田少年會 個人入會',
    ftc: '福田會 企業團體入會'
};

const EVENT_SERVICES = ['nd', 'ld', 'qj', 'ps', 'zy'];

let orderData = null;
let serviceType = null;

function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        orderId: params.get('orderId'),
        service: params.get('service')
    };
}

async function loadOrderData() {
    const { orderId, service } = getUrlParams();
    
    if (!orderId || !service) {
        showError('缺少訂單資訊');
        return;
    }
    
    serviceType = service;
    
    try {
        const apiUrl = `https://asia-east2-service-b9d4a.cloudfunctions.net/getPublicOrderDetail?orderId=${encodeURIComponent(orderId)}&service=${encodeURIComponent(service)}`;
        
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
            if (response.status === 404) {
                showError('找不到訂單資料');
            } else {
                showError('載入訂單失敗，請稍後再試');
            }
            return;
        }
        
        const result = await response.json();
        
        if (!result.success || !result.order) {
            showError('訂單資料格式錯誤');
            return;
        }
        
        orderData = result.order;
        displayOrderInfo();
    } catch (error) {
        console.error('載入訂單失敗:', error);
        showError('載入訂單失敗，請稍後再試');
    }
}

function displayOrderInfo() {
    document.getElementById('loadingArea').style.display = 'none';
    document.getElementById('orderArea').style.display = 'block';
    
    document.getElementById('orderId').textContent = orderData.orderId;
    document.getElementById('serviceName').textContent = SERVICE_NAMES[serviceType] || serviceType.toUpperCase();
    document.getElementById('orderTime').textContent = formatTimestamp(orderData.timestamp);
    document.getElementById('totalAmount').textContent = orderData.totalAmount.toLocaleString();
    
    displayApplicants();
    
    if (EVENT_SERVICES.includes(serviceType)) {
        document.getElementById('calendarBtn').style.display = 'flex';
    }
}

function displayApplicants() {
    if (!orderData.applicants || orderData.applicants.length === 0) {
        return;
    }
    
    const listHtml = `
        <div class="applicant-list">
            <div class="applicant-list-title">報名人數：${orderData.applicants.length} 位</div>
            ${orderData.applicants.map(app => {
                const name = app.applicantName || app.name || '（未填寫姓名）';
                let itemsHtml = '';
                
                // 顯示捐獻項目明細（添香油）
                if (app.donationItems) {
                    const items = [];
                    if (app.donationItems.jingzhi > 0) {
                        items.push(`<div class="item-detail">［金紙］$100 / ${app.donationItems.jingzhi}份</div>`);
                    }
                    if (app.donationItems.suixi > 0) {
                        items.push(`<div class="item-detail">［隨喜功德］NT$ ${app.donationItems.suixi.toLocaleString()}</div>`);
                    }
                    itemsHtml = items.join('');
                }
                // 顯示法會類別和金額（點燈、法會等）
                else if (app.category || app.amount) {
                    const category = app.category || '';
                    const amount = app.amount ? `NT$ ${app.amount.toLocaleString()}` : '';
                    if (category && amount) {
                        itemsHtml = `<div class="item-detail">［${category}］${amount}</div>`;
                    } else if (amount) {
                        itemsHtml = `<div class="item-detail">${amount}</div>`;
                    }
                }
                
                return `
                    <div class="applicant-item">
                        <div class="applicant-name">• ${name}</div>
                        ${itemsHtml}
                    </div>
                `;
            }).join('')}
        </div>
    `;
    
    document.getElementById('applicantListArea').innerHTML = listHtml;
}

function formatTimestamp(timestamp) {
    if (!timestamp) return '---';
    
    let date;
    if (timestamp._seconds) {
        date = new Date(timestamp._seconds * 1000);
    } else if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
    } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
        date = new Date(timestamp);
    } else {
        return '---';
    }
    
    if (isNaN(date.getTime())) return '---';
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}/${month}/${day} ${hours}:${minutes}`;
}

function showError(message) {
    document.getElementById('loadingArea').style.display = 'none';
    document.getElementById('errorArea').textContent = message;
    document.getElementById('errorArea').style.display = 'block';
}

function handlePrint() {
    window.print();
}

function handleShare() {
    const shareUrl = window.location.href;
    
    if (navigator.clipboard) {
        navigator.clipboard.writeText(shareUrl).then(() => {
            alert('訂單連結已複製到剪貼簿！');
        }).catch(() => {
            prompt('請複製以下連結：', shareUrl);
        });
    } else {
        prompt('請複製以下連結：', shareUrl);
    }
}

function handleCalendar() {
    if (!orderData) return;
    
    const eventDates = {
        nd: { year: 2025, month: 2, day: 15, name: '年斗法會' },
        ld: { year: 2025, month: 3, day: 20, name: '禮斗法會' },
        qj: { year: 2025, month: 9, day: 15, name: '秋祭法會' },
        ps: { year: 2025, month: 7, day: 30, name: '普施法會' },
        zy: { year: 2025, month: 8, day: 15, name: '中元法會' }
    };
    
    const eventInfo = eventDates[serviceType];
    if (!eventInfo) return;
    
    const startDate = new Date(eventInfo.year, eventInfo.month - 1, eventInfo.day, 9, 0);
    const endDate = new Date(eventInfo.year, eventInfo.month - 1, eventInfo.day, 17, 0);
    
    const formatICSDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}${month}${day}T${hours}${minutes}00`;
    };
    
    const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//龜馬山代天府//NONSGML Event//EN',
        'BEGIN:VEVENT',
        `DTSTART:${formatICSDate(startDate)}`,
        `DTEND:${formatICSDate(endDate)}`,
        `SUMMARY:${eventInfo.name} - 龜馬山代天府`,
        `DESCRIPTION:訂單編號：${orderData.orderId}`,
        'LOCATION:龜馬山代天府',
        'END:VEVENT',
        'END:VCALENDAR'
    ].join('\r\n');
    
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `龜馬山_${eventInfo.name}_${orderData.orderId}.ics`;
    link.click();
}

function handleClose() {
    window.location.href = 'https://go.guimashan.org.tw/service/index.html';
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('printBtn').addEventListener('click', handlePrint);
    document.getElementById('shareBtn').addEventListener('click', handleShare);
    document.getElementById('calendarBtn').addEventListener('click', handleCalendar);
    document.getElementById('liffCloseBtn').addEventListener('click', handleClose);
    
    loadOrderData();
});
