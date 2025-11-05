// -----------------------------------------
// 龜馬山 goLine - 禮斗法會 (LD.js)
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
const SERVICE_TYPE = "lidou";
const DOU_PRICE = 1500;
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
const totalDousEl = document.getElementById('totalDous');
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
            updateMode();
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
    modeSingleEl.addEventListener('change', updateMode);
    modeMultiEl.addEventListener('change', updateMode);
    addApplicantBtnEl.addEventListener('click', () => createApplicantCard('', true));
    submitBtnEl.addEventListener('click', handleSubmit);
    applicantCardListEl.addEventListener('change', calculateTotal);
    contactNameEl.addEventListener('input', syncNameToFirstCard);
    
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

// --- 核心功能 ---
function updateMode() {
    const isMultiMode = modeMultiEl.checked;
    addApplicantBtnEl.style.display = isMultiMode ? 'block' : 'none';
    const cards = applicantCardListEl.querySelectorAll('.applicant-card');
    const defaultName = (userData && userData.displayName) ? userData.displayName : '';

    if (isMultiMode) {
        if (cards.length === 0) {
            createApplicantCard(defaultName, false);
        }
    } else {
        cards.forEach((card, index) => {
            if (index > 0) card.remove();
        });
        if (cards.length === 0) {
            createApplicantCard(defaultName, false);
        } else {
            cards[0].querySelector('.card-summary-name').textContent = defaultName || '報名者本人';
            const removeBtn = cards[0].querySelector('.remove-btn');
            if (removeBtn) removeBtn.style.display = 'none';
        }
    }
    syncNameToFirstCard();
    calculateTotal();
}

/**
 * 建立報名人卡片
 */
