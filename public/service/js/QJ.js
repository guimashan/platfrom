// -----------------------------------------
// 龜馬山 goLine - 秋祭法會 (QJ.js)
// (最終修正版：修正載入順序 + 即時同步)
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
const SERVICE_TYPE = "qiuji";
const POSITION_PRICE = 300;
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
const modeSingleEl = document.getElementById('modeSingle');
const modeMultiEl = document.getElementById('modeMulti');
const applicantCardListEl = document.getElementById('applicantCardList');
const addApplicantBtnEl = document.getElementById('addApplicantBtn');
const cardHolderNameEl = document.getElementById('cardHolderName');
const cardNumberEl = document.getElementById('cardNumber');
const cardExpiryEl = document.getElementById('cardExpiry');
const cardCVVEl = document.getElementById('cardCVV');
const otherNoteEl = document.getElementById('otherNote');
const totalPositionsEl = document.getElementById('totalPositions');
const totalAmountEl = document.getElementById('totalAmount');
const submitBtnEl = document.getElementById('submitBtn');

// --- 程式進入點 ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. 綁定登入按鈕
    if (loginBtnEl) {
        loginBtnEl.addEventListener('click', handleLineLogin);
    }

    // 2. 檢查登入狀態 (這是非同步的)
    if (!platformAuth) {
        alert("Firebase Auth 載入失敗。");
        return;
    }

    platformAuth.onAuthStateChanged(async (user) => {
        if (user) {
            // 使用者已登入
            currentUser = user;
            const userRef = doc(platformDb, 'users', user.uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                userData = userSnap.data();
                // 自動填入聯絡人資訊
                contactNameEl.value = userData.displayName || '';
                contactPhoneEl.value = userData.phone || '';
                contactEmailEl.value = userData.email || '';
            }

            // 隱藏登入畫面，顯示主要內容
            loginPromptEl.style.display = 'none';
            mainAppEl.style.display = 'block';
            
            // 在確認登入狀態「之後」，才初始化卡片
            setupEventListeners();
            updateMode();
        } else {
            // 使用者未登入，保持顯示登入畫面
            loginPromptEl.style.display = 'flex';
            mainAppEl.style.display = 'none';
        }
    });
});

// --- LINE 登入處理 ---
function handleLineLogin() {
    // 使用與 auth.js 相同的邏輯
    const LINE_CHANNEL_ID = '2008269293';
    const LINE_CALLBACK_URL = window.location.origin + '/callback.html';
    
    try {
        // 產生隨機 state 用於 CSRF 防護
        const state = crypto.randomUUID();
        sessionStorage.setItem('line_login_state', state);
        
        // 記住用戶想去的頁面
        const returnUrl = window.location.pathname + window.location.search;
        sessionStorage.setItem('line_login_return_url', returnUrl);
        
        // 構建 LINE 授權 URL
        const lineAuthUrl = new URL('https://access.line.me/oauth2/v2.1/authorize');
        lineAuthUrl.searchParams.append('response_type', 'code');
        lineAuthUrl.searchParams.append('client_id', LINE_CHANNEL_ID);
        lineAuthUrl.searchParams.append('redirect_uri', LINE_CALLBACK_URL);
        lineAuthUrl.searchParams.append('state', state);
        lineAuthUrl.searchParams.append('scope', 'profile openid email');
        
        // 導向 LINE 授權頁面
        window.location.href = lineAuthUrl.toString();
        
    } catch (error) {
        console.error('LINE 登入失敗:', error);
        alert('登入失敗: ' + error.message);
    }
}

// --- 事件監聽 ---
function setupEventListeners() {
    modeSingleEl.addEventListener('change', updateMode);
    modeMultiEl.addEventListener('change', updateMode);
    addApplicantBtnEl.addEventListener('click', () => createApplicantCard('', true));
    submitBtnEl.addEventListener('click', handleSubmit);
    applicantCardListEl.addEventListener('input', calculateTotal);

    // --- 雙向同步：聯絡人姓名 ↔ 第一個報名者姓名 ---
    contactNameEl.addEventListener('input', syncNameToFirstCard);
    
    // 信用卡欄位格式化
    cardNumberEl.addEventListener('input', formatCardNumber);
    cardExpiryEl.addEventListener('input', formatCardExpiry);
    cardCVVEl.addEventListener('input', formatCardCVV);
    
    // 自動清除錯誤提示（報名資料欄位）
    contactNameEl.addEventListener('input', () => clearError(contactNameEl));
    contactPhoneEl.addEventListener('input', () => clearError(contactPhoneEl));
    contactAddressEl.addEventListener('input', () => clearError(contactAddressEl));
}

