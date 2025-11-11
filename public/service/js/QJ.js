// -----------------------------------------
// QJ.js - 重構為動態載入模式
// Firebase 只在需要時才載入
// -----------------------------------------

export async function init() {
    // 動態載入 Firebase 模組
    const firebaseInit = await import('../../js/firebase-init.js');
    const { serviceFunctions, platformAuth, platformDb } = firebaseInit;
    
    const firestoreModule = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
    const { doc, getDoc, setDoc, collection, query, where, orderBy, getDocs } = firestoreModule;
    
    const functionsModule = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js');
    const { httpsCallable } = functionsModule;

// ====== 以下是原始代碼 ======

    // --- 匯入需要的實例 ---



    // --- 全域變數 ---
    const SERVICE_TYPE = "qj";
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
    // 立即執行初始化邏輯（不使用 DOMContentLoaded）
    const initializeApp = () => {
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
    };
    
    // 立即執行初始化
    initializeApp();

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
        const westernYearSpan = card.querySelector('[id^="western-year-"]');
        const westernMonthSpan = card.querySelector('[id^="western-month-"]');
        const westernDaySpan = card.querySelector('[id^="western-day-"]');
    
        if (!shengxiaoSelect) return;
    
        if (!dateString) {
            shengxiaoSelect.value = '';
            if (lunarYearSpan) lunarYearSpan.textContent = '';
            if (lunarMonthSpan) lunarMonthSpan.textContent = '';
            if (lunarDaySpan) lunarDaySpan.textContent = '';
            if (westernYearSpan) westernYearSpan.textContent = '';
            if (westernMonthSpan) westernMonthSpan.textContent = '';
            if (westernDaySpan) westernDaySpan.textContent = '';
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
        
            // 填入農曆年月日
            if (lunarYearSpan) {
                lunarYearSpan.textContent = lunar.getYearInGanZhi();
            }
            if (lunarMonthSpan) {
                lunarMonthSpan.textContent = lunar.getMonthInChinese();
            }
            if (lunarDaySpan) {
                lunarDaySpan.textContent = lunar.getDayInChinese();
            }
        
            // 填入西曆年月日
            if (westernYearSpan) {
                westernYearSpan.textContent = year;
            }
            if (westernMonthSpan) {
                westernMonthSpan.textContent = month;
            }
            if (westernDaySpan) {
                westernDaySpan.textContent = day;
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
            
                <div class="form-group" style="margin-top: 15px;">
                    <label class="checkbox-label" style="display: flex; align-items: center; cursor: pointer;">
                        <input type="checkbox" id="wenchang-${cardId}" class="checkbox-input" checked style="width: 20px; height: 20px; margin-right: 10px; cursor: pointer;">
                        <span style="font-size: 1rem;">文昌帝君拱斗</span>
                    </label>
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
    
        // 綁定核選方塊事件
        const checkbox = card.querySelector(`#wenchang-${cardId}`);
        if (checkbox) {
            checkbox.addEventListener('change', (e) => {
                const summaryInfo = card.querySelector('.card-summary-info');
                if (e.target.checked) {
                    summaryInfo.textContent = '文昌帝君拱斗';
                    summaryInfo.style.color = '';
                } else {
                    summaryInfo.textContent = '(未選擇服務)';
                    summaryInfo.style.color = '#999';
                }
                calculateTotal();
            });
        }
    }

    function calculateTotal() {
        const cards = applicantCardListEl.querySelectorAll('.applicant-card');
    
        // 只計算已勾選的服務
        let totalPositions = 0;
        cards.forEach(card => {
            const checkbox = card.querySelector('input[id^="wenchang-"]');
            if (checkbox && checkbox.checked) {
                totalPositions++;
            }
        });
    
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

        // 檢查是否至少有一個服務被選中
        let hasCheckedService = false;
        cards.forEach(card => {
            const checkbox = card.querySelector('input[id^="wenchang-"]');
            if (checkbox && checkbox.checked) {
                hasCheckedService = true;
            }
        });
        if (!hasCheckedService) {
            alert('請至少選擇一項服務');
            return false;
        }

        let cardIndex = 0;
        for (const card of cards) {
            cardIndex++;
            const cardName = card.querySelector('.card-summary-name').textContent || `第 ${cardIndex} 位報名者`;
        
            // 檢查姓名（只檢查已勾選服務的報名者）
            const checkbox = card.querySelector('input[id^="wenchang-"]');
            if (!checkbox || !checkbox.checked) {
                continue; // 跳過未勾選的報名者
            }
        
            const nameInput = card.querySelector('.card-input-name');
            if (!nameInput.value.trim()) {
                showError(nameInput, `請填寫 ${cardName} 的姓名`);
                // 展開卡片以顯示錯誤
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
                // 獲取文昌帝君拱斗核選方塊
                const wenchangCheckbox = card.querySelector('input[id^="wenchang-"]');
            
                // 只收集已勾選的報名者
                if (wenchangCheckbox && wenchangCheckbox.checked) {
                    const cardData = {
                        applicantName: card.querySelector('.card-input-name').value.trim(),
                        serviceItem: '文昌帝君拱斗'
                    };
                    applicants.push(cardData);
                }
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
        
            // 再次檢查登入狀態（防止 token 過期）
            if (!platformAuth.currentUser) {
                throw new Error('登入狀態已過期，請重新整理頁面並重新登入');
            }
        
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
        
            // 跳轉到訂單確認頁面
            window.location.href = `success.html?orderId=${result.result.orderId}&service=${SERVICE_TYPE}`;

        } catch (error) {
            console.error("報名失敗:", error);
            alert(`報名失敗：${error.message}`);
        } finally {
            submitBtnEl.disabled = false;
            submitBtnEl.textContent = '確認報名並送出';
        }
    }

}
    
    // 導出觸發登入函數供外部使用
    return {
        triggerLogin: handleLineLogin
    };
