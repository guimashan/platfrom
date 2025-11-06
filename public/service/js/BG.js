// -----------------------------------------
// 龜馬山 goLine - 建宮廟款 (BG.js)
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
const SERVICE_TYPE = "bg";
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
    applicantCardListEl.addEventListener('input', calculateTotal);
    contactNameEl.addEventListener('input', syncNameToFirstCard);
    
    // 自動清除錯誤提示
    contactNameEl.addEventListener('input', () => clearError(contactNameEl));
    contactPhoneEl.addEventListener('input', () => clearError(contactPhoneEl));
    contactAddressEl.addEventListener('input', () => clearError(contactAddressEl));
    
    // 信用卡格式化
    cardNumberEl.addEventListener('input', formatCardNumber);
    cardExpiryEl.addEventListener('input', formatCardExpiry);
    cardCVVEl.addEventListener('input', formatCardCVV);
}

// --- 雙向同步姓名 ---
function syncNameToFirstCard() {
    const firstCard = applicantCardListEl.querySelector('.applicant-card');
    if (firstCard) {
        const newName = contactNameEl.value.trim();
        const displayName = newName || '捐款者本人';
        firstCard.querySelector('.card-summary-name').textContent = displayName;
        firstCard.querySelector('.card-input-name').value = newName;
    }
}

function syncFirstCardToName(card) {
    const cards = applicantCardListEl.querySelectorAll('.applicant-card');
    const isFirstCard = cards[0] === card;
    if (isFirstCard) {
        const cardName = card.querySelector('.card-input-name').value.trim();
        contactNameEl.value = cardName;
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
            cards[0].querySelector('.card-summary-name').textContent = defaultName || '捐款者本人';
            const removeBtn = cards[0].querySelector('.remove-btn');
            if (removeBtn) removeBtn.style.display = 'none';
        }
    }
    syncNameToFirstCard();
    calculateTotal();
}

