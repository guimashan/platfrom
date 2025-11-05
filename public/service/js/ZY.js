// -----------------------------------------
// 龜馬山 goLine - 中元法會 (ZY.js)
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
const SERVICE_TYPE = "zhongyuan";
const PRICE_PER_PERSON = 1500;
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
const cardHolderNameEl = document.getElementById('cardHolderName');
const cardNumberEl = document.getElementById('cardNumber');
const cardExpiryEl = document.getElementById('cardExpiry');
const cardCVVEl = document.getElementById('cardCVV');
const otherNoteEl = document.getElementById('otherNote');
const totalCountEl = document.getElementById('totalCount');
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
    // 綁定所有「新增」按鈕
    document.querySelectorAll('.btn-add-category').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const category = e.target.getAttribute('data-category');
            createCategoryCard(category);
        });
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
}

// --- 建立各類別卡片 ---
function createCategoryCard(category) {
    const cardId = `${category}-${Date.now()}`;
    const card = document.createElement('div');
    card.className = 'applicant-card';
    card.id = cardId;
    card.setAttribute('data-category', category);
    card.setAttribute('data-open', 'true');

    let cardHTML = '';

    // 根據類別建立不同欄位
    switch(category) {
        case 'lidai': // 歷代祖先
            cardHTML = `
                <div class="card-summary">
                    <span class="card-summary-name">歷代祖先</span>
                    <span class="card-summary-info">$1,500</span>
                </div>
                <div class="applicant-details">
                    <div class="form-group">
                        <label>姓氏/姓名</label>
                        <input type="text" class="input-field" data-field="name" placeholder="請輸入姓氏或姓名">
                    </div>
                    <div class="form-group">
                        <label>備註/地址</label>
                        <input type="text" class="input-field" data-field="address" placeholder="請輸入備註或地址">
                    </div>
                    <div class="form-group">
                        <label>堂號(燈號)</label>
                        <input type="text" class="input-field" data-field="tanghao" placeholder="請輸入堂號">
                    </div>
                    <div class="form-group">
                        <label>陽上報恩姓名</label>
                        <input type="text" class="input-field" data-field="yangshang" placeholder="請輸入陽上報恩姓名">
                    </div>
                    <div class="form-group">
                        <label>關係</label>
                        <input type="text" class="input-field" data-field="relation" placeholder="請輸入關係">
                    </div>
                    <button class="remove-btn">移除此筆</button>
                </div>
            `;
            break;

        case 'zuxian': // 祖先
            cardHTML = `
                <div class="card-summary">
                    <span class="card-summary-name">祖先</span>
                    <span class="card-summary-info">$1,500</span>
                </div>
                <div class="applicant-details">
                    <div class="form-group">
                        <label>姓氏/姓名</label>
                        <input type="text" class="input-field" data-field="name" placeholder="請輸入姓名">
                    </div>
                    <div class="form-group">
                        <label>性別</label>
                        <select class="input-field" data-field="gender">
                            <option value="">請選擇</option>
                            <option value="男">男</option>
                            <option value="女">女</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>生辰 (國曆)</label>
                        <div style="margin-bottom: 4px;">
                            <div style="display: flex; align-items: center; gap: 5px;">
                                <span style="color: #666; white-space: nowrap; width: 50px;">國曆:</span>
                                <span style="color: #666;">民國</span>
                                <input type="text" class="input-field solar-year" data-target="birthDate" placeholder="年" maxlength="3" style="width: 70px; text-align: center;">
                                <span>年</span>
                                <input type="text" class="input-field solar-month" data-target="birthDate" placeholder="月" maxlength="2" style="width: 50px; text-align: center;">
                                <span>月</span>
                                <input type="text" class="input-field solar-day" data-target="birthDate" placeholder="日" maxlength="2" style="width: 50px; text-align: center;">
                                <span>日</span>
                                <span style="position: relative; display: inline-block;">
                                    <input type="date" class="input-field date-picker-trigger" data-target="birthDate" style="width: 40px; height: 44px; opacity: 0; position: absolute; cursor: pointer; left: 0; top: 0;">
                                    <span style="display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 44px; border: 1.5px solid #e0e0e0; border-radius: 8px; background: white; font-size: 20px; pointer-events: none;">🗓️</span>
                                </span>
                            </div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 4px;">
                            <span style="color: #666; white-space: nowrap; width: 50px;">西曆:</span>
                            <span style="visibility: hidden;">民國</span>
                            <span class="western-year" data-target="birthDate" style="display: inline-block; width: 70px; color: #666; text-align: center;"></span>
                            <span style="color: #666;">年</span>
                            <span class="western-month" data-target="birthDate" style="display: inline-block; width: 50px; color: #666; text-align: center;"></span>
                            <span style="color: #666;">月</span>
                            <span class="western-day" data-target="birthDate" style="display: inline-block; width: 50px; color: #666; text-align: center;"></span>
                            <span style="color: #666;">日</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 5px;">
                            <span style="color: #666; white-space: nowrap; width: 50px;">農曆:</span>
                            <span style="visibility: hidden;">民國</span>
                            <span class="lunar-year" data-target="birthDate" style="display: inline-block; width: 70px; color: #666; text-align: center;"></span>
                            <span style="color: #666;">年</span>
                            <span class="lunar-month" data-target="birthDate" style="display: inline-block; width: 50px; color: #666; text-align: center;"></span>
                            <span style="color: #666;">月</span>
                            <span class="lunar-day" data-target="birthDate" style="display: inline-block; width: 50px; color: #666; text-align: center;"></span>
                            <span style="color: #666;">日</span>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>忌日 (國曆)</label>
                        <div style="margin-bottom: 4px;">
                            <div style="display: flex; align-items: center; gap: 5px;">
                                <span style="color: #666; white-space: nowrap; width: 50px;">國曆:</span>
                                <span style="color: #666;">民國</span>
                                <input type="text" class="input-field solar-year" data-target="deathDate" placeholder="年" maxlength="3" style="width: 100px;">
                                <span>年</span>
                                <input type="text" class="input-field solar-month" data-target="deathDate" placeholder="月" maxlength="2" style="width: 80px;">
                                <span>月</span>
                                <input type="text" class="input-field solar-day" data-target="deathDate" placeholder="日" maxlength="2" style="width: 80px;">
                                <span>日</span>
                                <input type="date" class="input-field date-picker-trigger" data-target="deathDate" style="width: 40px; padding: 5px; cursor: pointer;" title="📅">
                            </div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 4px;">
                            <span style="color: #666; white-space: nowrap; width: 50px;">西曆:</span>
                            <span style="visibility: hidden;">民國</span>
                            <span class="western-year" data-target="deathDate" style="display: inline-block; width: 100px; color: #666;"></span>
                            <span style="color: #666;">年</span>
                            <span class="western-month" data-target="deathDate" style="display: inline-block; width: 80px; color: #666;"></span>
                            <span style="color: #666;">月</span>
                            <span class="western-day" data-target="deathDate" style="display: inline-block; width: 80px; color: #666;"></span>
                            <span style="color: #666;">日</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 5px;">
                            <span style="color: #666; white-space: nowrap; width: 50px;">農曆:</span>
                            <span style="visibility: hidden;">民國</span>
                            <span class="lunar-year" data-target="deathDate" style="display: inline-block; width: 100px; color: #666;"></span>
                            <span style="color: #666;">年</span>
                            <span class="lunar-month" data-target="deathDate" style="display: inline-block; width: 80px; color: #666;"></span>
                            <span style="color: #666;">月</span>
                            <span class="lunar-day" data-target="deathDate" style="display: inline-block; width: 80px; color: #666;"></span>
                            <span style="color: #666;">日</span>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>地址/備註</label>
                        <input type="text" class="input-field" data-field="address" placeholder="請輸入地址或備註">
                    </div>
                    <div class="form-group">
                        <label>堂號(燈號)</label>
                        <input type="text" class="input-field" data-field="tanghao" placeholder="請輸入堂號">
                    </div>
                    <div class="form-group">
                        <label>陽上報恩姓名</label>
                        <input type="text" class="input-field" data-field="yangshang" placeholder="請輸入陽上報恩姓名">
                    </div>
                    <div class="form-group">
                        <label>關係</label>
                        <input type="text" class="input-field" data-field="relation" placeholder="請輸入關係">
                    </div>
                    <button class="remove-btn">移除此筆</button>
                </div>
            `;
            break;

        case 'yuanqin': // 冤親債主
            cardHTML = `
                <div class="card-summary">
                    <span class="card-summary-name">冤親債主</span>
                    <span class="card-summary-info">$1,500</span>
                </div>
                <div class="applicant-details">
                    <div class="form-group">
                        <label>姓氏/姓名</label>
                        <input type="text" class="input-field" data-field="name" placeholder="請輸入姓名">
                    </div>
                    <div class="form-group">
                        <label>地址/備註</label>
                        <input type="text" class="input-field" data-field="address" placeholder="請輸入地址或備註">
                    </div>
                    <button class="remove-btn">移除此筆</button>
                </div>
            `;
            break;

        case 'yingling': // 嬰靈
            cardHTML = `
                <div class="card-summary">
                    <span class="card-summary-name">嬰靈</span>
                    <span class="card-summary-info">$1,500</span>
                </div>
                <div class="applicant-details">
                    <div class="form-group">
                        <label>姓氏/姓名</label>
                        <input type="text" class="input-field" data-field="name" placeholder="請輸入姓名">
                    </div>
                    <div class="form-group">
                        <label>地址/備註</label>
                        <input type="text" class="input-field" data-field="address" placeholder="請輸入地址或備註">
                    </div>
                    <button class="remove-btn">移除此筆</button>
                </div>
            `;
            break;

        case 'dijizhu': // 地基主
            cardHTML = `
                <div class="card-summary">
                    <span class="card-summary-name">地基主</span>
                    <span class="card-summary-info">$1,500</span>
                </div>
                <div class="applicant-details">
                    <div class="form-group">
                        <label>姓氏/姓名/公司行號名</label>
                        <input type="text" class="input-field" data-field="name" placeholder="請輸入姓名或公司行號名">
                    </div>
                    <div class="form-group">
                        <label>地址/備註</label>
                        <input type="text" class="input-field" data-field="address" placeholder="請輸入地址或備註">
                    </div>
                    <button class="remove-btn">移除此筆</button>
                </div>
            `;
            break;

        case 'qita': // 其他
            cardHTML = `
                <div class="card-summary">
                    <span class="card-summary-name">其他</span>
                    <span class="card-summary-info">$1,500</span>
                </div>
                <div class="applicant-details">
                    <div class="form-group">
                        <label>姓氏/姓名</label>
                        <input type="text" class="input-field" data-field="name" placeholder="請輸入姓名">
                    </div>
                    <div class="form-group">
                        <label>性別</label>
                        <select class="input-field" data-field="gender">
                            <option value="">請選擇</option>
                            <option value="男">男</option>
                            <option value="女">女</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>生辰 (國曆)</label>
                        <div style="margin-bottom: 4px;">
                            <div style="display: flex; align-items: center; gap: 5px;">
                                <span style="color: #666; white-space: nowrap; width: 50px;">國曆:</span>
                                <span style="color: #666;">民國</span>
                                <input type="text" class="input-field solar-year" data-target="birthDate" placeholder="年" maxlength="3" style="width: 70px; text-align: center;">
                                <span>年</span>
                                <input type="text" class="input-field solar-month" data-target="birthDate" placeholder="月" maxlength="2" style="width: 50px; text-align: center;">
                                <span>月</span>
                                <input type="text" class="input-field solar-day" data-target="birthDate" placeholder="日" maxlength="2" style="width: 50px; text-align: center;">
                                <span>日</span>
                                <span style="position: relative; display: inline-block;">
                                    <input type="date" class="input-field date-picker-trigger" data-target="birthDate" style="width: 40px; height: 44px; opacity: 0; position: absolute; cursor: pointer; left: 0; top: 0;">
                                    <span style="display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 44px; border: 1.5px solid #e0e0e0; border-radius: 8px; background: white; font-size: 20px; pointer-events: none;">🗓️</span>
                                </span>
                            </div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 4px;">
                            <span style="color: #666; white-space: nowrap; width: 50px;">西曆:</span>
                            <span style="visibility: hidden;">民國</span>
                            <span class="western-year" data-target="birthDate" style="display: inline-block; width: 70px; color: #666; text-align: center;"></span>
                            <span style="color: #666;">年</span>
                            <span class="western-month" data-target="birthDate" style="display: inline-block; width: 50px; color: #666; text-align: center;"></span>
                            <span style="color: #666;">月</span>
                            <span class="western-day" data-target="birthDate" style="display: inline-block; width: 50px; color: #666; text-align: center;"></span>
                            <span style="color: #666;">日</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 5px;">
                            <span style="color: #666; white-space: nowrap; width: 50px;">農曆:</span>
                            <span style="visibility: hidden;">民國</span>
                            <span class="lunar-year" data-target="birthDate" style="display: inline-block; width: 70px; color: #666; text-align: center;"></span>
                            <span style="color: #666;">年</span>
                            <span class="lunar-month" data-target="birthDate" style="display: inline-block; width: 50px; color: #666; text-align: center;"></span>
                            <span style="color: #666;">月</span>
                            <span class="lunar-day" data-target="birthDate" style="display: inline-block; width: 50px; color: #666; text-align: center;"></span>
                            <span style="color: #666;">日</span>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>忌日 (國曆)</label>
                        <div style="margin-bottom: 4px;">
                            <div style="display: flex; align-items: center; gap: 5px;">
                                <span style="color: #666; white-space: nowrap; width: 50px;">國曆:</span>
                                <span style="color: #666;">民國</span>
                                <input type="text" class="input-field solar-year" data-target="deathDate" placeholder="年" maxlength="3" style="width: 100px;">
                                <span>年</span>
                                <input type="text" class="input-field solar-month" data-target="deathDate" placeholder="月" maxlength="2" style="width: 80px;">
                                <span>月</span>
                                <input type="text" class="input-field solar-day" data-target="deathDate" placeholder="日" maxlength="2" style="width: 80px;">
                                <span>日</span>
                                <input type="date" class="input-field date-picker-trigger" data-target="deathDate" style="width: 40px; padding: 5px; cursor: pointer;" title="📅">
                            </div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 4px;">
                            <span style="color: #666; white-space: nowrap; width: 50px;">西曆:</span>
                            <span style="visibility: hidden;">民國</span>
                            <span class="western-year" data-target="deathDate" style="display: inline-block; width: 100px; color: #666;"></span>
                            <span style="color: #666;">年</span>
                            <span class="western-month" data-target="deathDate" style="display: inline-block; width: 80px; color: #666;"></span>
                            <span style="color: #666;">月</span>
                            <span class="western-day" data-target="deathDate" style="display: inline-block; width: 80px; color: #666;"></span>
                            <span style="color: #666;">日</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 5px;">
                            <span style="color: #666; white-space: nowrap; width: 50px;">農曆:</span>
                            <span style="visibility: hidden;">民國</span>
                            <span class="lunar-year" data-target="deathDate" style="display: inline-block; width: 100px; color: #666;"></span>
                            <span style="color: #666;">年</span>
                            <span class="lunar-month" data-target="deathDate" style="display: inline-block; width: 80px; color: #666;"></span>
                            <span style="color: #666;">月</span>
                            <span class="lunar-day" data-target="deathDate" style="display: inline-block; width: 80px; color: #666;"></span>
                            <span style="color: #666;">日</span>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>地址/備註</label>
                        <input type="text" class="input-field" data-field="address" placeholder="請輸入地址或備註">
                    </div>
                    <div class="form-group">
                        <label>堂號(燈號)</label>
                        <input type="text" class="input-field" data-field="tanghao" placeholder="請輸入堂號">
                    </div>
                    <div class="form-group">
                        <label>陽上報恩姓名</label>
                        <input type="text" class="input-field" data-field="yangshang" placeholder="請輸入陽上報恩姓名">
                    </div>
                    <div class="form-group">
                        <label>關係</label>
                        <input type="text" class="input-field" data-field="relation" placeholder="請輸入關係">
                    </div>
                    <button class="remove-btn">移除此筆</button>
                </div>
            `;
            break;
    }

    card.innerHTML = cardHTML;

    // 加到對應的列表
    const listEl = document.getElementById(`${category}List`);
    listEl.appendChild(card);

    // 綁定事件
    card.querySelector('.remove-btn').addEventListener('click', () => {
        card.remove();
        calculateTotal();
    });

    card.querySelector('.card-summary').addEventListener('click', () => {
        const details = card.querySelector('.applicant-details');
        const isOpen = card.getAttribute('data-open') === 'true';
        details.style.display = isOpen ? 'none' : 'block';
        card.setAttribute('data-open', isOpen ? 'false' : 'true');
    });

    // 姓名輸入時更新摘要
    const nameInput = card.querySelector('[data-field="name"]');
    if (nameInput) {
        nameInput.addEventListener('input', (e) => {
            const summaryName = card.querySelector('.card-summary-name');
            const categoryName = getCategoryDisplayName(category);
            summaryName.textContent = e.target.value || categoryName;
        });
    }

    // 農曆轉換（僅 zuxian 和 qita 需要）
    if (category === 'zuxian' || category === 'qita') {
        // 監聽年月日輸入框的變化
        card.querySelectorAll('.solar-year, .solar-month, .solar-day').forEach(input => {
            input.addEventListener('input', () => handleSolarInputChange(card, input.getAttribute('data-target')));
        });

        // 監聽日期選擇器的變化
        card.querySelectorAll('.date-picker-trigger').forEach(picker => {
            picker.addEventListener('change', (e) => handleDatePickerChange(card, e.target));
        });
    }

    calculateTotal();
}

