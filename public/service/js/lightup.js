// -----------------------------------------
// 龜馬山 goLine - 線上點燈 (lightup.js)
// (修正版：適配 firebase-init.js)
// -----------------------------------------

// --- 修正：從 firebase-init.js 匯入需要的實例 ---
// 我們需要：
// 1. serviceDb (用於寫入 "神務服務" 的訂單)
// 2. platformAuth (用於檢查使用者是否登入)
// 3. platformDb (用於讀取登入者的資料)
import { 
    serviceDb, 
    platformAuth, 
    platformDb 
} from '../../js/firebase-init.js';

import { 
    collection,
    doc,
    getDoc
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// --- 全域變數 ---
const SERVICE_TYPE = "lightup";
const LAMP_PRICE = 700;
let currentUser = null; 
let userData = null;

// --- DOM 元素 (與前一版相同) ---
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
        } else {
            alert("請先登入！");
            window.location.href = '/index.html';
        }
    });

    setupEventListeners();
    updateMode();
});

// --- 事件監聽 (與前一版相同) ---
function setupEventListeners() {
    modeSingleEl.addEventListener('change', updateMode);
    modeMultiEl.addEventListener('change', updateMode);
    addApplicantBtnEl.addEventListener('click', () => createApplicantCard(null, false));
    submitBtnEl.addEventListener('click', handleSubmit);
    applicantCardListEl.addEventListener('input', calculateTotal);
}

// --- 核心功能 (與前一版相同) ---

function updateMode() {
    const isMultiMode = modeMultiEl.checked;
    addApplicantBtnEl.style.display = isMultiMode ? 'block' : 'none';
    const cards = applicantCardListEl.querySelectorAll('.applicant-card');
    
    if (isMultiMode) {
        if (cards.length === 0) {
            const defaultName = (userData && userData.displayName) ? userData.displayName : '報名者本人';
            createApplicantCard(defaultName, false);
        }
    } else {
        cards.forEach((card, index) => {
            if (index > 0) card.remove();
        });
        
        const defaultName = (userData && userData.displayName) ? userData.displayName : '報名者本人';
        if (cards.length === 0) {
            createApplicantCard(defaultName, false);
        } else {
            cards[0].querySelector('.card-summary-name').textContent = defaultName;
            const removeBtn = cards[0].querySelector('.remove-btn');
            if (removeBtn) removeBtn.style.display = 'none';
        }
    }
    calculateTotal();
}

function createApplicantCard(name = '家人/親友', canRemove = true) {
    const cardId = `card-${Date.now()}`;
    const card = document.createElement('div');
    card.className = 'applicant-card';
    card.id = cardId;
    card.setAttribute('data-open', 'true');

    let prefillName = name;
    if (userData && name === userData.displayName) {
        prefillName = userData.displayName;
    } else if (name === '家人/親友') {
        prefillName = '';
    }

    card.innerHTML = `
        <div class="card-summary">
            <span class="card-summary-name">${name}</span>
            <span class="card-summary-info">共 0 盞燈</span>
        </div>
        <div class="applicant-details">
            <label for="name-${cardId}">點燈人姓名</label>
            <input type="text" id="name-${cardId}" class="input-field card-input-name" value="${prefillName}" placeholder="請填寫點燈人姓名">
            <label for="bazi-${cardId}">生辰 (國曆)</label>
            <input type="date" id="bazi-${cardId}" class="input-field">
            
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
}

function calculateTotal() {
    let totalLamps = 0;
    const cards = applicantCardListEl.querySelectorAll('.applicant-card');
    cards.forEach(card => {
        let lampsInCard = 0;
        const counts = card.querySelectorAll('.light-count');
        counts.forEach(input => {
            const count = parseInt(input.value, 10) || 0;
            if (count < 0) input.value = 0;
            lampsInCard += count;
        });
        card.querySelector('.card-summary-info').textContent = `共 ${lampsInCard} 盞燈`;
        totalLamps += lampsInCard;
    });
    const totalAmount = totalLamps * LAMP_PRICE;
    totalLampsEl.textContent = `${totalLamps} 盞`;
    totalAmountEl.textContent = `NT$ ${totalAmount.toLocaleString()}`;
}

async function handleSubmit() {
    if (!currentUser) {
        alert("您似乎尚未登入，請重新整理頁面。");
        return;
    }
    
    submitBtnEl.disabled = true;
    submitBtnEl.textContent = '處理中...';

    try {
        const contactInfo = {
            name: contactNameEl.value.trim(),
            phone: contactPhoneEl.value.trim(),
            email: contactEmailEl.value.trim(),
            address: contactAddressEl.value.trim(),
            receiptOption: document.querySelector('input[name="receiptOption"]:checked').value
        };

        const applicants = [];
        const cards = applicantCardListEl.querySelectorAll('.applicant-card');
        
        cards.forEach(card => {
            const cardData = {
                applicantName: card.querySelector('.card-input-name').value.trim(),
                bazi: card.querySelector('input[type="date"]').value,
                lights: {}
            };
            card.querySelectorAll('.light-count').forEach(input => {
                cardData.lights[input.dataset.lightName] = parseInt(input.value, 10) || 0;
            });
            applicants.push(cardData);
        });

        const paymentInfo = {
            cardHolderName: cardHolderNameEl.value.trim(),
            cardNumber: cardNumberEl.value.trim(),
            cardExpiry: cardExpiryEl.value.trim(),
            cardCVV: cardCVVEl.value.trim(),
        };

        const otherNote = otherNoteEl.value.trim();
        const totalAmount = parseInt(totalAmountEl.textContent.replace('NT$ ', '').replace(',', ''), 10);
        
        console.log("表單打包完成:", {
            serviceType: SERVICE_TYPE,
            contactInfo,
            applicants,
            paymentInfo,
            otherNote,
            totalAmount,
            userId: currentUser.uid
        });
        
        alert("報名成功！(此為測試訊息)\n我們將在下一步建立後端來處理這些資料。");

    } catch (error) {
        console.error("報名失敗:", error);
        alert(`報名失敗：${error.message}`);
    } finally {
        submitBtnEl.disabled = false;
        submitBtnEl.textContent = '確認報名並送出';
    }
}
