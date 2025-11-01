/**
 * 巡邏點管理
 */

import { platformAuth, platformDb, API_ENDPOINTS } from '/js/firebase-init.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { logout } from '/js/auth.js';
import { callAPI } from '/js/api-helper.js';

let currentUser = null;
let patrols = [];
let editingPatrolId = null;

onAuthStateChanged(platformAuth, async (user) => {
    if (!user) {
        window.location.href = '/checkin/manage/index.html';
        return;
    }
    
    try {
        const userDoc = await getDoc(doc(platformDb, 'users', user.uid));
        if (!userDoc.exists()) {
            alert('找不到用戶資料');
            window.location.href = '/';
            return;
        }
        
        const userData = userDoc.data();
        const roles = userData.roles || [];
        
        const hasPermission = roles.some(role => 
            role === 'admin_checkin' || role === 'superadmin'
        );
        
        if (!hasPermission) {
            alert('您沒有權限存取此頁面');
            window.location.href = '/';
            return;
        }
        
        currentUser = user;
        await init();
    } catch (error) {
        console.error('權限檢查失敗:', error);
        alert('權限驗證失敗');
        window.location.href = '/';
    }
});

async function init() {
    await loadTestModeStatus();
    await loadPatrols();
}

async function loadTestModeStatus() {
    try {
        const result = await callAPI(API_ENDPOINTS.getTestModeStatus, {
            method: 'GET'
        });
        
        const testMode = result.testMode || false;
        updateTestModeUI(testMode);
    } catch (error) {
        console.error('載入測試模式失敗:', error);
    }
}

function updateTestModeUI(enabled) {
    const statusBadge = document.getElementById('testModeStatus');
    const toggleBtn = document.getElementById('toggleTestMode');
    
    if (enabled) {
        statusBadge.textContent = '已開啟';
        statusBadge.className = 'badge warning';
        toggleBtn.textContent = '關閉測試模式';
        toggleBtn.className = 'btn btn-secondary';
    } else {
        statusBadge.textContent = '已關閉';
        statusBadge.className = 'badge success';
        toggleBtn.textContent = '開啟測試模式';
        toggleBtn.className = 'btn btn-primary';
    }
    
    toggleBtn.disabled = false;
}

async function toggleTestMode() {
    const toggleBtn = document.getElementById('toggleTestMode');
    const currentStatus = document.getElementById('testModeStatus').textContent === '已開啟';
    
    if (!confirm(`確定要${currentStatus ? '關閉' : '開啟'}測試模式嗎？`)) {
        return;
    }
    
    toggleBtn.disabled = true;
    toggleBtn.textContent = '處理中...';
    
    try {
        const result = await callAPI(API_ENDPOINTS.updateTestMode, {
            method: 'POST',
            body: JSON.stringify({
                testMode: !currentStatus
            })
        });
        
        updateTestModeUI(result.testMode);
        alert(`測試模式已${result.testMode ? '開啟' : '關閉'}`);
    } catch (error) {
        console.error('切換測試模式失敗:', error);
        alert('操作失敗，請稍後再試');
        toggleBtn.disabled = false;
    }
}

async function loadPatrols() {
    const patrolsList = document.getElementById('patrolsList');
    
    try {
        const result = await callAPI(API_ENDPOINTS.getPatrols, {
            method: 'GET'
        });
        
        patrols = result.patrols || [];
        renderPatrols();
    } catch (error) {
        console.error('載入巡邏點失敗:', error);
        patrolsList.innerHTML = '<p class="error">載入失敗，請重新整理頁面</p>';
    }
}

function renderPatrols() {
    const patrolsList = document.getElementById('patrolsList');
    
    if (patrols.length === 0) {
        patrolsList.innerHTML = '<p class="no-data">尚無巡邏點</p>';
        return;
    }
    
    let html = `
        <table>
            <thead>
                <tr>
                    <th>名稱</th>
                    <th>座標</th>
                    <th>容許距離</th>
                    <th>測試模式</th>
                    <th>操作</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    patrols.forEach(patrol => {
        const testModeBadge = patrol.skipDistanceCheck ? 
            '<span class="badge warning">已開啟</span>' : 
            '<span class="badge success">已關閉</span>';
        
        html += `
            <tr>
                <td><strong>${patrol.name}</strong></td>
                <td>${patrol.lat?.toFixed(6)}, ${patrol.lng?.toFixed(6)}</td>
                <td>${patrol.radius || 30} 公尺</td>
                <td>${testModeBadge}</td>
                <td>
                    <button class="btn btn-sm btn-secondary" onclick="window.editPatrol('${patrol.id}')">編輯</button>
                    <button class="btn btn-sm btn-primary" onclick="window.showQRCode('${patrol.id}')">QR Code</button>
                    <button class="btn btn-sm btn-danger" onclick="window.deletePatrol('${patrol.id}')">刪除</button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    patrolsList.innerHTML = html;
}

