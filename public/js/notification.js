/**
 * 通用網頁通知系統
 * 替代瀏覽器 alert()，提供更美觀的使用者體驗
 */

/**
 * 顯示網頁通知視窗
 * @param {string} message - 通知訊息
 * @param {object} options - 配置選項
 * @param {string} options.type - 通知類型: 'error', 'warning', 'success', 'info'
 * @param {string} options.title - 通知標題（可選）
 * @param {string} options.buttonText - 按鈕文字（默認：確定）
 * @param {function} options.onConfirm - 確認回調函數
 */
export function showNotification(message, options = {}) {
    const {
        type = 'info',
        title = null,
        buttonText = '確定',
        onConfirm = null
    } = options;

    // 通知類型配置
    const typeConfig = {
        error: {
            icon: '❌',
            color: '#E74C3C',
            defaultTitle: '錯誤'
        },
        warning: {
            icon: '⚠️',
            color: '#F39C12',
            defaultTitle: '警告'
        },
        success: {
            icon: '✅',
            color: '#27AE60',
            defaultTitle: '成功'
        },
        info: {
            icon: 'ℹ️',
            color: '#3498DB',
            defaultTitle: '提示'
        }
    };

    const config = typeConfig[type] || typeConfig.info;
    const displayTitle = title || config.defaultTitle;

    // 創建遮罩層
    const overlay = document.createElement('div');
    overlay.id = 'notificationOverlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: fadeIn 0.3s ease-in-out;
    `;

    // 創建通知框
    const alertBox = document.createElement('div');
    alertBox.style.cssText = `
        background: white;
        padding: 2rem;
        border-radius: 12px;
        max-width: 450px;
        width: 90%;
        text-align: center;
        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        animation: slideIn 0.3s ease-out;
    `;

    // 圖標
    const icon = document.createElement('div');
    icon.style.cssText = 'font-size: 4rem; margin-bottom: 1rem;';
    icon.textContent = config.icon;

    // 標題
    const titleElement = document.createElement('h2');
    titleElement.style.cssText = `color: ${config.color}; margin-bottom: 1rem; font-size: 1.5rem; font-weight: 700;`;
    titleElement.textContent = displayTitle;

    // 訊息內容
    const messageElement = document.createElement('p');
    messageElement.style.cssText = 'color: #666; margin-bottom: 1.5rem; line-height: 1.6; font-size: 1rem; white-space: pre-line;';
    messageElement.textContent = message;

    // 確定按鈕
    const button = document.createElement('button');
    button.style.cssText = `
        background: ${config.color};
        color: white;
        border: none;
        padding: 0.75rem 2rem;
        border-radius: 6px;
        font-size: 1rem;
        cursor: pointer;
        font-weight: 500;
        transition: opacity 0.2s;
    `;
    button.textContent = buttonText;
    button.onmouseover = () => button.style.opacity = '0.8';
    button.onmouseout = () => button.style.opacity = '1';
    button.onclick = () => {
        closeNotification(overlay);
        if (onConfirm) onConfirm();
    };

    // 組裝通知框
    alertBox.appendChild(icon);
    alertBox.appendChild(titleElement);
    alertBox.appendChild(messageElement);
    alertBox.appendChild(button);
    overlay.appendChild(alertBox);

    // 添加 CSS 動畫
    if (!document.getElementById('notificationStyles')) {
        const style = document.createElement('style');
        style.id = 'notificationStyles';
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
            @keyframes slideIn {
                from { transform: translateY(-50px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }

    // 顯示通知
    document.body.insertBefore(overlay, document.body.firstChild);

    // 點擊遮罩層也可以關閉
    overlay.onclick = (e) => {
        if (e.target === overlay) {
            closeNotification(overlay);
            if (onConfirm) onConfirm();
        }
    };

    // ESC 鍵關閉
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            closeNotification(overlay);
            if (onConfirm) onConfirm();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
}

/**
 * 關閉通知視窗
 */
function closeNotification(overlay) {
    overlay.style.animation = 'fadeOut 0.2s ease-in-out';
    setTimeout(() => overlay.remove(), 200);
}

/**
 * 快捷方法：顯示錯誤通知
 */
export function showError(message, options = {}) {
    showNotification(message, { ...options, type: 'error' });
}

/**
 * 快捷方法：顯示警告通知
 */
export function showWarning(message, options = {}) {
    showNotification(message, { ...options, type: 'warning' });
}

/**
 * 快捷方法：顯示成功通知
 */
export function showSuccess(message, options = {}) {
    showNotification(message, { ...options, type: 'success' });
}

/**
 * 快捷方法：顯示信息通知
 */
export function showInfo(message, options = {}) {
    showNotification(message, { ...options, type: 'info' });
}
