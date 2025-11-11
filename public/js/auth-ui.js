/**
 * 統一的登入 UI 組件
 * 提供登入提示界面的顯示/隱藏功能
 */

// 注入登入 UI 樣式
function injectAuthStyles() {
    if (document.getElementById('auth-ui-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'auth-ui-styles';
    style.textContent = `
        .auth-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100vh;
            background: linear-gradient(135deg, #F5F0E8 0%, #FFF9F0 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            padding: 20px;
        }

        .auth-card {
            background: white;
            border-radius: 20px;
            padding: 3rem 2.5rem;
            text-align: center;
            box-shadow: 0 8px 32px rgba(212, 175, 55, 0.2);
            max-width: 500px;
            width: 100%;
            animation: authFadeIn 0.4s ease-out;
        }

        @keyframes authFadeIn {
            from {
                opacity: 0;
                transform: translateY(-20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .auth-card h2 {
            color: #B8941F;
            margin-bottom: 1rem;
            font-size: 2rem;
            font-weight: 600;
        }

        .auth-card p {
            color: #6B5D4F;
            margin-bottom: 2rem;
            font-size: 1.1rem;
            line-height: 1.8;
        }

        .auth-btn-line {
            background: linear-gradient(135deg, #06C755 0%, #00B900 100%);
            color: white;
            padding: 1rem 2.5rem;
            border: none;
            border-radius: 12px;
            font-size: 1.1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 16px rgba(6, 199, 85, 0.3);
            font-family: 'Noto Sans TC', sans-serif;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
        }

        .auth-btn-line:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(6, 199, 85, 0.4);
        }

        .auth-btn-line:active {
            transform: translateY(0);
        }

        .auth-error {
            background: #FEE;
            color: #C33;
            padding: 1rem;
            border-radius: 8px;
            margin-top: 1rem;
            font-size: 0.9rem;
        }

        @media (max-width: 600px) {
            .auth-card {
                padding: 2rem 1.5rem;
            }
            .auth-card h2 {
                font-size: 1.5rem;
            }
        }
    `;
    document.head.appendChild(style);
}

/**
 * 顯示登入 UI
 * @param {Object} options - 配置選項
 * @param {string} options.title - 標題文字（默認：「請先登入」）
 * @param {string} options.message - 提示訊息（默認：「請使用 LINE 帳號登入系統」）
 * @param {Function} options.onLogin - 登入按鈕點擊回調
 * @param {string} options.errorMessage - 錯誤訊息（可選）
 */
export function showAuthUI(options = {}) {
    const {
        title = '請先登入',
        message = '請使用 LINE 帳號登入系統',
        onLogin = null,
        errorMessage = null
    } = options;

    // 注入樣式
    injectAuthStyles();

    // 移除舊的 UI（如果存在）
    hideAuthUI();

    // 創建登入 UI
    const overlay = document.createElement('div');
    overlay.id = 'auth-ui-overlay';
    overlay.className = 'auth-overlay';
    
    overlay.innerHTML = `
        <div class="auth-card">
            <h2>${title}</h2>
            <p>${message}</p>
            <button id="auth-ui-login-btn" class="auth-btn-line">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                </svg>
                LINE 登入
            </button>
            ${errorMessage ? `<div class="auth-error">${errorMessage}</div>` : ''}
        </div>
    `;

    // 添加到頁面
    document.body.appendChild(overlay);

    // 綁定登入按鈕事件
    const loginBtn = document.getElementById('auth-ui-login-btn');
    if (loginBtn && onLogin) {
        loginBtn.addEventListener('click', onLogin);
    }

    // 隱藏主要內容
    const mainApp = document.getElementById('mainApp');
    if (mainApp) {
        mainApp.style.display = 'none';
    }
}

/**
 * 隱藏登入 UI
 */
export function hideAuthUI() {
    const overlay = document.getElementById('auth-ui-overlay');
    if (overlay) {
        overlay.remove();
    }
}

/**
 * 顯示主要內容
 */
export function showMainContent() {
    hideAuthUI();
    
    const mainApp = document.getElementById('mainApp');
    if (mainApp) {
        mainApp.style.display = 'block';
    }
}

/**
 * 顯示錯誤訊息
 * @param {string} message - 錯誤訊息
 */
export function showAuthError(message) {
    const overlay = document.getElementById('auth-ui-overlay');
    if (!overlay) return;

    // 移除舊的錯誤訊息
    const oldError = overlay.querySelector('.auth-error');
    if (oldError) oldError.remove();

    // 添加新的錯誤訊息
    const errorDiv = document.createElement('div');
    errorDiv.className = 'auth-error';
    errorDiv.textContent = message;
    
    const card = overlay.querySelector('.auth-card');
    if (card) {
        card.appendChild(errorDiv);
    }
}
