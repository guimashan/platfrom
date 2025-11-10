/**
 * Patrol（巡邏點管理）控制器
 */

import { 
    initManagePage, 
    showMessage, 
    showLoading,
    hasPermission,
    manageAPI,
    API_ENDPOINTS
} from './manage-common.js';

let patrols = [];
let currentEditingPatrol = null;
let currentQRCanvas = null;
let qrGenerationInProgress = false;

// 初始化頁面
(async function init() {
    try {
        await initManagePage({
            requiredRoles: ['admin_checkin', 'superadmin'],
            activePage: 'patrol',
            onSuccess: async () => {
                await loadPatrols();
                setupEventListeners();
            }
        });
    } catch (error) {
        console.error('Patrol 初始化失敗:', error);
        showMessage('載入失敗: ' + error.message, 'error');
    }
})();

/**
 * 載入巡邏點列表
 */
async function loadPatrols() {
    try {
        showLoading(true);

        const result = await manageAPI(API_ENDPOINTS.getPatrols);
        patrols = result.patrols || [];

        renderPatrolList();

    } catch (error) {
        console.error('載入巡邏點失敗:', error);
        showMessage('載入巡邏點失敗: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * 渲染巡邏點列表
 */
function renderPatrolList() {
    const container = document.getElementById('patrolList');

    if (patrols.length === 0) {
        container.innerHTML = `
            <p style="text-align: center; color: #999; padding: 40px; grid-column: 1 / -1;">
                尚無巡邏點，點擊右上角「新增巡邏點」開始建立
            </p>
        `;
        return;
    }

    // 排序：辦公室優先，其他按名稱
    const sortedPatrols = [...patrols].sort((a, b) => {
        if (a.name === '辦公室') return -1;
        if (b.name === '辦公室') return 1;
        return a.name.localeCompare(b.name, 'zh-TW');
    });

    container.innerHTML = sortedPatrols.map(patrol => {
        const verificationMode = patrol.verificationMode || 'gps';
        const modeText = {
            'gps': '📍 GPS',
            'qr': '📷 QR Code',
            'both': '📍+📷 雙重驗證'
        }[verificationMode] || verificationMode;

        const isActive = patrol.active !== false;

        // 正規化座標為數字（防止字串導致 .toFixed 錯誤）
        const lat = patrol.lat != null ? parseFloat(patrol.lat) : null;
        const lng = patrol.lng != null ? parseFloat(patrol.lng) : null;
        const latStr = !isNaN(lat) ? lat.toFixed(6) : '-';
        const lngStr = !isNaN(lng) ? lng.toFixed(6) : '-';

        return `
            <div class="patrol-card-item">
                <div class="patrol-card-header">
                    <div>
                        <h3 class="patrol-name">${patrol.name}</h3>
                        <p class="patrol-coords">
                            ${latStr}, ${lngStr}
                        </p>
                    </div>
                    <span class="patrol-status-badge ${isActive ? 'active' : 'inactive'}">
                        ${isActive ? '✓ 啟用' : '✗ 停用'}
                    </span>
                </div>

                <div class="patrol-info">
                    <div class="patrol-info-item">
                        <span class="patrol-info-label">驗證模式:</span>
                        <span class="patrol-info-value">${modeText}</span>
                    </div>
                    <div class="patrol-info-item">
                        <span class="patrol-info-label">容許範圍:</span>
                        <span class="patrol-info-value">${patrol.tolerance || 50} 公尺</span>
                    </div>
                    <div class="patrol-info-item">
                        <span class="patrol-info-label">簽到間隔:</span>
                        <span class="patrol-info-value">${patrol.minInterval || 5} 分鐘</span>
                    </div>
                    <div class="patrol-info-item">
                        <span class="patrol-info-label">需要拍照:</span>
                        <span class="patrol-info-value">${patrol.requirePhoto ? '✓ 是' : '✗ 否'}</span>
                    </div>
                    <div class="patrol-info-item">
                        <span class="patrol-info-label">QR Code:</span>
                        <span class="patrol-info-value" style="font-size: 11px; font-family: monospace;">${patrol.qr || `PATROL_${patrol.id}`}</span>
                    </div>
                </div>

                <div class="patrol-actions">
                    <button class="btn-manage btn-primary btn-sm" onclick="editPatrol('${patrol.id}')">
                        ✏️ 編輯
                    </button>
                    <button class="btn-manage btn-outline btn-sm" onclick="viewPatrolQR('${patrol.id}')">
                        📱 查看 QR
                    </button>
                    <button class="btn-manage btn-warning btn-sm" onclick="togglePatrolStatus('${patrol.id}')">
                        ${isActive ? '⏸️ 停用' : '▶️ 啟用'}
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * 打開新增巡邏點 Modal
 */
window.openAddPatrolModal = function() {
    currentEditingPatrol = null;
    document.getElementById('modalTitle').textContent = '新增巡邏點';
    document.getElementById('patrolForm').reset();
    document.getElementById('patrolId').value = '';
    document.getElementById('patrolActive').value = 'true';
    document.getElementById('qrPreviewSection').style.display = 'none';
    
    document.getElementById('patrolModal').style.display = 'block';
};

/**
 * 編輯巡邏點
 */
window.editPatrol = async function(patrolId) {
    const patrol = patrols.find(p => p.id === patrolId);
    if (!patrol) return;

    currentEditingPatrol = patrol;
    document.getElementById('modalTitle').textContent = '編輯巡邏點';

    // 填充表單
    document.getElementById('patrolId').value = patrol.id;
    document.getElementById('patrolName').value = patrol.name || '';
    document.getElementById('patrolLat').value = patrol.lat || '';
    document.getElementById('patrolLng').value = patrol.lng || '';
    document.getElementById('patrolTolerance').value = patrol.tolerance || 50;
    document.getElementById('patrolVerificationMode').value = patrol.verificationMode || 'gps';
    document.getElementById('patrolMinInterval').value = patrol.minInterval || 5;
    document.getElementById('patrolRequirePhoto').value = patrol.requirePhoto ? 'true' : 'false';
    document.getElementById('patrolActive').value = patrol.active !== false ? 'true' : 'false';
    document.getElementById('patrolDescription').value = patrol.description || '';

    // 顯示 QR Code 預覽（await 確保完成）
    const qrCode = patrol.qr || `PATROL_${patrol.id}`;
    await generateQRCode(qrCode, patrol.name);
    document.getElementById('qrPreviewSection').style.display = 'block';

    document.getElementById('patrolModal').style.display = 'block';
};

/**
 * 關閉 Modal（取消任何進行中的 QR 生成）
 */
window.closePatrolModal = function() {
    document.getElementById('patrolModal').style.display = 'none';
    currentEditingPatrol = null;
    currentQRCanvas = null;
    qrGenerationInProgress = false;  // 標記取消
    
    // 清理顯示區域
    const container = document.getElementById('qrCodeDisplay');
    if (container) {
        container.innerHTML = '';
    }
    
    // 清理可能殘留的臨時 DOM 節點
    const tempDivs = document.querySelectorAll('div[style*="display: none"]');
    tempDivs.forEach(div => {
        if (div.querySelector('canvas') && div.parentNode === document.body) {
            document.body.removeChild(div);
        }
    });
};

/**
 * 查看巡邏點 QR Code
 */
window.viewPatrolQR = function(patrolId) {
    const patrol = patrols.find(p => p.id === patrolId);
    if (!patrol) return;

    editPatrol(patrolId);
};

/**
 * 切換巡邏點啟用/停用狀態
 */
window.togglePatrolStatus = async function(patrolId) {
    const patrol = patrols.find(p => p.id === patrolId);
    if (!patrol) return;

    const newStatus = !(patrol.active !== false);
    const action = newStatus ? '啟用' : '停用';

    if (!confirm(`確定要${action}「${patrol.name}」嗎？`)) {
        return;
    }

    try {
        showLoading(true);

        await manageAPI(API_ENDPOINTS.savePatrol, {
            method: 'POST',
            body: {
                ...patrol,
                active: newStatus
            }
        });

        showMessage(`已${action}巡邏點`, 'success');
        await loadPatrols();

    } catch (error) {
        console.error('更新狀態失敗:', error);
        showMessage('更新狀態失敗: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
};

/**
 * 生成帶有 Logo 的 QR Code
 * @returns {Promise<void>} 當 QR Code 和 Logo 都載入完成時 resolve
 */
async function generateQRCode(qrText, patrolName) {
    // 防止並行生成
    if (qrGenerationInProgress) {
        console.warn('QR Code 生成中，請稍候');
        return;
    }
    
    qrGenerationInProgress = true;
    
    try {
        const container = document.getElementById('qrCodeDisplay');
        if (!container) {
            throw new Error('QR Code 顯示容器不存在');
        }
        container.innerHTML = '';

        // 建立包裝容器
        const wrapper = document.createElement('div');
        wrapper.style.textAlign = 'center';
        wrapper.style.padding = '20px';

        // 標題
        const title = document.createElement('div');
        title.style.fontSize = '20px';
        title.style.fontWeight = 'bold';
        title.style.marginBottom = '15px';
        title.style.color = '#667eea';
        title.textContent = '🏛️ 龜馬山奉香簽到';
        wrapper.appendChild(title);

        // 步驟 1: 使用 QRCode.js 生成基礎 QR Code
        const tempDiv = document.createElement('div');
        tempDiv.style.display = 'none';
        tempDiv.setAttribute('data-qr-temp', 'true');  // 標記以便清理
        document.body.appendChild(tempDiv);

        let qrInstance;
        try {
            qrInstance = new QRCode(tempDiv, {
                text: qrText,
                width: 300,
                height: 300,
                colorDark: '#667eea',
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.H
            });
        } catch (error) {
            console.error('QRCode 實例化失敗:', error);
            throw error;
        }

        // 等待 QR Code 生成（監聽 canvas 出現，有超時保護）
        const qrCanvas = await Promise.race([
            new Promise((resolve) => {
                const checkCanvas = () => {
                    if (!qrGenerationInProgress) {
                        resolve(null);  // 已取消
                        return;
                    }
                    const canvas = tempDiv.querySelector('canvas');
                    if (canvas) {
                        resolve(canvas);
                    } else {
                        setTimeout(checkCanvas, 50);
                    }
                };
                checkCanvas();
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('QR Code 生成超時')), 5000))
        ]).catch(error => {
            console.warn('QR Code 生成失敗:', error.message);
            return null;
        });

        if (!qrCanvas) {
            // 取消或超時：靜默清理，不拋錯
            if (tempDiv && tempDiv.parentNode) {
                document.body.removeChild(tempDiv);
            }
            return;  // 靜默返回
        }

        // 步驟 2: 建立新 canvas 並加入 Logo
        const finalCanvas = document.createElement('canvas');
        const ctx = finalCanvas.getContext('2d');
        const size = 300;
        
        finalCanvas.width = size;
        finalCanvas.height = size;
        finalCanvas.style.margin = '10px auto';
        finalCanvas.style.display = 'block';
        finalCanvas.style.borderRadius = '8px';

        // 繪製 QR Code
        ctx.drawImage(qrCanvas, 0, 0, size, size);

        // 步驟 3: 載入並繪製 Logo（Promise 化以確保完成，超時降級）
        if (qrGenerationInProgress) {
            await Promise.race([
                new Promise((resolve) => {
                    const logo = new Image();
                    logo.crossOrigin = 'anonymous';
                    
                    logo.onload = function() {
                        if (!qrGenerationInProgress) {
                            resolve();  // 已取消，不繪製
                            return;
                        }
                        
                        const logoSize = size * 0.25;
                        const logoX = (size - logoSize) / 2;
                        const logoY = (size - logoSize) / 2;
                        
                        // 繪製白色圓形背景
                        ctx.fillStyle = '#ffffff';
                        ctx.beginPath();
                        ctx.arc(size / 2, size / 2, logoSize / 2 + 8, 0, 2 * Math.PI);
                        ctx.fill();

                        // 繪製 Logo（圓形裁切）
                        ctx.save();
                        ctx.beginPath();
                        ctx.arc(size / 2, size / 2, logoSize / 2, 0, 2 * Math.PI);
                        ctx.closePath();
                        ctx.clip();
                        ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
                        ctx.restore();

                        // 繪製邊框
                        ctx.strokeStyle = '#667eea';
                        ctx.lineWidth = 3;
                        ctx.beginPath();
                        ctx.arc(size / 2, size / 2, logoSize / 2 + 5, 0, 2 * Math.PI);
                        ctx.stroke();

                        resolve();
                    };

                    logo.onerror = function() {
                        console.warn('Logo 載入失敗，使用純 QR Code');
                        resolve(); // 降級為無 Logo 的 QR Code
                    };

                    logo.src = '/assets/guimashan-logo.png';
                }),
                new Promise((resolve) => setTimeout(() => {
                    console.warn('Logo 載入超時，使用純 QR Code');
                    resolve(); // 超時降級為無 Logo，不拋錯
                }, 3000))
            ]);
        }

        // 只有在沒被取消時才更新 UI
        if (qrGenerationInProgress) {
            wrapper.appendChild(finalCanvas);

            // 巡邏點名稱
            const nameLabel = document.createElement('div');
            nameLabel.style.fontSize = '18px';
            nameLabel.style.fontWeight = 'bold';
            nameLabel.style.marginTop = '15px';
            nameLabel.style.color = '#333';
            nameLabel.textContent = `📍 ${patrolName || '巡邏點'}`;
            wrapper.appendChild(nameLabel);

            // QR Code 內容
            const qrContent = document.createElement('div');
            qrContent.style.fontSize = '11px';
            qrContent.style.color = '#999';
            qrContent.style.marginTop = '8px';
            qrContent.style.fontFamily = 'monospace';
            qrContent.style.wordBreak = 'break-all';
            qrContent.textContent = qrText;
            wrapper.appendChild(qrContent);

            container.appendChild(wrapper);

            // 保存 canvas 供下載使用
            currentQRCanvas = finalCanvas;
        }

        // 清理臨時元素（確保移除）
        if (tempDiv && tempDiv.parentNode) {
            document.body.removeChild(tempDiv);
        }

    } catch (error) {
        console.error('生成 QR Code 失敗:', error);
        // 只有真正的錯誤才顯示訊息（取消和超時不顯示）
        if (qrGenerationInProgress) {
            showMessage('QR Code 生成失敗: ' + error.message, 'error');
        }
        // 不 re-throw，靜默處理
    } finally {
        qrGenerationInProgress = false;
    }
}

/**
 * 下載 QR Code（Logo 已在 generateQRCode 中完成載入）
 */
window.downloadQRCode = function() {
    if (!currentQRCanvas) {
        showMessage('QR Code 尚未生成', 'error');
        return;
    }

    const patrolName = currentEditingPatrol?.name || '巡邏點';
    const filename = `QR_${patrolName}_${new Date().getTime()}.png`;

    // 下載當前的 canvas（Logo 已嵌入）
    const link = document.createElement('a');
    link.download = filename;
    link.href = currentQRCanvas.toDataURL('image/png');
    link.click();

    showMessage('QR Code 已下載', 'success');
};

/**
 * 更新 QR Code（隨機生成新的）
 */
window.refreshQRCode = async function() {
    if (!currentEditingPatrol) return;

    if (!confirm('確定要更新 QR Code 嗎？舊的 QR Code 將失效。')) {
        return;
    }

    try {
        showLoading(true);

        const newQRCode = `PATROL_${currentEditingPatrol.id}_${Date.now()}`;

        await manageAPI(API_ENDPOINTS.savePatrol, {
            method: 'POST',
            body: {
                ...currentEditingPatrol,
                qr: newQRCode
            }
        });

        showMessage('QR Code 已更新', 'success');
        
        // 重新生成 QR Code 顯示（await 確保完成）
        await generateQRCode(newQRCode, currentEditingPatrol.name);
        
        await loadPatrols();

    } catch (error) {
        console.error('更新 QR Code 失敗:', error);
        showMessage('更新 QR Code 失敗: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
};

/**
 * 設置事件監聽器
 */
function setupEventListeners() {
    // 新增巡邏點按鈕
    document.getElementById('addPatrolBtn').addEventListener('click', openAddPatrolModal);

    // 下載 QR Code 按鈕
    document.getElementById('downloadQRBtn').addEventListener('click', downloadQRCode);

    // 更新 QR Code 按鈕
    document.getElementById('refreshQRBtn').addEventListener('click', refreshQRCode);

    // 表單提交
    document.getElementById('patrolForm').addEventListener('submit', handleFormSubmit);

    // Modal 點擊外部關閉
    window.onclick = function(event) {
        const modal = document.getElementById('patrolModal');
        if (event.target === modal) {
            closePatrolModal();
        }
    };
}

/**
 * 處理表單提交
 */
async function handleFormSubmit(e) {
    e.preventDefault();

    const patrolId = document.getElementById('patrolId').value;
    const isEdit = !!patrolId;

    const patrolData = {
        id: patrolId || undefined,
        name: document.getElementById('patrolName').value.trim(),
        lat: parseFloat(document.getElementById('patrolLat').value),
        lng: parseFloat(document.getElementById('patrolLng').value),
        tolerance: parseInt(document.getElementById('patrolTolerance').value) || 50,
        verificationMode: document.getElementById('patrolVerificationMode').value,
        minInterval: parseInt(document.getElementById('patrolMinInterval').value) || 5,
        requirePhoto: document.getElementById('patrolRequirePhoto').value === 'true',
        active: document.getElementById('patrolActive').value === 'true',
        description: document.getElementById('patrolDescription').value.trim() || '',
        qr: currentEditingPatrol?.qr || `PATROL_${patrolId || Date.now()}`
    };

    // 驗證
    if (!patrolData.name) {
        showMessage('請輸入巡邏點名稱', 'error');
        return;
    }

    if (isNaN(patrolData.lat) || isNaN(patrolData.lng)) {
        showMessage('請輸入有效的 GPS 座標', 'error');
        return;
    }

    try {
        showLoading(true);

        await manageAPI(API_ENDPOINTS.savePatrol, {
            method: 'POST',
            body: patrolData
        });

        showMessage(isEdit ? '巡邏點已更新' : '巡邏點已新增', 'success');
        closePatrolModal();
        await loadPatrols();

    } catch (error) {
        console.error('儲存失敗:', error);
        showMessage('儲存失敗: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}