// --- 取得類別顯示名稱 ---
function getCategoryDisplayName(category) {
    const names = {
        'lidai': '歷代祖先',
        'zuxian': '祖先',
        'yuanqin': '冤親債主',
        'yingling': '嬰靈',
        'dijizhu': '地基主',
        'qita': '其他'
    };
    return names[category] || category;
}

// --- 處理日期選擇器變化 ---
function handleDatePickerChange(card, picker) {
    const target = picker.getAttribute('data-target');
    const dateValue = picker.value;
    
    if (!dateValue) return;
    
    const dateObj = new Date(dateValue);
    const year = dateObj.getFullYear();
    const month = dateObj.getMonth() + 1;
    const day = dateObj.getDate();
    
    // 轉換為民國年
    const rocYear = year - 1911;
    
    // 填入年月日輸入框（民國年）
    const yearInput = card.querySelector(`.solar-year[data-target="${target}"]`);
    const monthInput = card.querySelector(`.solar-month[data-target="${target}"]`);
    const dayInput = card.querySelector(`.solar-day[data-target="${target}"]`);
    
    if (yearInput) yearInput.value = rocYear;
    if (monthInput) monthInput.value = month;
    if (dayInput) dayInput.value = day;
    
    // 轉換農曆
    convertToLunar(card, target, year, month, day);
}

