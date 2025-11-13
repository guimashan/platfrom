const SERVICE_API_BASE = 'https://asia-east2-service-b9d4a.cloudfunctions.net';

export async function checkServiceAvailability(serviceType) {
    try {
        const response = await fetch(`${SERVICE_API_BASE}/getServiceConfigs`);
        const result = await response.json();
        
        if (!response.ok) {
            console.error('無法載入服務配置:', result);
            return { isOpen: true };
        }
        
        const config = result.result[serviceType];
        
        if (!config) {
            return { isOpen: true };
        }
        
        return config;
    } catch (error) {
        console.error('檢查服務狀態失敗:', error);
        return { isOpen: true };
    }
}

export function showServiceClosedAlert(config) {
    const overlay = document.createElement('div');
    overlay.id = 'serviceClosedOverlay';
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
    `;
    
    const alertBox = document.createElement('div');
    alertBox.style.cssText = `
        background: white;
        padding: 2rem;
        border-radius: 12px;
        max-width: 500px;
        text-align: center;
        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
    `;
    
    const icon = document.createElement('div');
    icon.style.cssText = 'font-size: 4rem; margin-bottom: 1rem;';
    icon.textContent = '⚠️';
    
    const title = document.createElement('h2');
    title.style.cssText = 'color: #E74C3C; margin-bottom: 1rem; font-size: 1.5rem;';
    title.textContent = '此服務目前未開放報名';
    
    const message = document.createElement('p');
    message.style.cssText = 'color: #666; margin-bottom: 1.5rem; line-height: 1.6; font-size: 1rem;';
    
    if (config.closedMessage) {
        message.textContent = config.closedMessage;
    } else if (config.startDate) {
        const date = new Date(config.startDate);
        message.textContent = `預計 ${date.getMonth() + 1}/${date.getDate()} 開放報名`;
    } else {
        message.textContent = '敬請期待開放時間';
    }
    
    const button = document.createElement('button');
    button.style.cssText = `
        background: #8A2BE2;
        color: white;
        border: none;
        padding: 0.75rem 2rem;
        border-radius: 6px;
        font-size: 1rem;
        cursor: pointer;
    `;
    button.textContent = '返回服務列表';
    button.onclick = () => {
        window.location.href = '/service/service.html';
    };
    
    alertBox.appendChild(icon);
    alertBox.appendChild(title);
    alertBox.appendChild(message);
    alertBox.appendChild(button);
    overlay.appendChild(alertBox);
    document.body.insertBefore(overlay, document.body.firstChild);
    
    // 確保按鈕不被 disableAllFormInputs 禁用
    button.disabled = false;
    button.style.opacity = '1';
    button.style.cursor = 'pointer';
}

export function disableAllFormInputs() {
    const inputs = document.querySelectorAll('input, select, textarea, button');
    inputs.forEach(input => {
        // 不禁用通知視窗內的按鈕
        if (input.closest('#serviceClosedOverlay')) {
            return;
        }
        input.disabled = true;
        input.style.opacity = '0.5';
        input.style.cursor = 'not-allowed';
    });
}