function createApplicantCard(name = '', canRemove = true) {
    const cardId = `card-${Date.now()}`;
    const card = document.createElement('div');
    card.className = 'applicant-card';
    card.id = cardId;
    card.setAttribute('data-open', 'true');

    let prefillName = name || '';
    
    card.innerHTML = `
        <div class="card-summary">
            <span class="card-summary-name">${prefillName || '報名者本人'}</span>
            <span class="card-summary-info">共 0 斗</span>
        </div>
        
        <div class="applicant-details">
            <div class="form-group">
                <label for="name-${cardId}">報名者姓名</label>
                <input type="text" id="name-${cardId}" class="input-field card-input-name" value="${prefillName}" placeholder="請填寫報名者姓名">
            </div>
            
            <div class="form-group">
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
            </div>
            
            <div class="form-group">
                <label style="display: block; margin-bottom: 8px;">生辰 (國曆)</label>
                <div style="display: flex; gap: 3px; align-items: center;">
                    <input type="text" id="bazi-year-${cardId}" class="input-field" placeholder="____" maxlength="4" style="width: 52px; height: 55px; text-align: center; font-size: 1rem; padding: 12px 4px;">
                    <span style="font-size: 1rem;">年</span>
                    <input type="text" id="bazi-month-${cardId}" class="input-field" placeholder="__" maxlength="2" style="width: 34px; height: 55px; text-align: center; font-size: 1rem; padding: 12px 4px;">
                    <span style="font-size: 1rem;">月</span>
                    <input type="text" id="bazi-day-${cardId}" class="input-field" placeholder="__" maxlength="2" style="width: 34px; height: 55px; text-align: center; font-size: 1rem; padding: 12px 4px;">
                    <span style="font-size: 1rem;">日</span>
                    <div style="position: relative; display: inline-block;">
                        <input type="date" id="bazi-${cardId}" style="position: absolute; opacity: 0; width: 1px; height: 1px; pointer-events: none;">
                        <button type="button" id="bazi-btn-${cardId}" style="background: var(--primary-gold); color: white; border: none; border-radius: 4px; padding: 14px 12px; cursor: pointer; font-size: 1.1em; height: 55px;" title="點擊選擇日期">🗓️</button>
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
            </div>
            
            <div class="form-group">
                <div class="shengxiao-time-grid">
                    <div>
                        <label for="shengxiao-${cardId}" style="display: block; margin-bottom: 8px;">生肖</label>
                        <input type="text" id="shengxiao-${cardId}" class="input-field shengxiao-field" readonly placeholder="選擇日期後自動顯示" style="background-color: #f5f5f5; cursor: not-allowed; width: 100%; height: 55px; font-size: 1rem;">
                    </div>
                    <div>
                        <label for="time-${cardId}" style="display: block; margin-bottom: 8px;">時辰</label>
                        <select id="time-${cardId}" class="input-field" style="width: 100%; height: 55px; font-size: 1rem;">
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
            </div>

            <div class="form-group" style="margin-top: 20px;">
                <label style="font-weight: bold;">禮斗項目選擇 (可複選)</label>
                
                <div style="margin-top: 10px;">
                    <label class="checkbox-label">
                        <input type="checkbox" id="heJia-${cardId}" class="dou-checkbox" data-dou-name="闔家斗">
                        <span>闔家斗</span>
                    </label>
                </div>
                
                <div style="margin-top: 8px;">
                    <label class="checkbox-label">
                        <input type="checkbox" id="yuanChen-${cardId}" class="dou-checkbox" data-dou-name="元辰斗">
                        <span>元辰斗</span>
                    </label>
                </div>
                
                <div style="margin-top: 8px;">
                    <label class="checkbox-label">
                        <input type="checkbox" id="shiYe-${cardId}" class="dou-checkbox business-dou" data-dou-name="事業斗">
                        <span>事業斗</span>
                    </label>
                </div>

                <div id="businessFields-${cardId}" class="business-fields" style="display:none; margin-top: 15px; padding-left: 20px; border-left: 3px solid var(--primary-gold);">
                    <div class="form-group">
                        <label for="businessName-${cardId}">抬頭名稱/公司行號</label>
                        <input type="text" id="businessName-${cardId}" class="input-field">
                    </div>
                    <div class="form-group">
                        <label for="businessAddress-${cardId}">所在地址</label>
                        <input type="text" id="businessAddress-${cardId}" class="input-field">
                    </div>
                </div>
            </div>

            ${canRemove ? `<button class="remove-btn" data-card-id="${cardId}">移除此人</button>` : ''}
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

    // 監聽事業禮斗複選框
    card.querySelector('.business-dou').addEventListener('change', (e) => {
        const businessFields = document.getElementById(`businessFields-${cardId}`);
        businessFields.style.display = e.target.checked ? 'block' : 'none';
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

/**
 * 計算總斗數與總金額
 */
function calculateTotal() {
    let totalDous = 0;
    const cards = applicantCardListEl.querySelectorAll('.applicant-card');

    cards.forEach(card => {
        let dousInCard = 0;
        const douDetails = [];
        const checkboxes = card.querySelectorAll('.dou-checkbox:checked');
        
        checkboxes.forEach(checkbox => {
            douDetails.push(checkbox.dataset.douName);
        });
        
        dousInCard = checkboxes.length;
        
        // 更新卡片摘要資訊
        const name = card.querySelector('.card-input-name').value.trim() || '未填寫';
        const birthDate = card.querySelector('input[type="date"]').value || '';
        const douInfo = douDetails.length > 0 ? douDetails.join('、') : '無';
        
        card.querySelector('.card-summary-info').innerHTML = `
            <small style="display:block; margin:2px 0;">生辰: ${birthDate || '未填寫'}</small>
            <small style="display:block; margin:2px 0;">禮斗: ${douInfo}</small>
        `;
        
        totalDous += dousInCard;
    });

    const totalAmount = totalDous * DOU_PRICE;
    totalDousEl.textContent = `${totalDous} 斗`;
    totalAmountEl.textContent = `NT$ ${totalAmount.toLocaleString()}`;
}

/**
 * 處理表單送出
 */
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
        
        const receiptOption = document.querySelector('input[name="receiptOption"]:checked').value;
        if (receiptOption === 'send' && !contactAddressEl.value.trim()) {
            showError(contactAddressEl, '選擇寄發感謝狀時，通訊地址為必填');
            submitBtnEl.disabled = false;
            submitBtnEl.textContent = '確認報名並送出';
            return;
        }
        
        // 2. 收集聯絡人資訊
        const contactInfo = {
            name: contactNameEl.value.trim(),
            phone: contactPhoneEl.value.trim(),
            email: contactEmailEl.value.trim(),
            address: contactAddressEl.value.trim(),
            receiptOption: receiptOption
        };

        // 3. 驗證並收集斗主名單
        const applicants = [];
        const cards = applicantCardListEl.querySelectorAll('.applicant-card');
        
        if (cards.length === 0) {
            alert('請至少新增一位報名者');
            submitBtnEl.disabled = false;
            submitBtnEl.textContent = '確認報名並送出';
            return;
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
                submitBtnEl.disabled = false;
                submitBtnEl.textContent = '確認報名並送出';
                return;
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
                submitBtnEl.disabled = false;
                submitBtnEl.textContent = '確認報名並送出';
                return;
            }
            
            // 驗證日期格式
            if (year.length !== 4 || isNaN(year)) {
                showError(yearInput, `${cardName} 的生辰年份格式不正確（需4位數字）`);
                card.querySelector('.applicant-details').style.display = 'block';
                card.setAttribute('data-open', 'true');
                submitBtnEl.disabled = false;
                submitBtnEl.textContent = '確認報名並送出';
                return;
            }
            
            const monthNum = parseInt(month, 10);
            if (monthNum < 1 || monthNum > 12) {
                showError(monthInput, `${cardName} 的生辰月份必須在 1-12 之間`);
                card.querySelector('.applicant-details').style.display = 'block';
                card.setAttribute('data-open', 'true');
                submitBtnEl.disabled = false;
                submitBtnEl.textContent = '確認報名並送出';
                return;
            }
            
            const dayNum = parseInt(day, 10);
            if (dayNum < 1 || dayNum > 31) {
                showError(dayInput, `${cardName} 的生辰日期必須在 1-31 之間`);
                card.querySelector('.applicant-details').style.display = 'block';
                card.setAttribute('data-open', 'true');
                submitBtnEl.disabled = false;
                submitBtnEl.textContent = '確認報名並送出';
                return;
            }
        }
        
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
                douTypes: {},
                businessInfo: null
            };
            
            // 儲存斗別
            card.querySelectorAll('.dou-checkbox').forEach(checkbox => {
                cardData.douTypes[checkbox.dataset.douName] = checkbox.checked;
            });

            // 如果勾選了事業斗，儲存額外資訊
            if (cardData.douTypes['事業禮斗']) {
                cardData.businessInfo = {
                    title: card.querySelector('[id^="businessName-"]').value.trim(),
                    address: card.querySelector('[id^="businessAddress-"]').value.trim()
                };
            }
            
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
        
        // 5. 取得 ID Token（使用 Platform Auth 進行跨專案認證）
        const idToken = await platformAuth.currentUser.getIdToken();
        
        // 6. 呼叫後端 API
        console.log("正在呼叫後端 submitRegistration...");
        
        const response = await fetch('https://asia-east2-service-b9d4a.cloudfunctions.net/submitRegistration', {
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

        const result = await response.json();
        
        if (result.result && result.result.success) {
            console.log("後端回傳結果:", result);
            alert(`報名成功！\n您的訂單編號為: ${result.result.orderId}\n我們將在核對資料後盡快為您處理。`);
            window.location.reload();
        } else {
            throw new Error(result.error?.message || '提交失敗');
        }
        
    } catch (error) {
        console.error("報名失敗:", error);
        alert(`報名失敗：${error.message}`);
    } finally {
        submitBtnEl.disabled = false;
        submitBtnEl.textContent = '確認報名並送出';
    }
}
