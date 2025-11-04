// -----------------------------------------
// 龜馬山 goLine - 普施法會 (PS.js)
// -----------------------------------------

// --- 匯入需要的實例 ---
import { 
    serviceFunctions,
    platformAuth, 
    platformDb 
} from '../../js/firebase-init.js';

import { 
    doc,
    getDoc
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

import { 
    httpsCallable
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js';

// --- 全域變數 ---
const SERVICE_TYPE = "pushi";
let currentUser = null; 
let userData = null;

// --- DOM 元素 ---
const loginPromptEl = document.getElementById('loginPrompt');
const mainAppEl = document.getElementById('mainApp');
const loginBtnEl = document.getElementById('loginBtn');
const contactNameEl = document.getElementById('contactName');
const contactPhoneEl = document.getElementById('contactPhone');
const contactEmailEl = document.getElementById('contactEmail');
const contactAddressEl = document.getElementById('contactAddress');
const puzhuoEl = document.getElementById('puzhuo');
const riceEl = document.getElementById('rice');
const donationEl = document.getElementById('donation');
const cardHolderNameEl = document.getElementById('cardHolderName');
const cardNumberEl = document.getElementById('cardNumber');
const cardExpiryEl = document.getElementById('cardExpiry');
const cardCVVEl = document.getElementById('cardCVV');
const otherNoteEl = document.getElementById('otherNote');
const totalAmountEl = document.getElementById('totalAmount');
const submitBtnEl = document.getElementById('submitBtn');

// --- 程式進入點 ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. 綁定登入按鈕
    if (loginBtnEl) {
        loginBtnEl.addEventListener('click', handleLineLogin);
    }

    // 2. 檢查登入狀態
    if (!platformAuth) {
        alert("Firebase Auth 載入失敗。");
        return;
    }

    platformAuth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            const userRef = doc(platformDb, 'users', user.uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                userData = userSnap.data();
                contactNameEl.value = userData.displayName || '';
                contactPhoneEl.value = userData.phone || '';
                contactEmailEl.value = userData.email || '';
            }

            loginPromptEl.style.display = 'none';
            mainAppEl.style.display = 'block';
            
            setupEventListeners();
            calculateTotal();
        } else {
            loginPromptEl.style.display = 'flex';
            mainAppEl.style.display = 'none';
        }
    });
});

// --- LINE 登入處理 ---
function handleLineLogin() {
    const LINE_CHANNEL_ID = '2008269293';
    const LINE_CALLBACK_URL = window.location.origin + '/callback.html';
    
    try {
        const state = crypto.randomUUID();
        sessionStorage.setItem('line_login_state', state);
        
        const returnUrl = window.location.pathname + window.location.search;
        sessionStorage.setItem('line_login_return_url', returnUrl);
        
        const lineAuthUrl = new URL('https://access.line.me/oauth2/v2.1/authorize');
        lineAuthUrl.searchParams.append('response_type', 'code');
        lineAuthUrl.searchParams.append('client_id', LINE_CHANNEL_ID);
        lineAuthUrl.searchParams.append('redirect_uri', LINE_CALLBACK_URL);
        lineAuthUrl.searchParams.append('state', state);
        lineAuthUrl.searchParams.append('scope', 'profile openid email');
        
        window.location.href = lineAuthUrl.toString();
        
    } catch (error) {
        console.error('LINE 登入失敗:', error);
        alert('登入失敗: ' + error.message);
    }
}

// --- 事件監聽 ---
function setupEventListeners() {
    submitBtnEl.addEventListener('click', handleSubmit);
    
    // 監聽金額變化，自動計算總額
    puzhuoEl.addEventListener('input', calculateTotal);
    riceEl.addEventListener('input', calculateTotal);
    donationEl.addEventListener('input', calculateTotal);
    
    // 自動清除錯誤提示
    contactNameEl.addEventListener('input', () => clearError(contactNameEl));
    contactPhoneEl.addEventListener('input', () => clearError(contactPhoneEl));
    contactAddressEl.addEventListener('input', () => clearError(contactAddressEl));
    
    // 信用卡格式化
    cardNumberEl.addEventListener('input', formatCardNumber);
    cardExpiryEl.addEventListener('input', formatCardExpiry);
    cardCVVEl.addEventListener('input', formatCardCVV);
}

// --- 計算總金額 ---
function calculateTotal() {
    const puzhuo = parseInt(puzhuoEl.value) || 0;
    const rice = parseInt(riceEl.value) || 0;
    const donation = parseInt(donationEl.value) || 0;
    
    // 確保金額為正數
    if (puzhuo < 0) puzhuoEl.value = 0;
    if (rice < 0) riceEl.value = 0;
    if (donation < 0) donationEl.value = 0;
    
    const totalAmount = puzhuo + rice + donation;
    totalAmountEl.textContent = `NT$ ${totalAmount.toLocaleString()}`;
}

// --- 錯誤處理函數 ---
function showError(element, message) {
    element.classList.add('error');
    
    let errorDiv = element.parentElement.querySelector('.error-message');
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        element.parentElement.appendChild(errorDiv);
    }
    errorDiv.textContent = `⚠️ ${message}`;
    
    element.focus();
}

function clearError(element) {
    element.classList.remove('error');
    const errorDiv = element.parentElement.querySelector('.error-message');
    if (errorDiv) {
        errorDiv.remove();
    }
}

function clearAllErrors() {
    document.querySelectorAll('.input-field.error').forEach(el => {
        clearError(el);
    });
}

// --- 信用卡格式化函數 ---
function formatCardNumber(e) {
    let value = e.target.value.replace(/\s/g, '');
    let formatted = value.match(/.{1,4}/g);
    e.target.value = formatted ? formatted.join(' ') : value;
}

