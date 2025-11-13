import { platformAuth, serviceDb } from '/js/firebase-init.js';
import { showSuccess, showError } from '/js/notification.js';

const SERVICE_API_BASE = 'https://asia-east2-service-b9d4a.cloudfunctions.net';

const serviceNames = {
    dd: '線上點燈',
    nd: '年斗法會',
    ld: '禮斗法會',
    zy: '中元法會',
    ps: '普施法會',
    qj: '秋祭法會',
    ftp: '福田_信眾個人',
    ftc: '福田_企業團體',
    fty: '福田_Youth 會',
    bg: '建宮廟款',
    xy: '添香油'
};

async function callAPI(endpoint, data = null) {
    const user = platformAuth.currentUser;
    if (!user) throw new Error('未登入');
    
    const token = await user.getIdToken();
    
    const options = {
        method: data ? 'POST' : 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };
    
    if (data) {
        options.body = JSON.stringify({ data });
    }
    
    const response = await fetch(`${SERVICE_API_BASE}/${endpoint}`, options);
    const result = await response.json();
    
    if (!response.ok) {
        throw new Error(result.error?.message || '請求失敗');
    }
    
    return result.result;
}

async function loadServiceConfigs() {
    try {
        const response = await fetch(`${SERVICE_API_BASE}/getServiceConfigs`);
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error?.message || '載入失敗');
        }
        
        return result.result;
    } catch (error) {
        console.error('載入服務配置失敗:', error);
        throw error;
    }
}

async function updateServiceConfig(serviceType, config) {
    try {
        await callAPI('updateServiceConfig', {
            serviceType,
            ...config
        });
    } catch (error) {
        console.error('更新服務配置失敗:', error);
        throw error;
    }
}

function formatDate(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toISOString().split('T')[0];
}

const lastSavedConfigs = {};

