// -----------------------------------------
// 龜馬山 goLine - 線上點燈 (lightup.js)
// -----------------------------------------

// --- 全域變數 ---
const SERVICE_TYPE = "lightup";
const LAMP_PRICE = 700; // 根據經理的最新價格
let db;
let currentUser = null; // 用於儲存 Firebase 登入狀態

// --- DOM 元素 ---
// I. 聯絡資訊
const contactNameEl = document.getElementById('contactName');
const contactPhoneEl = document.getElementById('contactPhone');
const contactEmailEl = document.getElementById('contactEmail');
const contactAddressEl = document.getElementById('contactAddress');
// II. 模式切換
const modeSingleEl = document.getElementById('modeSingle');
const modeMultiEl = document.getElementById('modeMulti');
const applicantCardListEl = document.getElementById('applicantCardList');
const addApplicantBtnEl = document.getElementById('addApplicantBtn');
// III. 信用卡
const cardHolderNameEl = document.getElementById('cardHolderName');
const cardNumberEl = document.getElementById('cardNumber');
const cardExpiryEl = document.getElementById('cardExpiry');
const cardCVVEl = document.getElementById('cardCVV');
// 其他
const otherNoteEl = document.getElementById('otherNote');
// 浮動總結
const totalLampsEl = document.getElementById('totalLamps');
const totalAmountEl = document.getElementById('totalAmount');
const submitBtnEl = document.getElementById('submitBtn');

// --- 程式進入點 ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. 初始化 Firebase
    if (typeof firebase === 'undefined') {
        alert("Firebase SDK 載入失敗。");
        return;
    }
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();

    // 2. 檢查登入狀態
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            loadUserData();
        } else {
            window.location.href = '/index.html';
        }
    });

    // 3. 綁定事件監聽
    setupEventListeners();

    // 4. 初始化「單人模式」的第一張卡片
    updateMode();
});

// --- 載入使用者資料 ---
async function loadUserData() {
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        const userData = userDoc.data();
        
        if (userData) {
            contactNameEl.value = userData.displayName || '';
            contactEmailEl.value = userData.email || '';
        }
    } catch (error) {
        console.error('載入使用者資料失敗：', error);
    }
}

// --- 事件監聽 ---
function setupEventListeners() {
    // 監聽「單人/多人」模式切換
    modeSingleEl.addEventListener('change', updateMode);
    modeMultiEl.addEventListener('change', updateMode);

    // 監聽「新增點燈人」按鈕
    addApplicantBtnEl.addEventListener('click', () => createApplicantCard(null, false));

    // 監聽「送出」按鈕
    submitBtnEl.addEventListener('click', handleSubmit);

    // 監聽表單的任何變動，即時計算總價
    applicantCardListEl.addEventListener('input', calculateTotal);
}

// --- 核心功能 ---

/**
 * 處理「單人/多人」模式切換
 */
function updateMode() {
    const isMultiMode = modeMultiEl.checked;
    
    // 1. 控制「新增按鈕」的顯示/隱藏
    addApplicantBtnEl.style.display = isMultiMode ? 'block' : 'none';

    // 2. 處理卡片列表
    const cards = applicantCardListEl.querySelectorAll('.applicant-card');
    
    if (isMultiMode) {
        // 多人模式：如果一張卡片都沒有，自動建立第一張
        if (cards.length === 0) {
            createApplicantCard('報名者本人', false); // 預設帶入主事人
        }
    } else {
        // 單人模式：
        // 刪除所有多餘的卡片，只保留第一張
        cards.forEach((card, index) => {
            if (index > 0) {
                card.remove();
            }
        });
        
        // 如果沒有卡片，建立一張
        if (cards.length === 0) {
            createApplicantCard('報名者本人', false); // 'false' 代表不可刪除
        } else {
            // 更新第一張卡片的標題和刪除按鈕
            cards[0].querySelector('.card-summary-name').textContent = '報名者本人';
            const removeBtn = cards[0].querySelector('.remove-btn');
            if (removeBtn) removeBtn.style.display = 'none';
        }
    }
    
    calculateTotal();
}

/**
 * 建立一張新的「點燈人卡片」
 * @param {string} name - 預設姓名
 * @param {boolean} canRemove - 是否顯示刪除按鈕
 */