function formatCardExpiry(e) {
    let value = e.target.value.replace(/\//g, '');
    if (value.length >= 2) {
        e.target.value = value.slice(0, 2) + '/' + value.slice(2, 4);
    } else {
        e.target.value = value;
    }
}

function formatCardCVV(e) {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 3);
}

// --- 處理表單送出 ---
async function handleSubmit() {
    if (!currentUser) {
        alert("您似乎尚未登入，請重新整理頁面。");
        return;
    }
    
    clearAllErrors();
    
    submitBtnEl.disabled = true;
    submitBtnEl.textContent = '處理中...';

    try {
        // 1. 驗證聯絡資訊
        if (!contactNameEl.value.trim()) {
            showError(contactNameEl, '請填寫主事姓名');
            submitBtnEl.disabled = false;
            submitBtnEl.textContent = '確認報名並送出';
            return;
        }
        
        const phoneValue = contactPhoneEl.value.trim();
        if (!phoneValue) {
            showError(contactPhoneEl, '請填寫聯絡電話');
            submitBtnEl.disabled = false;
            submitBtnEl.textContent = '確認報名並送出';
            return;
        }
        if (!/^09\d{8}$/.test(phoneValue)) {
            showError(contactPhoneEl, '電話號碼格式不正確（應為 10 碼，例如：0912345678）');
            submitBtnEl.disabled = false;
            submitBtnEl.textContent = '確認報名並送出';
            return;
        }
        
        const receiptOption = document.querySelector('input[name="receiptOption"]:checked').value;
        if (receiptOption === 'send' && !contactAddressEl.value.trim()) {
            showError(contactAddressEl, '選擇寄發感謝狀時，通訊地址為必填');
            submitBtnEl.disabled = false;
            submitBtnEl.textContent = '確認報名並送出';
            return;
        }
        
        // 2. 驗證功德金額（至少要有一項）
        const puzhuo = parseInt(puzhuoEl.value) || 0;
        const rice = parseInt(riceEl.value) || 0;
        const donation = parseInt(donationEl.value) || 0;
        const totalAmount = puzhuo + rice + donation;
        
        if (totalAmount === 0) {
            alert('請至少填寫一項功德金額');
            submitBtnEl.disabled = false;
            submitBtnEl.textContent = '確認報名並送出';
            return;
        }

        // 3. 信用卡驗證
        const cardNumber = cardNumberEl.value.replace(/\s/g, '');
        const cardExpiry = cardExpiryEl.value;
        const cardCVV = cardCVVEl.value;

        if (!cardHolderNameEl.value.trim()) {
            alert('請填寫持卡人姓名');
            cardHolderNameEl.focus();
            submitBtnEl.disabled = false;
            submitBtnEl.textContent = '確認報名並送出';
            return;
        }

        if (cardNumber.length !== 16) {
            alert('請輸入有效的 16 碼信用卡號');
            cardNumberEl.focus();
            submitBtnEl.disabled = false;
            submitBtnEl.textContent = '確認報名並送出';
            return;
        }

        if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) {
            alert('請輸入有效的有效期限（格式：MM/YY）');
            cardExpiryEl.focus();
            submitBtnEl.disabled = false;
            submitBtnEl.textContent = '確認報名並送出';
            return;
        }

        const [month, year] = cardExpiry.split('/').map(Number);
        const now = new Date();
        const expiry = new Date(2000 + year, month - 1);
        if (expiry < now) {
            alert('此信用卡已過期');
            cardExpiryEl.focus();
            submitBtnEl.disabled = false;
            submitBtnEl.textContent = '確認報名並送出';
            return;
        }

        if (cardCVV.length !== 3) {
            alert('請輸入有效的 3 碼 CVV');
            cardCVVEl.focus();
            submitBtnEl.disabled = false;
            submitBtnEl.textContent = '確認報名並送出';
            return;
        }

        // 4. 收集資料
        const contactInfo = {
            name: contactNameEl.value.trim(),
            phone: contactPhoneEl.value.trim(),
            email: contactEmailEl.value.trim(),
            address: contactAddressEl.value.trim(),
            receiptOption: receiptOption
        };

        const donationItems = {
            puzhuo: puzhuo,
            rice: rice,
            donation: donation
        };

        const paymentInfo = {
            cardHolderName: cardHolderNameEl.value.trim(),
            cardNumber: cardNumberEl.value.trim(),
            cardExpiry: cardExpiryEl.value.trim(),
            cardCVV: cardCVVEl.value.trim(),
        };

        const otherNote = otherNoteEl.value.trim();
        
        // 5. 呼叫 Cloud Function
        console.log("正在呼叫後端 'submitRegistration'...");
        
        const idToken = await platformAuth.currentUser.getIdToken();
        
        const functionUrl = 'https://asia-east2-service-b9d4a.cloudfunctions.net/submitRegistration';
        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify({
                data: {
                    serviceType: SERVICE_TYPE,
                    contactInfo: contactInfo,
                    donationItems: donationItems,
                    paymentInfo: paymentInfo,
                    otherNote: otherNote,
                    totalAmount: totalAmount,
                    userId: currentUser.uid
                }
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || '提交失敗');
        }
        
        const result = await response.json();
        console.log("後端回傳結果:", result);
        alert(`報名成功！\n您的訂單編號為: ${result.result.orderId}\n我們將在核對資料後盡快為您處理。`);
        
        // 重置表單
        window.location.reload();

    } catch (error) {
        console.error("報名失敗:", error);
        alert(`報名失敗: ${error.message}`);
        submitBtnEl.disabled = false;
        submitBtnEl.textContent = '確認報名並送出';
    }
}