// --- 雙向同步姓名 ---
// 從聯絡人姓名 → 第一個報名者姓名
function syncNameToFirstCard() {
    const firstCard = applicantCardListEl.querySelector('.applicant-card');
    if (firstCard) {
        const newName = contactNameEl.value.trim();
        const displayName = newName || '報名者本人';
        firstCard.querySelector('.card-summary-name').textContent = displayName;
        firstCard.querySelector('.card-input-name').value = newName;
    }
}

// 從第一個報名者姓名 → 聯絡人姓名
function syncFirstCardToName(card) {
    const cards = applicantCardListEl.querySelectorAll('.applicant-card');
    const isFirstCard = cards[0] === card;
    if (isFirstCard) {
        const cardName = card.querySelector('.card-input-name').value.trim();
        contactNameEl.value = cardName;
    }
}

// --- 自動填入生肖 ---
function autoFillShengxiao(card, dateString) {
    const shengxiaoSelect = card.querySelector('[id^="shengxiao-"]');
    const lunarYearSpan = card.querySelector('[id^="lunar-year-"]');
    const lunarMonthSpan = card.querySelector('[id^="lunar-month-"]');
    const lunarDaySpan = card.querySelector('[id^="lunar-day-"]');
    
    if (!shengxiaoSelect) return;
    
    if (!dateString) {
        shengxiaoSelect.value = '';
        if (lunarYearSpan) lunarYearSpan.textContent = '';
        if (lunarMonthSpan) lunarMonthSpan.textContent = '';
        if (lunarDaySpan) lunarDaySpan.textContent = '';
        return;
    }
    
    try {
        const [year, month, day] = dateString.split('-').map(Number);
        const solar = Solar.fromYmd(year, month, day);
        const lunar = solar.getLunar();
        const shengxiao = lunar.getYearShengXiao();
        
        // 填入生肖
        if (shengxiao) {
            shengxiaoSelect.value = shengxiao;
        }
        
        // 分別填入農曆年月日
        if (lunarYearSpan) {
            lunarYearSpan.textContent = lunar.getYearInGanZhi();
        }
        if (lunarMonthSpan) {
            lunarMonthSpan.textContent = lunar.getMonthInChinese();
        }
        if (lunarDaySpan) {
            lunarDaySpan.textContent = lunar.getDayInChinese();
        }
    } catch (error) {
        console.error('計算生肖時發生錯誤:', error);
        shengxiaoSelect.value = '';
        if (lunarYearSpan) lunarYearSpan.textContent = '';
        if (lunarMonthSpan) lunarMonthSpan.textContent = '';
        if (lunarDaySpan) lunarDaySpan.textContent = '';
    }
}

// --- 核心功能 (修正) ---

function updateMode() {
    const isMultiMode = modeMultiEl.checked;
    addApplicantBtnEl.style.display = isMultiMode ? 'block' : 'none';
    const cards = applicantCardListEl.querySelectorAll('.applicant-card');
    
    // 取得預設姓名 (現在 userData 已經被載入了)
    const defaultName = (userData && userData.displayName) ? userData.displayName : '報名者本人';

    if (isMultiMode) {
        // 多人模式：如果一張卡片都沒有，自動建立第一張
        if (cards.length === 0) {
            createApplicantCard(defaultName, false);
        }
    } else {
        // 單人模式：刪除多餘卡片
        cards.forEach((card, index) => {
            if (index > 0) card.remove();
        });
        
        if (cards.length === 0) {
            createApplicantCard(defaultName, false);
        } else {
            // 更新第一張卡片的標題和內容
            const firstCardName = contactNameEl.value.trim() || defaultName;
            cards[0].querySelector('.card-summary-name').textContent = firstCardName;
            cards[0].querySelector('.card-input-name').value = contactNameEl.value.trim();
            const removeBtn = cards[0].querySelector('.remove-btn');
            if (removeBtn) removeBtn.style.display = 'none';
        }
    }
    
    // --- 修正：在更新模式後，立即執行一次同步和計算 ---
    syncNameToFirstCard();
    calculateTotal();
}

