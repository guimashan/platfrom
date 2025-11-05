// -----------------------------------------
// 龜馬山 goLine - 福田少年會 (FTY.js)
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
const SERVICE_TYPE = "fty";
const TOTAL_AMOUNT = 30000;
const AGE_LIMIT = 30;
const PAYMENT_PLANS = {
    quarterly: { periods: 20, amount: 1500, name: '季繳' },
    halfYearly: { periods: 10, amount: 3000, name: '半年繳' },
    yearly: { periods: 5, amount: 6000, name: '年繳' },
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
const idNumberEl = document.getElementById('idNumber');
const baziYearEl = document.getElementById('bazi-year');
const baziMonthEl = document.getElementById('bazi-month');
const baziDayEl = document.getElementById('bazi-day');
const baziBtnEl = document.getElementById('bazi-btn');
const baziDateEl = document.getElementById('bazi');
const westernYearEl = document.getElementById('western-year');
const westernMonthEl = document.getElementById('western-month');
const westernDayEl = document.getElementById('western-day');
const lunarYearEl = document.getElementById('lunar-year');
const lunarMonthEl = document.getElementById('lunar-month');
const lunarDayEl = document.getElementById('lunar-day');
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

    // 日期處理
    setupDateHandlers();

    submitBtnEl.addEventListener('click', handleSubmit);
    
    // 自動清除錯誤提示
    contactNameEl.addEventListener('input', () => clearError(contactNameEl));
    contactPhoneEl.addEventListener('input', () => clearError(contactPhoneEl));
    contactAddressEl.addEventListener('input', () => clearError(contactAddressEl));
    idNumberEl.addEventListener('input', () => clearError(idNumberEl));
    baziYearEl.addEventListener('input', () => clearError(baziYearEl));
    baziMonthEl.addEventListener('input', () => clearError(baziMonthEl));
    baziDayEl.addEventListener('input', () => clearError(baziDayEl));
    
    // 信用卡格式化
    cardNumberEl.addEventListener('input', formatCardNumber);
    cardExpiryEl.addEventListener('input', formatCardExpiry);
    cardCVVEl.addEventListener('input', formatCardCVV);
}