function createApplicantCard(name = '家人/親友', canRemove = true) {
    const cardId = `card-${Date.now()}`; // 產生唯一 ID
    const card = document.createElement('div');
    card.className = 'applicant-card';
    card.id = cardId;
    card.setAttribute('data-open', 'true'); // 預設展開

    card.innerHTML = `
        <div class="card-summary">
            <span class="card-summary-name">${name}</span>
            <span class="card-summary-info">共 0 盞燈</span>
        </div>
        
        <div class="applicant-details">
            <label for="name-${cardId}">點燈人姓名</label>
            <input type="text" id="name-${cardId}" class="input-field card-input-name" value="${name === '報名者本人' ? '' : name}" placeholder="請填寫點燈人姓名">
            
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

    // 綁定新卡片的事件
    if (canRemove) {
        card.querySelector('.remove-btn').addEventListener('click', () => {
            document.getElementById(cardId).remove();
            calculateTotal(); // 刪除後重新計算
        });
    }

    // 讓卡片可以收合 (點擊標題)
    card.querySelector('.card-summary').addEventListener('click', () => {
        const details = card.querySelector('.applicant-details');
        const isOpen = card.getAttribute('data-open') === 'true';
        details.style.display = isOpen ? 'none' : 'block';
        card.setAttribute('data-open', isOpen ? 'false' : 'true');
    });

    // 自動更新卡片標題
    card.querySelector('.card-input-name').addEventListener('input', (e) => {
        card.querySelector('.card-summary-name').textContent = e.target.value || '未命名';
    });
}

/**
 * 計算總燈數與總金額
 */
function calculateTotal() {
    let totalLamps = 0;
    const cards = applicantCardListEl.querySelectorAll('.applicant-card');

    cards.forEach(card => {
        let lampsInCard = 0;
        const counts = card.querySelectorAll('.light-count');
        
        counts.forEach(input => {
            const count = parseInt(input.value, 10) || 0;
            if (count < 0) input.value = 0; // 防止負數
            lampsInCard += count;
        });
        
        // 更新卡片總覽的燈數
        card.querySelector('.card-summary-info').textContent = `共 ${lampsInCard} 盞燈`;
        totalLamps += lampsInCard;
    });

    // 更新浮動總結
    const totalAmount = totalLamps * LAMP_PRICE;
    totalLampsEl.textContent = `${totalLamps} 盞`;
    totalAmountEl.textContent = `NT$ ${totalAmount.toLocaleString()}`;
}


/**
 * 處理表單送出
 */
async function handleSubmit() {
    submitBtnEl.disabled = true;
    submitBtnEl.textContent = '處理中...';

    try {
        // 1. 收集聯絡人資訊 (contactInfo)
        const contactInfo = {
            name: contactNameEl.value.trim(),
            phone: contactPhoneEl.value.trim(),
            email: contactEmailEl.value.trim(),
            address: contactAddressEl.value.trim(),
            receiptOption: document.querySelector('input[name="receiptOption"]:checked').value
        };

        // 驗證聯絡資訊
        if (!contactInfo.name || !contactInfo.phone) {
            alert('請填寫報名姓名和連絡電話');
            return;
        }

        // 2. 收集點燈人名單 (applicants)
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

        // 驗證至少有一位點燈人
        if (applicants.length === 0) {
            alert('請至少新增一位點燈人');
            return;
        }

        // 3. 計算總燈數並驗證
        let totalLamps = 0;
        applicants.forEach(applicant => {
            Object.values(applicant.lights).forEach(count => {
                totalLamps += count;
            });
        });

        // 驗證至少點一盞燈
        if (totalLamps === 0) {
            alert('請至少點一盞燈');
            return;
        }

        // 4. 收集信用卡資訊 (paymentInfo)
        const paymentInfo = {
            cardHolderName: cardHolderNameEl.value.trim(),
            cardNumberLast4: cardNumberEl.value.trim().slice(-4), // 只儲存末四碼
            cardExpiry: cardExpiryEl.value.trim(),
        };

        // 驗證信用卡資訊
        if (!paymentInfo.cardHolderName || !cardNumberEl.value.trim() || !paymentInfo.cardExpiry || !cardCVVEl.value.trim()) {
            alert('請填寫完整的信用卡資訊');
            return;
        }

        // 5. 收集其他備註
        const otherNote = otherNoteEl.value.trim();

        // 6. 計算總金額
        const totalAmount = totalLamps * LAMP_PRICE;

        // 7. 確認送出
        const confirmMessage = `
確認報名資訊：
報名人：${contactInfo.name}
電話：${contactInfo.phone}
點燈人數：${applicants.length} 位
總燈數：${totalLamps} 盞
總金額：NT$ ${totalAmount.toLocaleString()}

確定要送出報名嗎？
        `.trim();
        
        if (!confirm(confirmMessage)) {
            return;
        }

        // 8. 寫入 Firestore
        const lightupData = {
            userId: currentUser.uid,
            serviceType: SERVICE_TYPE,
            contactInfo: contactInfo,
            applicants: applicants,
            paymentInfo: paymentInfo,
            otherNote: otherNote,
            totalLamps: totalLamps,
            totalAmount: totalAmount,
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await db.collection('lightups').add(lightupData);
        
        alert("報名成功！廟方將盡快與您聯絡確認。");
        window.location.href = '/dashboard.html';

    } catch (error) {
        console.error("報名失敗:", error);
        alert(`報名失敗：${error.message}`);
    } finally {
        submitBtnEl.disabled = false;
        submitBtnEl.textContent = '確認報名並送出';
    }
}