function openPatrolModal(patrolId = null) {
    const modal = document.getElementById('patrolModal');
    const modalTitle = document.getElementById('modalTitle');
    const form = document.getElementById('patrolForm');
    
    editingPatrolId = patrolId;
    
    if (patrolId) {
        const patrol = patrols.find(p => p.id === patrolId);
        if (!patrol) return;
        
        modalTitle.textContent = '編輯巡邏點';
        document.getElementById('patrolName').value = patrol.name || '';
        document.getElementById('patrolLat').value = patrol.lat || '';
        document.getElementById('patrolLng').value = patrol.lng || '';
        document.getElementById('patrolRadius').value = patrol.radius || 30;
        document.getElementById('skipDistanceCheck').checked = patrol.skipDistanceCheck || false;
    } else {
        modalTitle.textContent = '新增巡邏點';
        form.reset();
        document.getElementById('skipDistanceCheck').checked = false;
    }
    
    modal.classList.remove('hidden');
}

function closePatrolModal() {
    document.getElementById('patrolModal').classList.add('hidden');
    editingPatrolId = null;
}

async function savePatrol(event) {
    event.preventDefault();
    
    const name = document.getElementById('patrolName').value.trim();
    const lat = parseFloat(document.getElementById('patrolLat').value);
    const lng = parseFloat(document.getElementById('patrolLng').value);
    const radius = parseInt(document.getElementById('patrolRadius').value);
    const skipDistanceCheck = document.getElementById('skipDistanceCheck').checked;
    
    if (!name || isNaN(lat) || isNaN(lng) || isNaN(radius)) {
        alert('請填寫所有必填欄位');
        return;
    }
    
    try {
        const patrolData = {
            name,
            lat,
            lng,
            radius,
            skipDistanceCheck,
            active: true
        };
        
        if (editingPatrolId) {
            patrolData.id = editingPatrolId;
        }
        
        await callAPI(API_ENDPOINTS.savePatrol, {
            method: 'POST',
            body: JSON.stringify(patrolData)
        });
        
        closePatrolModal();
        await loadPatrols();
        alert('儲存成功');
    } catch (error) {
        console.error('儲存失敗:', error);
        alert('儲存失敗：' + error.message);
    }
}

async function deletePatrol(patrolId) {
    const patrol = patrols.find(p => p.id === patrolId);
    if (!patrol) return;
    
    if (!confirm(`確定要刪除「${patrol.name}」嗎？此操作無法復原！`)) {
        return;
    }
    
    try {
        await callAPI(API_ENDPOINTS.deletePatrol, {
            method: 'POST',
            body: JSON.stringify({ patrolId })
        });
        
        await loadPatrols();
        alert('刪除成功');
    } catch (error) {
        console.error('刪除失敗:', error);
        alert('刪除失敗：' + error.message);
    }
}

function showQRCode(patrolId) {
    const patrol = patrols.find(p => p.id === patrolId);
    if (!patrol) return;
    
    const modal = document.getElementById('qrModal');
    const title = document.getElementById('qrModalTitle');
    const container = document.getElementById('qrCodeContainer');
    
    title.textContent = `${patrol.name} - QR Code`;
    container.innerHTML = '';
    
    const qrData = `PATROL_${patrolId}`;
    
    // 使用 davidshimjs-qrcodejs 生成 QR Code
    try {
        new QRCode(container, {
            text: qrData,
            width: 300,
            height: 300,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
        });
        
        // 設置下載功能
        setTimeout(() => {
            const canvas = container.querySelector('canvas');
            if (canvas) {
                canvas.style.border = '2px solid #ddd';
                canvas.style.borderRadius = '8px';
                
                document.getElementById('downloadQrBtn').onclick = () => {
                    const link = document.createElement('a');
                    link.download = `QRCode_${patrol.name}.png`;
                    link.href = canvas.toDataURL();
                    link.click();
                };
            }
        }, 100);
        
    } catch (error) {
        console.error('QR Code 生成失敗:', error);
        container.innerHTML = '<p class="error">生成失敗</p>';
    }
    
    modal.classList.remove('hidden');
}

function closeQRModal() {
    document.getElementById('qrModal').classList.add('hidden');
}

function useCurrentLocation() {
    if (!navigator.geolocation) {
        alert('您的瀏覽器不支援定位功能');
        return;
    }
    
    const btn = document.getElementById('useLocationBtn');
    btn.disabled = true;
    btn.textContent = '定位中...';
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            document.getElementById('patrolLat').value = position.coords.latitude.toFixed(6);
            document.getElementById('patrolLng').value = position.coords.longitude.toFixed(6);
            btn.disabled = false;
            btn.textContent = '📍 使用當前位置';
            alert('已自動填入當前位置');
        },
        (error) => {
            console.error('定位失敗:', error);
            alert('定位失敗，請手動輸入座標');
            btn.disabled = false;
            btn.textContent = '📍 使用當前位置';
        }
    );
}

window.editPatrol = openPatrolModal;
window.deletePatrol = deletePatrol;
window.showQRCode = showQRCode;

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    document.getElementById('toggleTestMode')?.addEventListener('click', toggleTestMode);
    document.getElementById('addPatrolBtn')?.addEventListener('click', () => openPatrolModal());
    document.getElementById('closeModal')?.addEventListener('click', closePatrolModal);
    document.getElementById('cancelBtn')?.addEventListener('click', closePatrolModal);
    document.getElementById('patrolForm')?.addEventListener('submit', savePatrol);
    document.getElementById('useLocationBtn')?.addEventListener('click', useCurrentLocation);
    document.getElementById('closeQrModal')?.addEventListener('click', closeQRModal);
});