// --- 日期處理函數 ---
function setupDateHandlers() {
    // 民國年轉西元年
    function updateWesternDate() {
        const rocYear = baziYearEl.value.trim();
        const month = baziMonthEl.value.trim();
        const day = baziDayEl.value.trim();

        if (rocYear && month && day) {
            const westernYear = parseInt(rocYear) + 1911;
            westernYearEl.textContent = westernYear;
            westernMonthEl.textContent = month;
            westernDayEl.textContent = day;

            // 計算農曆
            updateLunarDate(westernYear, parseInt(month), parseInt(day));
        } else {
            westernYearEl.textContent = '';
            westernMonthEl.textContent = '';
            westernDayEl.textContent = '';
            lunarYearEl.textContent = '';
            lunarMonthEl.textContent = '';
            lunarDayEl.textContent = '';
        }
    }

    // 農曆轉換
    function updateLunarDate(year, month, day) {
        try {
            if (typeof Lunar !== 'undefined') {
                const lunar = Lunar.fromYmd(year, month, day);
                lunarYearEl.textContent = lunar.getYearInGanZhi();
                lunarMonthEl.textContent = lunar.getMonthInChinese();
                lunarDayEl.textContent = lunar.getDayInChinese();
            }
        } catch (error) {
            console.error('農曆轉換失敗:', error);
            lunarYearEl.textContent = '';
            lunarMonthEl.textContent = '';
            lunarDayEl.textContent = '';
        }
    }

    // 日曆選擇器轉換
    baziBtnEl.addEventListener('click', () => {
        baziDateEl.showPicker();
    });

    baziDateEl.addEventListener('change', (e) => {
        const selectedDate = new Date(e.target.value);
        if (!isNaN(selectedDate.getTime())) {
            const westernYear = selectedDate.getFullYear();
            const rocYear = westernYear - 1911;
            const month = selectedDate.getMonth() + 1;
            const day = selectedDate.getDate();

            baziYearEl.value = rocYear;
            baziMonthEl.value = month;
            baziDayEl.value = day;

            updateWesternDate();
        }
    });

    // 監聽輸入變化
    baziYearEl.addEventListener('input', updateWesternDate);
    baziMonthEl.addEventListener('input', updateWesternDate);
    baziDayEl.addEventListener('input', updateWesternDate);
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

        // 2. 驗證性別、身分證字號、出生日期
        if (!idNumberEl.value.trim()) {
            showError(idNumberEl, '請填寫身分證字號');
            submitBtnEl.disabled = false;
            submitBtnEl.textContent = '確認報名並送出';
            return;
        }

        // 驗證身分證字號格式
        const idNumber = idNumberEl.value.trim().toUpperCase();
        if (!/^[A-Z][12]\d{8}$/.test(idNumber)) {
            showError(idNumberEl, '身分證字號格式不正確');
            submitBtnEl.disabled = false;
            submitBtnEl.textContent = '確認報名並送出';
            return;
        }

        // 驗證出生日期（ROC年格式）
        const rocYear = baziYearEl.value.trim();
        const month = baziMonthEl.value.trim();
        const day = baziDayEl.value.trim();

        if (!rocYear || !month || !day) {
            let errorInput, errorField;
            if (!rocYear) {
                errorInput = baziYearEl;
                errorField = '年';
            } else if (!month) {
                errorInput = baziMonthEl;
                errorField = '月';
            } else {
                errorInput = baziDayEl;
                errorField = '日';
            }
            showError(errorInput, `請填寫出生日期（${errorField}）`);
            submitBtnEl.disabled = false;
            submitBtnEl.textContent = '確認報名並送出';
            return;
        }

        // 驗證日期有效性
        const westernYear = parseInt(rocYear) + 1911;
        const monthNum = parseInt(month);
        const dayNum = parseInt(day);

        if (isNaN(westernYear) || isNaN(monthNum) || isNaN(dayNum)) {
            showError(baziYearEl, '日期格式不正確');
            submitBtnEl.disabled = false;
            submitBtnEl.textContent = '確認報名並送出';
            return;
        }

        if (monthNum < 1 || monthNum > 12) {
            showError(baziMonthEl, '月份必須在 1-12 之間');
            submitBtnEl.disabled = false;
            submitBtnEl.textContent = '確認報名並送出';
            return;
        }

        // 檢查日期是否存在
        const testDate = new Date(westernYear, monthNum - 1, dayNum);
        if (testDate.getMonth() + 1 !== monthNum || testDate.getDate() !== dayNum) {
            showError(baziDayEl, '此日期不存在');
            submitBtnEl.disabled = false;
            submitBtnEl.textContent = '確認報名並送出';
            return;
        }

        // 驗證年齡（30歲以下）
        const birthDate = new Date(westernYear, monthNum - 1, dayNum);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }

        if (age >= AGE_LIMIT) {
            showError(baziYearEl, '福田少年會限 30 歲以下青年加入');
            submitBtnEl.disabled = false;
            submitBtnEl.textContent = '確認報名並送出';
            return;
        }

        // 3. 取得繳款方式
        const selectedPlan = document.querySelector('input[name="paymentPlan"]:checked').value;
        const plan = PAYMENT_PLANS[selectedPlan];

        // 4. 取得感謝狀抬頭
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

        // 5. 信用卡驗證
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

        // 6. 收集資料
        const contactInfo = {
            name: contactNameEl.value.trim(),
            phone: contactPhoneEl.value.trim(),
            email: contactEmailEl.value.trim(),
            address: contactAddressEl.value.trim()
        };

        // 組合出生日期（西元年格式）
        const birthDateStr = `${westernYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

        // 收集農曆資訊
        let lunarInfo = null;
        try {
            if (typeof Lunar !== 'undefined') {
                const lunar = Lunar.fromYmd(westernYear, parseInt(month), parseInt(day));
                lunarInfo = {
                    year: lunar.getYearInGanZhi(),
                    month: lunar.getMonthInChinese(),
                    day: lunar.getDayInChinese()
                };
            }
        } catch (error) {
            console.error('農曆轉換錯誤:', error);
        }

        const donorInfo = {
            name: contactNameEl.value.trim(),
            gender: document.querySelector('input[name="gender"]:checked').value,
            idNumber: idNumberEl.value.trim().toUpperCase(),
            birthDate: birthDateStr,
            birthDateRoc: {
                year: rocYear,
                month: month,
                day: day
            },
            lunarBirthDate: lunarInfo,
            age: age
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
            idNumber: donorInfo.idNumber,
            birthDate: donorInfo.birthDate,
            birthDateRoc: donorInfo.birthDateRoc,
            lunarBirthDate: donorInfo.lunarBirthDate,
            age: donorInfo.age,
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
        alert(`報名成功！\n您的訂單編號為: ${result.result.orderId}\n繳款方式：${plan.name}（共 ${plan.periods} 期）\n首期扣款：NT$ ${plan.amount.toLocaleString()}\n\n我們將在核對資料後盡快為您處理。`);
        
        // 重置表單
        window.location.reload();

    } catch (error) {
        console.error("報名失敗:", error);
        alert(`報名失敗: ${error.message}`);
        submitBtnEl.disabled = false;
        submitBtnEl.textContent = '確認報名並送出';
    }
}
