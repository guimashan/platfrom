// -----------------------------------------
// 龜馬山 goLine - 線上點燈 (lightup.js)
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
const SERVICE_TYPE = "lightup";
const LAMP_PRICE = 700;
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
const totalLampsEl = document.getElementById('totalLamps');
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
    addApplicantBtnEl.addEventListener('click', () => createApplicantCard(null, true));
    submitBtnEl.addEventListener('click', handleSubmit);
    applicantCardListEl.addEventListener('input', calculateTotal);

    // --- 新增：即時同步「報名姓名」 ---
    contactNameEl.addEventListener('input', syncNameToSingleCard);
    
    // 信用卡欄位格式化
    cardNumberEl.addEventListener('input', formatCardNumber);
    cardExpiryEl.addEventListener('input', formatCardExpiry);
    cardCVVEl.addEventListener('input', formatCardCVV);
}

// --- 新增：即時同步的函數 ---
/**
 * 即時同步「報名姓名」到「單人模式」的第一張卡片
 */
function syncNameToSingleCard() {
    // 只有在「單人模式」 下才同步
    if (modeSingleEl.checked) {
        const firstCard = applicantCardListEl.querySelector('.applicant-card');
        if (firstCard) {
            const newName = contactNameEl.value.trim();
            const displayName = newName || '報名者本人';
            
            // 同步卡片標題
            firstCard.querySelector('.card-summary-name').textContent = displayName;
            // 同步卡片內的 input 欄位
            firstCard.querySelector('.card-input-name').value = newName;
        }
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
    syncNameToSingleCard();
    calculateTotal();
}

function createApplicantCard(name = '家人/親友', canRemove = true) {
    const cardId = `card-${Date.now()}`;
    const card = document.createElement('div');
    card.className = 'applicant-card';
    card.id = cardId;
    card.setAttribute('data-open', 'true');

    // 預填姓名
    let prefillName = name;
    // 如果 name 是 "報名者本人"，就從已填入的 contactNameEl 抓取
    if (name === '報名者本人') {
        prefillName = contactNameEl.value.trim();
    } else if (name === '家人/親友') {
        prefillName = ''; // 新增卡片時，姓名留空
    }

    card.innerHTML = `
        <div class="card-summary">
            <span class="card-summary-name">${prefillName || '報名者本人'}</span>
            <span class="card-summary-info">共 0 盞燈</span>
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
            
            <label for="bazi-${cardId}">生辰 (國曆)</label>
            <div style="display: flex; gap: 8px; align-items: center;">
                <input type="text" id="bazi-text-${cardId}" class="input-field" placeholder="____年__月__日" style="flex: 1;">
                <input type="date" id="bazi-${cardId}" class="input-field" style="width: 40px; opacity: 0.7; cursor: pointer;" title="點擊選擇日期">
            </div>
            
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
            
            <div class="light-item">
                <label>安太歲</label>
                <input type="number" class="input-field light-count" data-light-name="安太歲" value="0" min="0">
            </div>
            <div class="light-item">
                <label>元辰燈</label>
                <input type="number" class="input-field light-count" data-light-name="元辰燈" value="0" min="0">
            </div>
            <div class="light-item">
                <label>文昌燈</label>
                <input type="number" class="input-field light-count" data-light-name="文昌燈" value="0" min="0">
            </div>
            <div class="light-item">
                <label>財利燈</label>
                <input type="number" class="input-field light-count" data-light-name="財利燈" value="0" min="0">
            </div>
            <div class="light-item">
                <label>光明燈</label>
                <input type="number" class="input-field light-count" data-light-name="光明燈" value="0" min="0">
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
    });
    
    // 同步生辰輸入：日期選擇器 → 手動輸入
    const dateInput = card.querySelector(`#bazi-${cardId}`);
    const textInput = card.querySelector(`#bazi-text-${cardId}`);
    
    dateInput.addEventListener('change', (e) => {
        if (e.target.value) {
            const [year, month, day] = e.target.value.split('-');
            textInput.value = `${year}年${month}月${day}日`;
        } else {
            textInput.value = '';
        }
    });
    
    // 同步生辰輸入：手動輸入 → 日期選擇器
    textInput.addEventListener('blur', (e) => {
        const value = e.target.value.trim();
        if (!value) {
            dateInput.value = '';
            return;
        }
        const match = value.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
        if (match) {
            const [, year, month, day] = match;
            const paddedMonth = month.padStart(2, '0');
            const paddedDay = day.padStart(2, '0');
            dateInput.value = `${year}-${paddedMonth}-${paddedDay}`;
        } else {
            // 格式不正確時清空兩個欄位
            dateInput.value = '';
            textInput.value = '';
        }
    });
}

function calculateTotal() {
    let totalLamps = 0;
    const cards = applicantCardListEl.querySelectorAll('.applicant-card');
    cards.forEach(card => {
        let lampsInCard = 0;
        const lampDetails = [];
        const counts = card.querySelectorAll('.light-count');
        counts.forEach(input => {
            const count = parseInt(input.value, 10) || 0;
            if (count < 0) input.value = 0;
            if (count > 0) {
                const label = input.closest('.form-group').querySelector('label').textContent;
                lampDetails.push(`${label} x ${count}`);
            }
            lampsInCard += count;
        });
        
        // 更新卡片摘要資訊
        const name = card.querySelector('.card-input-name').value.trim() || '未填寫';
        const birthDate = card.querySelector('input[type="date"]').value || '';
        const lampInfo = lampDetails.length > 0 ? lampDetails.join('、') : '無';
        
        card.querySelector('.card-summary-info').innerHTML = `
            <small style="display:block; margin:2px 0;">生辰: ${birthDate || '未填寫'}</small>
            <small style="display:block; margin:2px 0;">點燈: ${lampInfo}</small>
        `;
        
        totalLamps += lampsInCard;
    });
    const totalAmount = totalLamps * LAMP_PRICE;
    totalLampsEl.textContent = `${totalLamps} 盞`;
    totalAmountEl.textContent = `NT$ ${totalAmount.toLocaleString()}`;
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
    // 聯絡資訊驗證
    if (!contactNameEl.value.trim()) {
        alert('請填寫報名姓名');
        contactNameEl.focus();
        return false;
    }
    if (!contactPhoneEl.value.trim()) {
        alert('請填寫聯絡電話');
        contactPhoneEl.focus();
        return false;
    }
    
    // 感謝狀寄發時，地址必填
    const receiptOption = document.querySelector('input[name="receiptOption"]:checked').value;
    if (receiptOption === 'send' && !contactAddressEl.value.trim()) {
        alert('選擇寄發感謝狀時，通訊地址為必填');
        contactAddressEl.focus();
        return false;
    }

    // 報名者驗證
    const cards = applicantCardListEl.querySelectorAll('.applicant-card');
    if (cards.length === 0) {
        alert('請至少新增一位報名者');
        return false;
    }

    let hasLamps = false;
    for (const card of cards) {
        const nameInput = card.querySelector('.card-input-name');
        if (!nameInput.value.trim()) {
            alert('請填寫所有報名者的姓名');
            nameInput.focus();
            return false;
        }

        const counts = card.querySelectorAll('.light-count');
        for (const input of counts) {
            if (parseInt(input.value, 10) > 0) {
                hasLamps = true;
                break;
            }
        }
    }

    if (!hasLamps) {
        alert('請至少選擇一盞燈');
        return false;
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
                lights: {}
            };
            card.querySelectorAll('.light-count').forEach(input => {
                const count = parseInt(input.value, 10) || 0;
                if (count > 0) {
                    cardData.lights[input.dataset.lightName] = count;
                }
            });
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
        const functionUrl = 'https://asia-east2-service-b9d4a.cloudfunctions.net/submitRegistrationV2';
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