function createApplicantCard(name = '家人/親友', canRemove = true) {
    const cardId = `card-${Date.now()}`;
    const card = document.createElement('div');
    card.className = 'applicant-card';
    card.id = cardId;
    card.setAttribute('data-open', 'true');

    // 預填姓名（確保不會是 null）
    let prefillName = name || '';
    // 如果 name 是 "報名者本人"，就從已填入的 contactNameEl 抓取
    if (name === '報名者本人') {
        prefillName = contactNameEl.value.trim();
    } else if (name === '家人/親友' || name === '') {
        prefillName = ''; // 新增卡片時，姓名留空
    }

    card.innerHTML = `
        <div class="card-summary">
            <span class="card-summary-name">${prefillName || '報名者本人'}</span>
            <span class="card-summary-info">文昌帝君拱斗</span>
        </div>
        <div class="applicant-details">
            <label for="name-${cardId}">報名者姓名</label>
            <input type="text" id="name-${cardId}" class="input-field card-input-name" value="${prefillName}" placeholder="請填寫報名者姓名">
            
            <label>性別</label>
            <div class="radio-group">
                <label class="radio-label">
                    <input type="radio" name="gender-${cardId}" value="男" checked>
                    <span>男</span>
                </label>
                <label class="radio-label">
                    <input type="radio" name="gender-${cardId}" value="女">
                    <span>女</span>
                </label>
            </div>
            
            <label>生辰 (國曆)</label>
            <div style="display: flex; gap: 3px; align-items: center;">
                <input type="text" id="bazi-year-${cardId}" class="input-field" placeholder="____" maxlength="4" style="width: 52px; text-align: center; font-size: 0.95em; padding: 6px 4px;">
                <span style="font-size: 0.8em;">年</span>
                <input type="text" id="bazi-month-${cardId}" class="input-field" placeholder="__" maxlength="2" style="width: 34px; text-align: center; font-size: 0.95em; padding: 6px 4px;">
                <span style="font-size: 0.8em;">月</span>
                <input type="text" id="bazi-day-${cardId}" class="input-field" placeholder="__" maxlength="2" style="width: 34px; text-align: center; font-size: 0.95em; padding: 6px 4px;">
                <span style="font-size: 0.8em;">日</span>
                <div style="position: relative; display: inline-block;">
                    <input type="date" id="bazi-${cardId}" style="position: absolute; opacity: 0; width: 1px; height: 1px; pointer-events: none;">
                    <button type="button" id="bazi-btn-${cardId}" style="background: var(--primary-gold); color: white; border: none; border-radius: 4px; padding: 8px 12px; cursor: pointer; font-size: 1.1em;" title="點擊選擇日期">🗓️</button>
                </div>
            </div>
            <div id="lunar-display-${cardId}" style="display: flex; gap: 3px; align-items: center; font-size: 0.95em; color: #666; margin-top: 5px; margin-bottom: 15px; min-height: 20px; font-weight: 500;">
                <span id="lunar-year-${cardId}" style="display: inline-block; width: 52px; text-align: center;"></span>
                <span style="font-size: 0.85em;">年</span>
                <span id="lunar-month-${cardId}" style="display: inline-block; width: 34px; text-align: center;"></span>
                <span style="font-size: 0.85em;">月</span>
                <span id="lunar-day-${cardId}" style="display: inline-block; width: 34px; text-align: center;"></span>
                <span style="font-size: 0.85em;">日</span>
            </div>

            <div class="shengxiao-time-grid">
                <div>
                    <label for="shengxiao-${cardId}" style="display: block; margin-bottom: 8px;">生肖</label>
                    <input type="text" id="shengxiao-${cardId}" class="input-field shengxiao-field" readonly placeholder="選擇日期後自動顯示" style="background-color: #f5f5f5; cursor: not-allowed; width: 100%; height: 50px; font-size: 1rem;">
                </div>
                <div>
                    <label for="time-${cardId}" style="display: block; margin-bottom: 8px;">時辰</label>
                    <select id="time-${cardId}" class="input-field" style="width: 100%; height: 50px; font-size: 1rem;">
                        <option value="">請選擇時辰</option>
                        <option value="吉時">吉時</option>
                        <option value="子時">子時 (23:00-01:00)</option>
                        <option value="丑時">丑時 (01:00-03:00)</option>
                        <option value="寅時">寅時 (03:00-05:00)</option>
                        <option value="卯時">卯時 (05:00-07:00)</option>
                        <option value="辰時">辰時 (07:00-09:00)</option>
                        <option value="巳時">巳時 (09:00-11:00)</option>
                        <option value="午時">午時 (11:00-13:00)</option>
                        <option value="未時">未時 (13:00-15:00)</option>
                        <option value="申時">申時 (15:00-17:00)</option>
                        <option value="酉時">酉時 (17:00-19:00)</option>
                        <option value="戌時">戌時 (19:00-21:00)</option>
                        <option value="亥時">亥時 (21:00-23:00)</option>
                    </select>
                </div>
            </div>
            
            <div class="card-actions">
                ${canRemove ? `<button class="remove-btn" data-card-id="${cardId}">移除此人</button>` : ''}
            </div>
        </div>
    `;

    applicantCardListEl.appendChild(card);

    // 綁定事件
    if (canRemove) {
        card.querySelector('.remove-btn').addEventListener('click', () => {
            document.getElementById(cardId).remove();
            calculateTotal();
        });
    }
    card.querySelector('.card-summary').addEventListener('click', () => {
        const details = card.querySelector('.applicant-details');
        const isOpen = card.getAttribute('data-open') === 'true';
        details.style.display = isOpen ? 'none' : 'block';
        card.setAttribute('data-open', isOpen ? 'false' : 'true');
    });
    card.querySelector('.card-input-name').addEventListener('input', (e) => {
        card.querySelector('.card-summary-name').textContent = e.target.value || '未命名';
        syncFirstCardToName(card);
    });
    
    // 同步生辰輸入：日期選擇器 → 三個手動輸入欄位
    const dateInput = card.querySelector(`#bazi-${cardId}`);
    const dateButton = card.querySelector(`#bazi-btn-${cardId}`);
    const yearInput = card.querySelector(`#bazi-year-${cardId}`);
    const monthInput = card.querySelector(`#bazi-month-${cardId}`);
    const dayInput = card.querySelector(`#bazi-day-${cardId}`);
    
    // 點擊日曆圖示時觸發日期選擇器（兼容 Safari/iOS）
    dateButton.addEventListener('click', (e) => {
        e.preventDefault();
        dateInput.style.pointerEvents = 'auto';
        
        if (typeof dateInput.showPicker === 'function') {
            // Chrome/Edge 支援 showPicker()
            try {
                dateInput.showPicker();
            } catch (err) {
                dateInput.click();
            }
        } else {
            // Safari/iOS 不支援 showPicker()，使用 click()
            dateInput.click();
        }
        
        setTimeout(() => { dateInput.style.pointerEvents = 'none'; }, 100);
    });
    
    dateInput.addEventListener('change', (e) => {
        if (e.target.value) {
            const [year, month, day] = e.target.value.split('-');
            yearInput.value = year;
            monthInput.value = parseInt(month, 10);
            dayInput.value = parseInt(day, 10);
            autoFillShengxiao(card, e.target.value);
        } else {
            yearInput.value = '';
            monthInput.value = '';
            dayInput.value = '';
            autoFillShengxiao(card, '');
        }
    });
    
    // 同步生辰輸入：手動輸入 → 日期選擇器
    const syncManualToDate = () => {
        const year = yearInput.value.trim();
        const month = monthInput.value.trim();
        const day = dayInput.value.trim();
        
        if (!year && !month && !day) {
            dateInput.value = '';
            autoFillShengxiao(card, '');
            return;
        }
        
        if (year.length === 4 && month && day) {
            const paddedMonth = month.padStart(2, '0');
            const paddedDay = day.padStart(2, '0');
            const dateValue = `${year}-${paddedMonth}-${paddedDay}`;
            dateInput.value = dateValue;
            autoFillShengxiao(card, dateValue);
        } else {
            autoFillShengxiao(card, '');
        }
    };
    
    yearInput.addEventListener('blur', syncManualToDate);
    monthInput.addEventListener('blur', syncManualToDate);
    dayInput.addEventListener('blur', syncManualToDate);
    
    // 限制只能輸入數字
    [yearInput, monthInput, dayInput].forEach(input => {
        input.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
        });
    });
}

