/**
 * 共用表單輔助函數模組
 * 提供所有服務表單共用的功能和驗證邏輯
 */

/**
 * 初始化表單認證和模組載入
 * @param {string} pageName - 頁面名稱（用於日誌）
 * @param {string} moduleUrl - 模組 URL
 * @returns {Promise<void>}
 */
export async function initializeServiceForm(pageName, moduleUrl) {
    const { checkAuthWithUI } = await import('/js/auth-guard.js');
    
    let moduleLoaded = false;

    async function loadModule() {
        if (!moduleLoaded) {
            const module = await import(moduleUrl);
            await module.init();
            moduleLoaded = true;
        }
    }

    // 使用統一的認證 UI 守衛
    return checkAuthWithUI({
        onAuthenticated: (result) => {
            console.log(`✅ [${pageName}] 已登入，載入模組`);
            loadModule();
        },
        onUnauthenticated: () => {
            console.log(`❌ [${pageName}] 未登入，顯示登入 UI`);
        }
    });
}

/**
 * 驗證聯絡資訊
 * @param {Object} contactData - 聯絡資訊物件
 * @returns {Object} { isValid: boolean, errors: string[] }
 */
export function validateContactInfo(contactData) {
    const errors = [];
    
    if (!contactData.contactName || contactData.contactName.trim() === '') {
        errors.push('請輸入報名姓名');
    }
    
    if (!contactData.contactPhone || contactData.contactPhone.trim() === '') {
        errors.push('請輸入連絡電話');
    } else if (!/^[\d-()+ ]{8,}$/.test(contactData.contactPhone.trim())) {
        errors.push('電話格式不正確');
    }
    
    if (contactData.contactEmail && contactData.contactEmail.trim() !== '') {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactData.contactEmail.trim())) {
            errors.push('Email 格式不正確');
        }
    }
    
    if (contactData.receiptOption === 'send') {
        if (!contactData.contactAddress || contactData.contactAddress.trim() === '') {
            errors.push('請輸入感謝狀寄送地址');
        }
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * 驗證信用卡資訊
 * @param {Object} cardData - 信用卡資訊物件
 * @returns {Object} { isValid: boolean, errors: string[] }
 */
export function validateCardInfo(cardData) {
    const errors = [];
    
    if (!cardData.cardHolderName || cardData.cardHolderName.trim() === '') {
        errors.push('請輸入持卡人姓名');
    }
    
    if (!cardData.cardNumber || cardData.cardNumber.trim() === '') {
        errors.push('請輸入信用卡卡號');
    } else {
        // 移除空格和破折號
        const cleanNumber = cardData.cardNumber.replace(/[\s-]/g, '');
        if (!/^\d{15,16}$/.test(cleanNumber)) {
            errors.push('信用卡卡號格式不正確（應為 15-16 位數字）');
        }
    }
    
    if (!cardData.cardExpiry || cardData.cardExpiry.trim() === '') {
        errors.push('請輸入信用卡有效期限');
    } else if (!/^\d{2}\/\d{2}$/.test(cardData.cardExpiry.trim())) {
        errors.push('有效期限格式不正確（應為 MM/YY）');
    }
    
    if (!cardData.cardCVV || cardData.cardCVV.trim() === '') {
        errors.push('請輸入 CVV 安全碼');
    } else if (!/^\d{3,4}$/.test(cardData.cardCVV.trim())) {
        errors.push('CVV 格式不正確（應為 3-4 位數字）');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * 顯示驗證錯誤訊息
 * @param {string[]} errors - 錯誤訊息陣列
 */
export function showValidationErrors(errors) {
    if (errors.length === 0) return;
    
    const errorMessage = '請修正以下問題：\n\n' + errors.map((err, idx) => `${idx + 1}. ${err}`).join('\n');
    alert(errorMessage);
}

/**
 * 格式化金額顯示
 * @param {number} amount - 金額
 * @returns {string} 格式化後的金額字串
 */
export function formatCurrency(amount) {
    return `NT$ ${amount.toLocaleString('zh-TW')}`;
}

/**
 * 格式化信用卡號碼（僅顯示後四碼）
 * @param {string} cardNumber - 信用卡號碼
 * @returns {string} 格式化後的卡號
 */
export function maskCardNumber(cardNumber) {
    const cleaned = cardNumber.replace(/[\s-]/g, '');
    if (cleaned.length < 4) return '**** **** **** ****';
    return `**** **** **** ${cleaned.slice(-4)}`;
}

/**
 * 取得目前時間戳記（台北時區）
 * @returns {string} ISO 格式時間戳記
 */
export function getTaipeiTimestamp() {
    return new Date().toLocaleString('zh-TW', { 
        timeZone: 'Asia/Taipei',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
}

/**
 * 產生唯一訂單編號
 * @param {string} prefix - 前綴（例如：'DD', 'LD', 'BG'）
 * @returns {string} 訂單編號
 */
export function generateOrderId(prefix) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}-${timestamp}-${random}`;
}

/**
 * 深度複製物件
 * @param {Object} obj - 要複製的物件
 * @returns {Object} 複製後的物件
 */
export function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * 防抖函數
 * @param {Function} func - 要執行的函數
 * @param {number} delay - 延遲時間（毫秒）
 * @returns {Function} 防抖後的函數
 */
export function debounce(func, delay = 300) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}

export default {
    initializeServiceForm,
    validateContactInfo,
    validateCardInfo,
    showValidationErrors,
    formatCurrency,
    maskCardNumber,
    getTaipeiTimestamp,
    generateOrderId,
    deepClone,
    debounce
};