// --- 處理年月日輸入框變化 ---
function handleSolarInputChange(card, target) {
    const yearInput = card.querySelector(`.solar-year[data-target="${target}"]`);
    const monthInput = card.querySelector(`.solar-month[data-target="${target}"]`);
    const dayInput = card.querySelector(`.solar-day[data-target="${target}"]`);
    
    if (!yearInput || !monthInput || !dayInput) return;
    
    const rocYear = parseInt(yearInput.value);
    const month = parseInt(monthInput.value);
    const day = parseInt(dayInput.value);
    
    // 檢查是否都有值
    if (!rocYear || !month || !day) {
        const lunarField = target === 'birthDate' ? 'birthLunar' : 'deathLunar';
        const displayEl = card.querySelector(`[data-field="${lunarField}"]`);
        if (displayEl) displayEl.textContent = '';
        return;
    }
    
    // 民國年轉西元年
    const year = rocYear + 1911;
    
    // 轉換農曆
    convertToLunar(card, target, year, month, day);
}

// --- 農曆轉換 ---
function convertToLunar(card, target, year, month, day) {
    try {
        const dateObj = new Date(year, month - 1, day);
        
        // 檢查日期是否有效
        if (dateObj.getFullYear() !== year || dateObj.getMonth() !== month - 1 || dateObj.getDate() !== day) {
            // 清空顯示
            const westernYear = card.querySelector(`.western-year[data-target="${target}"]`);
            const westernMonth = card.querySelector(`.western-month[data-target="${target}"]`);
            const westernDay = card.querySelector(`.western-day[data-target="${target}"]`);
            const lunarYear = card.querySelector(`.lunar-year[data-target="${target}"]`);
            const lunarMonth = card.querySelector(`.lunar-month[data-target="${target}"]`);
            const lunarDay = card.querySelector(`.lunar-day[data-target="${target}"]`);
            
            if (westernYear) westernYear.textContent = '';
            if (westernMonth) westernMonth.textContent = '';
            if (westernDay) westernDay.textContent = '';
            if (lunarYear) lunarYear.textContent = '';
            if (lunarMonth) lunarMonth.textContent = '';
            if (lunarDay) lunarDay.textContent = '';
            return;
        }
        
        // 顯示西曆
        const westernYear = card.querySelector(`.western-year[data-target="${target}"]`);
        const westernMonth = card.querySelector(`.western-month[data-target="${target}"]`);
        const westernDay = card.querySelector(`.western-day[data-target="${target}"]`);
        
        if (westernYear) westernYear.textContent = year;
        if (westernMonth) westernMonth.textContent = month;
        if (westernDay) westernDay.textContent = day;
        
        // 轉換並顯示農曆（使用中文）
        const lunarObj = window.Lunar.fromDate(dateObj);
        const lunarYear = card.querySelector(`.lunar-year[data-target="${target}"]`);
        const lunarMonth = card.querySelector(`.lunar-month[data-target="${target}"]`);
        const lunarDay = card.querySelector(`.lunar-day[data-target="${target}"]`);
        
        if (lunarYear) lunarYear.textContent = lunarObj.getYearInGanZhi();  // 干支年，如"壬寅"
        if (lunarMonth) lunarMonth.textContent = lunarObj.getMonthInChinese();  // 中文月份，如"二"
        if (lunarDay) lunarDay.textContent = lunarObj.getDayInChinese();  // 中文日期，如"十八"
        
    } catch (error) {
        console.error('農曆轉換失敗:', error);
        // 清空顯示
        const westernYear = card.querySelector(`.western-year[data-target="${target}"]`);
        const westernMonth = card.querySelector(`.western-month[data-target="${target}"]`);
        const westernDay = card.querySelector(`.western-day[data-target="${target}"]`);
        const lunarYear = card.querySelector(`.lunar-year[data-target="${target}"]`);
        const lunarMonth = card.querySelector(`.lunar-month[data-target="${target}"]`);
        const lunarDay = card.querySelector(`.lunar-day[data-target="${target}"]`);
        
        if (westernYear) westernYear.textContent = '';
        if (westernMonth) westernMonth.textContent = '';
        if (westernDay) westernDay.textContent = '';
        if (lunarYear) lunarYear.textContent = '';
        if (lunarMonth) lunarMonth.textContent = '';
        if (lunarDay) lunarDay.textContent = '';
    }
}