function calculateTotal() {
    const cards = applicantCardListEl.querySelectorAll('.applicant-card');
    const totalPositions = cards.length;
    
    const totalAmount = totalPositions * POSITION_PRICE;
    totalPositionsEl.textContent = `${totalPositions} 位`;
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

// --- 表單驗證 ---
function validateForm() {
    clearAllErrors();
    
    // 聯絡資訊驗證
    if (!contactNameEl.value.trim()) {
        showError(contactNameEl, '請填寫報名姓名');
        return false;
    }
    
    const phoneValue = contactPhoneEl.value.trim();
    if (!phoneValue) {
        showError(contactPhoneEl, '請填寫聯絡電話');
        return false;
    }
    if (!/^09\d{8}$/.test(phoneValue)) {
        showError(contactPhoneEl, '電話號碼格式不正確（應為 10 碼，例如：0912345678）');
        return false;
    }
    
    // 感謝狀寄發時，地址必填
    const receiptOption = document.querySelector('input[name="receiptOption"]:checked').value;
    if (receiptOption === 'send' && !contactAddressEl.value.trim()) {
        showError(contactAddressEl, '選擇寄發感謝狀時，通訊地址為必填');
        return false;
    }

    // 報名者驗證
    const cards = applicantCardListEl.querySelectorAll('.applicant-card');
    if (cards.length === 0) {
        alert('請至少新增一位報名者');
        return false;
    }

    let cardIndex = 0;
    for (const card of cards) {
        cardIndex++;
        const cardName = card.querySelector('.card-summary-name').textContent || `第 ${cardIndex} 位報名者`;
        
        // 檢查姓名
        const nameInput = card.querySelector('.card-input-name');
        if (!nameInput.value.trim()) {
            showError(nameInput, `請填寫 ${cardName} 的姓名`);
            // 展開卡片以顯示錯誤
            card.querySelector('.applicant-details').style.display = 'block';
            card.setAttribute('data-open', 'true');
            return false;
        }

        // 檢查生辰（國曆）- 年、月、日都要填寫
        const cardId = card.id;
        const yearInput = card.querySelector(`#bazi-year-${cardId}`);
        const monthInput = card.querySelector(`#bazi-month-${cardId}`);
        const dayInput = card.querySelector(`#bazi-day-${cardId}`);
        
        const year = yearInput.value.trim();
        const month = monthInput.value.trim();
        const day = dayInput.value.trim();
        
        if (!year || !month || !day) {
            // 找到第一個空白的欄位並顯示錯誤
            let errorInput;
            let errorField;
            if (!year) {
                errorInput = yearInput;
                errorField = '年';
            } else if (!month) {
                errorInput = monthInput;
                errorField = '月';
            } else {
                errorInput = dayInput;
                errorField = '日';
            }
            showError(errorInput, `請填寫 ${cardName} 的生辰（${errorField}）`);
            // 展開卡片以顯示錯誤
            card.querySelector('.applicant-details').style.display = 'block';
            card.setAttribute('data-open', 'true');
            return false;
        }
        
        // 驗證日期格式
        if (year.length !== 4 || isNaN(year)) {
            showError(yearInput, `${cardName} 的生辰年份格式不正確（需4位數字）`);
            card.querySelector('.applicant-details').style.display = 'block';
            card.setAttribute('data-open', 'true');
            return false;
        }
        
        const monthNum = parseInt(month, 10);
        if (monthNum < 1 || monthNum > 12) {
            showError(monthInput, `${cardName} 的生辰月份必須在 1-12 之間`);
            card.querySelector('.applicant-details').style.display = 'block';
            card.setAttribute('data-open', 'true');
            return false;
        }
        
        const dayNum = parseInt(day, 10);
        if (dayNum < 1 || dayNum > 31) {
            showError(dayInput, `${cardName} 的生辰日期必須在 1-31 之間`);
            card.querySelector('.applicant-details').style.display = 'block';
            card.setAttribute('data-open', 'true');
            return false;
        }
    }

    // 信用卡驗證
    const cardNumber = cardNumberEl.value.replace(/\s/g, '');
    const cardExpiry = cardExpiryEl.value;
    const cardCVV = cardCVVEl.value;

    if (!cardHolderNameEl.value.trim()) {
        alert('請填寫持卡人姓名');
        cardHolderNameEl.focus();
        return false;
    }

    if (cardNumber.length !== 16) {
        alert('請輸入有效的 16 碼信用卡號');
        cardNumberEl.focus();
        return false;
    }

    if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) {
        alert('請輸入有效的有效期限（格式：MM/YY）');
        cardExpiryEl.focus();
        return false;
    }

    // 檢查卡片是否過期
    const [month, year] = cardExpiry.split('/').map(Number);
    const now = new Date();
    const expiry = new Date(2000 + year, month - 1);
    if (expiry < now) {
        alert('此信用卡已過期');
        cardExpiryEl.focus();
        return false;
    }

    if (cardCVV.length !== 3) {
        alert('請輸入有效的 3 碼 CVV');
        cardCVVEl.focus();
        return false;
    }

    return true;
}

