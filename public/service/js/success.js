import { 
    serviceApp,
    platformAuth,
    serviceDb 
} from '../../js/firebase-init.js';

import { 
    collection, 
    query, 
    where, 
    getDocs 
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const auth = platformAuth;
const db = serviceDb;

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
let isLiffEnv = false;

async function initLiff() {
    try {
        const liffId = '2006582260-YBnDz9Xk';
        await liff.init({ liffId });
        
        isLiffEnv = liff.isInClient();
        
        if (isLiffEnv) {
            document.getElementById('liffCloseBtn').style.display = 'flex';
        } else {
            document.getElementById('closeBtn').style.display = 'block';
        }
        
        if (!liff.isLoggedIn()) {
            liff.login();
            return;
        }
        
        loadOrderData();
    } catch (error) {
        console.error('LIFF 初始化失敗:', error);
        loadOrderData();
    }
}

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
        const q = query(
            collection(db, 'registrations'),
            where('orderId', '==', orderId),
            where('serviceType', '==', service)
        );
        
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            showError('找不到訂單資料');
            return;
        }
        
        orderData = querySnapshot.docs[0].data();
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
                let detail = app.name;
                if (app.category) {
                    detail += ` (${app.category})`;
                } else if (app.amount) {
                    detail += ` - NT$ ${app.amount.toLocaleString()}`;
                }
                return `<div class="applicant-item">${detail}</div>`;
            }).join('')}
        </div>
    `;
    
    document.getElementById('applicantListArea').innerHTML = listHtml;
}

function formatTimestamp(timestamp) {
    if (!timestamp) return '---';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
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
    if (isLiffEnv) {
        liff.closeWindow();
    } else {
        window.location.href = 'https://go.guimashan.org.tw/service/index.html';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('printBtn').addEventListener('click', handlePrint);
    document.getElementById('shareBtn').addEventListener('click', handleShare);
    document.getElementById('calendarBtn').addEventListener('click', handleCalendar);
    document.getElementById('closeBtn').addEventListener('click', handleClose);
    document.getElementById('liffCloseBtn').addEventListener('click', handleClose);
    
    initLiff();
});