// --- 計算總金額 ---
function calculateTotal() {
    const allCards = document.querySelectorAll('.applicant-card');
    const totalCount = allCards.length;
    const totalAmount = totalCount * PRICE_PER_PERSON;

    totalCountEl.textContent = `${totalCount} 位`;
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

        // 2. 驗證超拔對象
        const allCards = document.querySelectorAll('.applicant-card');
        if (allCards.length === 0) {
            alert('請至少新增一位超拔對象');
            submitBtnEl.disabled = false;
            submitBtnEl.textContent = '確認報名並送出';
            return;
        }

        // 驗證每張卡片的姓名必填
        for (const card of allCards) {
            const nameInput = card.querySelector('[data-field="name"]');
            if (!nameInput || !nameInput.value.trim()) {
                showError(nameInput, '請填寫姓名');
                submitBtnEl.disabled = false;
                submitBtnEl.textContent = '確認報名並送出';
                return;
            }
        }

        // 3. 信用卡驗證
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

        const [month, year] = cardExpiry.split('/').map(Number);
        const now = new Date();
        const expiry = new Date(2000 + year, month - 1);
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

        // 4. 收集資料
        const contactInfo = {
            name: contactNameEl.value.trim(),
            phone: contactPhoneEl.value.trim(),
            email: contactEmailEl.value.trim(),
            address: contactAddressEl.value.trim(),
            receiptOption: receiptOption
        };

        // 收集所有超拔對象
        const applicants = [];
        allCards.forEach(card => {
            const category = card.getAttribute('data-category');
            const data = {
                category: category,
                categoryName: getCategoryDisplayName(category)
            };

            // 收集該卡片的所有欄位
            card.querySelectorAll('[data-field]').forEach(field => {
                const fieldName = field.getAttribute('data-field');
                let value = '';
                
                if (field.classList.contains('lunar-display')) {
                    value = field.textContent || '';
                } else if (field.tagName === 'SELECT') {
                    value = field.value;
                } else {
                    value = field.value;
                }
                
                data[fieldName] = value;
            });

            applicants.push(data);
        });

        const paymentInfo = {
            cardHolderName: cardHolderNameEl.value.trim(),
            cardNumber: cardNumberEl.value.trim(),
            cardExpiry: cardExpiryEl.value.trim(),
            cardCVV: cardCVVEl.value.trim(),
        };

        const otherNote = otherNoteEl.value.trim();
        const totalAmount = allCards.length * PRICE_PER_PERSON;
        
        // 5. 呼叫 Cloud Function
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
        alert(`報名失敗: ${error.message}`);
        submitBtnEl.disabled = false;
        submitBtnEl.textContent = '確認報名並送出';
    }
}