// --- 處理表單送出 ---
async function handleSubmit() {
    if (!currentUser) {
        alert("您似乎尚未登入，請重新整理頁面。");
        return;
    }

    if (!validateForm()) {
        return;
    }
    
    submitBtnEl.disabled = true;
    submitBtnEl.textContent = '處理中...';

    try {
        // 1. 收集聯絡人資訊
        const contactInfo = {
            name: contactNameEl.value.trim(),
            phone: contactPhoneEl.value.trim(),
            email: contactEmailEl.value.trim(),
            address: contactAddressEl.value.trim(),
            receiptOption: document.querySelector('input[name="receiptOption"]:checked').value
        };

        // 2. 收集報名者名單
        const applicants = [];
        const cards = applicantCardListEl.querySelectorAll('.applicant-card');
        cards.forEach(card => {
            // 獲取性別（單選按鈕）
            const genderRadio = card.querySelector('input[name^="gender-"]:checked');
            
            const cardData = {
                applicantName: card.querySelector('.card-input-name').value.trim(),
                bazi: {
                    gender: genderRadio ? genderRadio.value : '',
                    birthDate: card.querySelector('input[type="date"]').value,
                    shengxiao: card.querySelector('[id^="shengxiao-"]').value,
                    time: card.querySelector('[id^="time-"]').value,
                },
                serviceItem: '文昌帝君拱斗'
            };
            applicants.push(cardData);
        });

        // 3. 收集信用卡資訊
        const paymentInfo = {
            cardHolderName: cardHolderNameEl.value.trim(),
            cardNumber: cardNumberEl.value.trim(),
            cardExpiry: cardExpiryEl.value.trim(),
            cardCVV: cardCVVEl.value.trim(),
        };

        // 4. 收集其他資料
        const otherNote = otherNoteEl.value.trim();
        const totalAmount = parseInt(totalAmountEl.textContent.replace('NT$ ', '').replace(/,/g, ''), 10);
        
        // --- 呼叫 Cloud Function ---
        console.log("正在呼叫後端 'submitRegistration'...");
        
        // 獲取 Platform Auth 的 ID Token（跨專案認證）
        const idToken = await platformAuth.currentUser.getIdToken();
        
        // 使用 fetch 手動呼叫，傳遞認證 token
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
        alert(`報名失敗：${error.message}`);
    } finally {
        submitBtnEl.disabled = false;
        submitBtnEl.textContent = '確認報名並送出';
    }
}