function createApplicantCard(name = '', canRemove = true) {
    const cardId = `card-${Date.now()}`;
    const card = document.createElement('div');
    card.className = 'applicant-card';
    card.id = cardId;
    card.setAttribute('data-open', 'true');

    let prefillName = name || '';
    
    card.innerHTML = `
        <div class="card-summary">
            <span class="card-summary-name">${prefillName || '捐款者本人'}</span>
            <span class="card-summary-info">捐款金額：NT$ 0</span>
        </div>
        
        <div class="applicant-details">
            <div class="form-group">
                <label for="name-${cardId}">捐款者姓名</label>
                <input type="text" id="name-${cardId}" class="input-field card-input-name" value="${prefillName}" placeholder="請填寫捐款者姓名">
            </div>
            
            <div class="form-group">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <label for="qingshiban-${cardId}" style="min-width: 180px; margin-bottom: 0;">青石板（$2,000 / 塊）</label>
                    <input type="number" id="qingshiban-${cardId}" class="input-field donation-item" data-price="2000" min="0" placeholder="0" style="flex: 1; text-align: center;">
                    <span style="color: #666; white-space: nowrap;">塊</span>
                </div>
            </div>
            
            <div class="form-group">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <label for="gangjin-${cardId}" style="min-width: 180px; margin-bottom: 0;">鋼筋（$3,000 / 公斤）</label>
                    <input type="number" id="gangjin-${cardId}" class="input-field donation-item" data-price="3000" min="0" placeholder="0" style="flex: 1; text-align: center;">
                    <span style="color: #666; white-space: nowrap;">公斤</span>
                </div>
            </div>
            
            <div class="form-group">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <label for="shuini-${cardId}" style="min-width: 180px; margin-bottom: 0;">水泥（$300 / 包）</label>
                    <input type="number" id="shuini-${cardId}" class="input-field donation-item" data-price="300" min="0" placeholder="0" style="flex: 1; text-align: center;">
                    <span style="color: #666; white-space: nowrap;">包</span>
                </div>
            </div>
            
            <div class="form-group">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <label for="liuliwa-${cardId}" style="min-width: 180px; margin-bottom: 0;">琉璃瓦（$300 / 塊）</label>
                    <input type="number" id="liuliwa-${cardId}" class="input-field donation-item" data-price="300" min="0" placeholder="0" style="flex: 1; text-align: center;">
                    <span style="color: #666; white-space: nowrap;">塊</span>
                </div>
            </div>
            
            <div class="form-group">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <label for="other-${cardId}" style="min-width: 180px; margin-bottom: 0;">其他</label>
                    <span style="color: #666; white-space: nowrap;">NT$</span>
                    <input type="number" id="other-${cardId}" class="input-field donation-item" data-price="1" min="0" step="100" placeholder="0" style="flex: 1; text-align: center;">
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
}

// --- 計算總金額 ---
function calculateTotal() {
    let totalAmount = 0;
    const cards = applicantCardListEl.querySelectorAll('.applicant-card');

    cards.forEach(card => {
        const donationItems = card.querySelectorAll('.donation-item');
        let cardTotal = 0;
        
        donationItems.forEach(input => {
            const quantity = parseInt(input.value) || 0;
            const price = parseInt(input.getAttribute('data-price')) || 0;
            if (quantity < 0) input.value = 0;
            cardTotal += quantity * price;
        });
        
        // 更新卡片摘要資訊
        card.querySelector('.card-summary-info').textContent = `捐款金額：NT$ ${cardTotal.toLocaleString()}`;
        
        totalAmount += cardTotal;
    });

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
            submitBtnEl.textContent = '確認捐款並送出';
            return;
        }
        
        const phoneValue = contactPhoneEl.value.trim();
        if (!phoneValue) {
            showError(contactPhoneEl, '請填寫聯絡電話');
            submitBtnEl.disabled = false;
            submitBtnEl.textContent = '確認捐款並送出';
            return;
        }
        if (!/^09\d{8}$/.test(phoneValue)) {
            showError(contactPhoneEl, '電話號碼格式不正確（應為 10 碼，例如：0912345678）');
            submitBtnEl.disabled = false;
            submitBtnEl.textContent = '確認捐款並送出';
            return;
        }
        
        const receiptOption = document.querySelector('input[name="receiptOption"]:checked').value;
        if (receiptOption === 'send' && !contactAddressEl.value.trim()) {
            showError(contactAddressEl, '選擇寄發感謝狀時，通訊地址為必填');
            submitBtnEl.disabled = false;
            submitBtnEl.textContent = '確認捐款並送出';
            return;
        }
        
        // 2. 驗證捐款者與金額
        const cards = applicantCardListEl.querySelectorAll('.applicant-card');
        if (cards.length === 0) {
            alert('請至少新增一位捐款者');
            submitBtnEl.disabled = false;
            submitBtnEl.textContent = '確認捐款並送出';
            return;
        }

        let hasAmount = false;
        for (const card of cards) {
            const nameInput = card.querySelector('.card-input-name');
            if (!nameInput.value.trim()) {
                showError(nameInput, '請填寫捐款者姓名');
                submitBtnEl.disabled = false;
                submitBtnEl.textContent = '確認捐款並送出';
                return;
            }

            const donationItems = card.querySelectorAll('.donation-item');
            for (const input of donationItems) {
                if (parseInt(input.value) > 0) {
                    hasAmount = true;
                    break;
                }
            }
        }

        if (!hasAmount) {
            alert('請至少填寫一項捐款項目');
            submitBtnEl.disabled = false;
            submitBtnEl.textContent = '確認捐款並送出';
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
            submitBtnEl.textContent = '確認捐款並送出';
            return;
        }

        if (cardNumber.length !== 16) {
            alert('請輸入有效的 16 碼信用卡號');
            cardNumberEl.focus();
            submitBtnEl.disabled = false;
            submitBtnEl.textContent = '確認捐款並送出';
            return;
        }

        if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) {
            alert('請輸入有效的有效期限（格式：MM/YY）');
            cardExpiryEl.focus();
            submitBtnEl.disabled = false;
            submitBtnEl.textContent = '確認捐款並送出';
            return;
        }

        const [month, year] = cardExpiry.split('/').map(Number);
        const now = new Date();
        const expiry = new Date(2000 + year, month - 1);
        if (expiry < now) {
            alert('此信用卡已過期');
            cardExpiryEl.focus();
            submitBtnEl.disabled = false;
            submitBtnEl.textContent = '確認捐款並送出';
            return;
        }

        if (cardCVV.length !== 3) {
            alert('請輸入有效的 3 碼 CVV');
            cardCVVEl.focus();
            submitBtnEl.disabled = false;
            submitBtnEl.textContent = '確認捐款並送出';
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

        const applicants = [];
        cards.forEach(card => {
            const donationItems = card.querySelectorAll('.donation-item');
            const qingshiban = parseInt(donationItems[0].value) || 0;
            const gangjin = parseInt(donationItems[1].value) || 0;
            const shuini = parseInt(donationItems[2].value) || 0;
            const liuliwa = parseInt(donationItems[3].value) || 0;
            const other = parseInt(donationItems[4].value) || 0;

            applicants.push({
                applicantName: card.querySelector('.card-input-name').value.trim(),
                donationItems: {
                    qingshiban: qingshiban,
                    gangjin: gangjin,
                    shuini: shuini,
                    liuliwa: liuliwa,
                    other: other
                }
            });
        });

        const paymentInfo = {
            cardHolderName: cardHolderNameEl.value.trim(),
            cardNumber: cardNumberEl.value.trim(),
            cardExpiry: cardExpiryEl.value.trim(),
            cardCVV: cardCVVEl.value.trim(),
        };

        const otherNote = otherNoteEl.value.trim();
        const totalAmount = parseInt(totalAmountEl.textContent.replace('NT$ ', '').replace(/,/g, ''), 10);
        
        // 5. 呼叫 Cloud Function
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
        
        // 跳轉到訂單確認頁面
        window.location.href = `success.html?orderId=${result.result.orderId}&service=${SERVICE_TYPE}`;

    } catch (error) {
        console.error("捐款失敗:", error);
        alert(`捐款失敗: ${error.message}`);
        submitBtnEl.disabled = false;
        submitBtnEl.textContent = '確認捐款並送出';
    }
}
