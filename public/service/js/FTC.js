// -----------------------------------------
// 龜馬山 goLine - 福田會 企業團體 (FTC.js)
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
const SERVICE_TYPE = "ftc";
const TOTAL_AMOUNT = 30000;
const PAYMENT_PLANS = {
    quarterly: { periods: 12, amount: 2500, name: '季繳' },
    halfYearly: { periods: 6, amount: 5000, name: '半年繳' },
    yearly: { periods: 3, amount: 10000, name: '年繳' },
    fullPayment: { periods: 1, amount: 30000, name: '全繳' }
};

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
const firstPaymentEl = document.getElementById('firstPayment');
const footerFirstPaymentEl = document.getElementById('footerFirstPayment');
const customNameFieldEl = document.getElementById('customNameField');
const customNameEl = document.getElementById('customName');
const cardHolderNameEl = document.getElementById('cardHolderName');
const cardNumberEl = document.getElementById('cardNumber');
const cardExpiryEl = document.getElementById('cardExpiry');
const cardCVVEl = document.getElementById('cardCVV');
const otherNoteEl = document.getElementById('otherNote');
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
    // 繳款方式選擇
    document.querySelectorAll('input[name="paymentPlan"]').forEach(radio => {
        radio.addEventListener('change', updatePaymentDisplay);
    });

    // 感謝狀抬頭選擇
    document.querySelectorAll('input[name="certificateName"]').forEach(radio => {
        radio.addEventListener('change', handleCertificateNameChange);
    });

    submitBtnEl.addEventListener('click', handleSubmit);
    
    // 自動清除錯誤提示
    contactNameEl.addEventListener('input', () => clearError(contactNameEl));
    contactPhoneEl.addEventListener('input', () => clearError(contactPhoneEl));
    contactAddressEl.addEventListener('input', () => clearError(contactAddressEl));
    
    // 信用卡格式化
    cardNumberEl.addEventListener('input', formatCardNumber);
    cardExpiryEl.addEventListener('input', formatCardExpiry);
    cardCVVEl.addEventListener('input', formatCardCVV);
    
    // 感謝狀領取選項變更時，控制通訊地址欄位
    const receiptOptions = document.querySelectorAll('input[name="receiptOption"]');
    receiptOptions.forEach(option => {
        option.addEventListener('change', handleReceiptOptionChange);
    });
}

// --- 感謝狀領取選項變更處理 ---
function handleReceiptOptionChange() {
    const selectedOption = document.querySelector('input[name="receiptOption"]:checked').value;
    if (selectedOption === 'self') {
        // 親自領取：鎖定通訊地址欄位並清空內容
        contactAddressEl.disabled = true;
        contactAddressEl.value = '';
        contactAddressEl.placeholder = '親自領取時無需填寫地址';
        clearError(contactAddressEl);
    } else {
        // 寄發感謝狀：解除鎖定
        contactAddressEl.disabled = false;
        contactAddressEl.placeholder = '請輸入感謝狀寄送地址';
    }
}

// --- 更新繳款金額顯示 ---
function updatePaymentDisplay() {
    const selectedPlan = document.querySelector('input[name="paymentPlan"]:checked').value;
    const plan = PAYMENT_PLANS[selectedPlan];
    
    firstPaymentEl.textContent = `NT$ ${plan.amount.toLocaleString()}`;
    footerFirstPaymentEl.textContent = `NT$ ${plan.amount.toLocaleString()}`;
}

// --- 處理感謝狀抬頭選擇 ---
function handleCertificateNameChange() {
    const selectedOption = document.querySelector('input[name="certificateName"]:checked').value;
    customNameFieldEl.style.display = selectedOption === 'custom' ? 'block' : 'none';
    if (selectedOption !== 'custom') {
        customNameEl.value = '';
    }
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
    errorDiv.textContent = `${message}`;
    
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
            showError(contactNameEl, '請填寫報名姓名');
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

        if (!contactAddressEl.value.trim()) {
            showError(contactAddressEl, '請填寫通訊地址');
            submitBtnEl.disabled = false;
            submitBtnEl.textContent = '確認報名並送出';
            return;
        }

        // 2. 取得繳款方式
        const selectedPlan = document.querySelector('input[name="paymentPlan"]:checked').value;
        const plan = PAYMENT_PLANS[selectedPlan];

        // 3. 取得感謝狀抬頭
        const certificateOption = document.querySelector('input[name="certificateName"]:checked').value;
        let certificateName = '';
        
        if (certificateOption === 'donor') {
            certificateName = contactNameEl.value.trim();
        } else if (certificateOption === 'cardholder') {
            certificateName = cardHolderNameEl.value.trim();
        } else if (certificateOption === 'custom') {
            certificateName = customNameEl.value.trim();
            if (!certificateName) {
                showError(customNameEl, '請填寫自訂感謝狀抬頭');
                submitBtnEl.disabled = false;
                submitBtnEl.textContent = '確認報名並送出';
                return;
            }
        }

        // 4. 信用卡驗證
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

        const [cardMonth, cardYear] = cardExpiry.split('/').map(Number);
        const now = new Date();
        const expiry = new Date(2000 + cardYear, cardMonth - 1);
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

        // 5. 收集資料
        const contactInfo = {
            name: contactNameEl.value.trim(),
            phone: contactPhoneEl.value.trim(),
            email: contactEmailEl.value.trim(),
            address: contactAddressEl.value.trim()
        };

        const donorInfo = {
            name: contactNameEl.value.trim(),
            gender: document.querySelector('input[name="gender"]:checked').value
        };

        const paymentPlanInfo = {
            plan: selectedPlan,
            planName: plan.name,
            periods: plan.periods,
            amountPerPeriod: plan.amount,
            totalAmount: TOTAL_AMOUNT
        };

        const applicants = [{
            applicantName: donorInfo.name,
            gender: donorInfo.gender,
            paymentPlan: paymentPlanInfo,
            certificateName: certificateName,
            certificateOption: certificateOption
        }];

        const paymentInfo = {
            cardHolderName: cardHolderNameEl.value.trim(),
            cardNumber: cardNumberEl.value.trim(),
            cardExpiry: cardExpiryEl.value.trim(),
            cardCVV: cardCVVEl.value.trim(),
        };

        const otherNote = otherNoteEl.value.trim();
        
        // 7. 呼叫 Cloud Function
        console.log("正在呼叫後端 'submitRegistration'...");
        
        // 再次檢查登入狀態（防止 token 過期）
        if (!platformAuth.currentUser) {
            throw new Error('登入狀態已過期，請重新整理頁面並重新登入');
        }
        
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
                    applicants: applicants,
                    paymentInfo: paymentInfo,
                    otherNote: otherNote,
                    totalAmount: plan.amount, // 首期扣款金額
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
        
        // 跳轉到訂單確認頁面
        window.location.href = `success.html?orderId=${result.result.orderId}&service=${SERVICE_TYPE}`;

    } catch (error) {
        console.error("報名失敗:", error);
        alert(`報名失敗: ${error.message}`);
        submitBtnEl.disabled = false;
        submitBtnEl.textContent = '確認報名並送出';
    }
}