function renderServiceTable(configs) {
    const tableContainer = document.getElementById('serviceConfigTable');
    
    const serviceTypes = ['dd', 'nd', 'ld', 'zy', 'ps', 'qj', 'ftp', 'ftc', 'fty', 'bg', 'xy'];
    
    serviceTypes.forEach(type => {
        lastSavedConfigs[type] = configs[type] || {
            serviceType: type,
            serviceName: serviceNames[type],
            isOpen: true,
            startDate: null,
            endDate: null,
            closedMessage: ''
        };
    });
    
    let html = `
        <table class="manage-table">
            <thead>
                <tr>
                    <th>服務名稱</th>
                    <th style="width: 150px;">開始日期</th>
                    <th style="width: 150px;">結束日期</th>
                    <th style="width: 200px;">關閉提示訊息</th>
                    <th style="width: 80px;">操作</th>
                    <th style="width: 200px;">開放狀態</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    serviceTypes.forEach(type => {
        const config = configs[type] || {
            serviceType: type,
            serviceName: serviceNames[type],
            isOpen: true,
            startDate: null,
            endDate: null,
            closedMessage: ''
        };
        
        html += `
            <tr id="row-${type}">
                <td><strong>${config.serviceName || serviceNames[type]}</strong></td>
                <td>
                    <input type="date" id="startDate-${type}" value="${formatDate(config.startDate)}" 
                           style="width: 100%; padding: 0.4rem; border: 1px solid #ddd; border-radius: 4px;">
                </td>
                <td>
                    <input type="date" id="endDate-${type}" value="${formatDate(config.endDate)}" 
                           style="width: 100%; padding: 0.4rem; border: 1px solid #ddd; border-radius: 4px;">
                </td>
                <td>
                    <input type="text" id="message-${type}" value="${config.closedMessage || ''}" 
                           placeholder="預計 3 月開放" 
                           style="width: 100%; padding: 0.4rem; border: 1px solid #ddd; border-radius: 4px;">
                </td>
                <td style="text-align: center;">
                    <button id="confirmMsg-${type}" 
                            style="padding: 0.4rem 0.8rem; background: #8A2BE2; color: white; border: none; border-radius: 4px; cursor: pointer; white-space: nowrap; font-size: 0.9rem;">
                        確認
                    </button>
                </td>
                <td>
                    <label class="toggle-switch">
                        <input type="checkbox" id="status-${type}" ${config.isOpen ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                    <span id="displayStatus-${type}" style="font-weight: bold; padding: 0.4rem 0.8rem; border-radius: 6px; display: inline-block; margin-left: 10px; ${config.isOpen ? 'color: #4CAF50; background: #E8F5E9;' : 'color: #E74C3C; background: #FFEBEE;'}">
                        ${config.isOpen ? '開放中' : '已關閉'}
                    </span>
                </td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
        
        <style>
        .toggle-switch {
            position: relative;
            display: inline-block;
            width: 50px;
            height: 24px;
        }
        
        .toggle-switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }
        
        .toggle-slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #ccc;
            transition: 0.4s;
            border-radius: 24px;
        }
        
        .toggle-slider:before {
            position: absolute;
            content: "";
            height: 18px;
            width: 18px;
            left: 3px;
            bottom: 3px;
            background-color: white;
            transition: 0.4s;
            border-radius: 50%;
        }
        
        input:checked + .toggle-slider {
            background-color: #4CAF50;
        }
        
        input:checked + .toggle-slider:before {
            transform: translateX(26px);
        }
        </style>
    `;
    
    tableContainer.innerHTML = html;
    
    const debounceTimers = {};
    const savingStatus = {};
    const pendingSaves = {};
    const pendingManualConfirm = {};
    
    const revertToLastSaved = (serviceType) => {
        const lastConfig = lastSavedConfigs[serviceType];
        if (!lastConfig) return;
        
        const checkbox = document.getElementById(`status-${serviceType}`);
        const startDateInput = document.getElementById(`startDate-${serviceType}`);
        const endDateInput = document.getElementById(`endDate-${serviceType}`);
        const messageInput = document.getElementById(`message-${serviceType}`);
        const displayStatus = document.getElementById(`displayStatus-${serviceType}`);
        
        checkbox.checked = lastConfig.isOpen;
        startDateInput.value = formatDate(lastConfig.startDate);
        endDateInput.value = formatDate(lastConfig.endDate);
        messageInput.value = lastConfig.closedMessage || '';
        
        displayStatus.textContent = lastConfig.isOpen ? '開放中' : '已關閉';
        displayStatus.style.color = lastConfig.isOpen ? '#4CAF50' : '#E74C3C';
        displayStatus.style.background = lastConfig.isOpen ? '#E8F5E9' : '#FFEBEE';
    };
    
    const executeSave = async (serviceType, isManualConfirm = false) => {
        try {
            const isOpen = document.getElementById(`status-${serviceType}`).checked;
            const startDate = document.getElementById(`startDate-${serviceType}`).value;
            const endDate = document.getElementById(`endDate-${serviceType}`).value;
            const closedMessage = document.getElementById(`message-${serviceType}`).value;
            
            const config = {
                isOpen,
                startDate: startDate || null,
                endDate: endDate || null,
                closedMessage: closedMessage || ''
            };
            
            await updateServiceConfig(serviceType, config);
            
            lastSavedConfigs[serviceType] = {
                ...lastSavedConfigs[serviceType],
                ...config
            };
            
            if (isManualConfirm) {
                showSuccess(`${serviceNames[serviceType]} 配置保存成功`);
            } else {
                showSuccess(`${serviceNames[serviceType]} 配置已自動保存`);
            }
            
        } catch (error) {
            console.error('保存失敗:', error);
            showError(`${serviceNames[serviceType]} 保存失敗: ${error.message}`);
            
            revertToLastSaved(serviceType);
        } finally {
            savingStatus[serviceType] = false;
            
            if (pendingSaves[serviceType]) {
                pendingSaves[serviceType] = false;
                const wasManualConfirm = pendingManualConfirm[serviceType] || false;
                pendingManualConfirm[serviceType] = false;
                savingStatus[serviceType] = true;
                executeSave(serviceType, wasManualConfirm);
            }
        }
    };
    
    const autoSave = (serviceType, immediate = false, isManualConfirm = false) => {
        if (debounceTimers[serviceType]) {
            clearTimeout(debounceTimers[serviceType]);
        }
        
        const saveAction = async () => {
            if (savingStatus[serviceType]) {
                pendingSaves[serviceType] = true;
                pendingManualConfirm[serviceType] = pendingManualConfirm[serviceType] || isManualConfirm;
                return;
            }
            
            savingStatus[serviceType] = true;
            await executeSave(serviceType, isManualConfirm);
        };
        
        if (immediate) {
            saveAction();
        } else {
            debounceTimers[serviceType] = setTimeout(saveAction, 500);
        }
    };
    
    serviceTypes.forEach(type => {
        const checkbox = document.getElementById(`status-${type}`);
        const confirmMsgBtn = document.getElementById(`confirmMsg-${type}`);
        const displayStatus = document.getElementById(`displayStatus-${type}`);
        
        checkbox.addEventListener('change', (e) => {
            const isOpen = e.target.checked;
            
            displayStatus.textContent = isOpen ? '開放中' : '已關閉';
            displayStatus.style.color = isOpen ? '#4CAF50' : '#E74C3C';
            displayStatus.style.background = isOpen ? '#E8F5E9' : '#FFEBEE';
            
            autoSave(type, true, false);
        });
        
        confirmMsgBtn.addEventListener('click', () => {
            autoSave(type, true, true);
        });
    });
}

export async function init() {
    try {
        if (!platformAuth.currentUser) {
            throw new Error('用戶未認證');
        }
        
        const configs = await loadServiceConfigs();
        renderServiceTable(configs);
        
        document.getElementById('mainApp').style.display = 'block';
        
        document.getElementById('logoutBtn').addEventListener('click', async () => {
            await platformAuth.signOut();
            window.location.href = '/';
        });
        
    } catch (error) {
        console.error('初始化失敗:', error);
        alert('載入失敗，請重新整理頁面');
    }
}
