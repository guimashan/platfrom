// -----------------------------------------
// 龜馬山 goLine - 年斗法會 (niandou.js)
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
const SERVICE_TYPE = "niandou";
const DOU_PRICE = 36000;
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
    addApplicantBtnEl.addEventListener('click', () => createApplicantCard(null, true));
    submitBtnEl.addEventListener('click', handleSubmit);
    applicantCardListEl.addEventListener('change', calculateTotal);
    contactNameEl.addEventListener('input', syncNameToSingleCard);
}

// --- 同步姓名 ---
function syncNameToSingleCard() {
    if (modeSingleEl.checked) {
        const firstCard = applicantCardListEl.querySelector('.applicant-card');
        if (firstCard) {
            const newName = contactNameEl.value.trim();
            const displayName = newName || '報名者本人';
            firstCard.querySelector('.card-summary-name').textContent = displayName;
            firstCard.querySelector('.card-input-name').value = newName;
        }
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
    syncNameToSingleCard();
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
            </div>
            
            <div class="form-group">
                <label for="shengxiao-${cardId}">生肖</label>
                <select id="shengxiao-${cardId}" class="input-field">
                    <option value="">請選擇生肖</option>
                    <option value="鼠">鼠</option>
                    <option value="牛">牛</option>
                    <option value="虎">虎</option>
                    <option value="兔">兔</option>
                    <option value="龍">龍</option>
                    <option value="蛇">蛇</option>
                    <option value="馬">馬</option>
                    <option value="羊">羊</option>
                    <option value="猴">猴</option>
                    <option value="雞">雞</option>
                    <option value="狗">狗</option>
                    <option value="豬">豬</option>
                </select>
            </div>
            
            <div class="form-group">
                <label for="time-${cardId}">時辰</label>
                <select id="time-${cardId}" class="input-field">
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

            <div class="form-group" style="margin-top: 20px;">
                <label style="font-weight: bold;">年斗項目選擇 (可複選)</label>
                
                <div style="margin-top: 10px;">
                    <label class="checkbox-label">
                        <input type="checkbox" id="heJia-${cardId}" class="dou-checkbox" data-dou-name="闔家年斗">
                        <span>闔家年斗</span>
                    </label>
                </div>
                
                <div style="margin-top: 8px;">
                    <label class="checkbox-label">
                        <input type="checkbox" id="yuanChen-${cardId}" class="dou-checkbox" data-dou-name="元辰年斗">
                        <span>元辰年斗</span>
                    </label>
                </div>
                
                <div style="margin-top: 8px;">
                    <label class="checkbox-label">
                        <input type="checkbox" id="ziWei-${cardId}" class="dou-checkbox" data-dou-name="紫微年斗">
                        <span>紫微年斗</span>
                    </label>
                </div>
                
                <div style="margin-top: 8px;">
                    <label class="checkbox-label">
                        <input type="checkbox" id="shiYe-${cardId}" class="dou-checkbox business-dou" data-dou-name="事業年斗">
                        <span>事業年斗</span>
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

            ${canRemove ? `<button class="btn-remove" data-card-id="${cardId}">移除此人</button>` : ''}
        </div>
    `;

    applicantCardListEl.appendChild(card);

    // 綁定事件
    if (canRemove) {
        card.querySelector('.btn-remove').addEventListener('click', () => {
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
    });

    // 監聽事業年斗複選框
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
        } else {
            yearInput.value = '';
            monthInput.value = '';
            dayInput.value = '';
        }
    });
    
    // 同步生辰輸入：手動輸入 → 日期選擇器
    const syncManualToDate = () => {
        const year = yearInput.value.trim();
        const month = monthInput.value.trim();
        const day = dayInput.value.trim();
        
        if (!year && !month && !day) {
            dateInput.value = '';
            return;
        }
        
        if (year.length === 4 && month && day) {
            const paddedMonth = month.padStart(2, '0');
            const paddedDay = day.padStart(2, '0');
            dateInput.value = `${year}-${paddedMonth}-${paddedDay}`;
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
            <small style="display:block; margin:2px 0;">年斗: ${douInfo}</small>
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
    
    submitBtnEl.disabled = true;
    submitBtnEl.textContent = '處理中...';

    try {
        // 1. 驗證聯絡資訊
        if (!contactNameEl.value.trim()) {
            alert('請填寫報名姓名');
            contactNameEl.focus();
            submitBtnEl.disabled = false;
            submitBtnEl.textContent = '確認報名並送出';
            return;
        }
        
        if (!contactPhoneEl.value.trim()) {
            alert('請填寫連絡電話');
            contactPhoneEl.focus();
            submitBtnEl.disabled = false;
            submitBtnEl.textContent = '確認報名並送出';
            return;
        }
        
        const receiptOption = document.querySelector('input[name="receiptOption"]:checked').value;
        if (receiptOption === 'send' && !contactAddressEl.value.trim()) {
            alert('選擇寄發感謝狀時，通訊地址為必填');
            contactAddressEl.focus();
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

        // 3. 收集斗主名單
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
                douTypes: {},
                businessInfo: null
            };
            
            // 儲存斗別
            card.querySelectorAll('.dou-checkbox').forEach(checkbox => {
                cardData.douTypes[checkbox.dataset.douName] = checkbox.checked;
            });

            // 如果勾選了事業斗，儲存額外資訊
            if (cardData.douTypes['事業年斗']) {
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
        
        // 5. 取得 ID Token
        const idToken = await currentUser.getIdToken();
        
        // 6. 呼叫 V2 API
        console.log("正在呼叫後端 submitRegistrationV2...");
        
        const response = await fetch('https://submitregistrationv2-me62t36jia-df.a.run.app', {
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
