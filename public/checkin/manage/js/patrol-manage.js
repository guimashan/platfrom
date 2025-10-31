/**
 * 巡邏點管理
 */

import { platformAuth, platformDb, checkinDb } from '/js/firebase-init.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { 
    collection, 
    doc,
    getDocs,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { logout } from '/js/auth.js';

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
        const role = userData.role || 'user';
        
        if (role !== 'admin' && role !== 'SuperAdmin') {
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
        const settingsDoc = await getDoc(doc(checkinDb, 'settings', 'system'));
        const testMode = settingsDoc.exists() ? settingsDoc.data().testMode === true : false;
        
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
        await setDoc(doc(checkinDb, 'settings', 'system'), {
            testMode: !currentStatus,
            updatedAt: new Date(),
            updatedBy: currentUser.uid
        });
        
        updateTestModeUI(!currentStatus);
        alert(`測試模式已${!currentStatus ? '開啟' : '關閉'}`);
    } catch (error) {
        console.error('切換測試模式失敗:', error);
        alert('操作失敗，請稍後再試');
        toggleBtn.disabled = false;
    }
}

async function loadPatrols() {
    const patrolsList = document.getElementById('patrolsList');
    
    try {
        const patrolsRef = collection(checkinDb, 'patrols');
        const snapshot = await getDocs(patrolsRef);
        
        patrols = [];
        snapshot.forEach(doc => {
            patrols.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
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
                    <th>操作</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    patrols.forEach(patrol => {
        html += `
            <tr>
                <td><strong>${patrol.name}</strong></td>
                <td>${patrol.lat?.toFixed(6)}, ${patrol.lng?.toFixed(6)}</td>
                <td>${patrol.radius || 30} 公尺</td>
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
    } else {
        modalTitle.textContent = '新增巡邏點';
        form.reset();
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
            updatedAt: new Date(),
            updatedBy: currentUser.uid
        };
        
        if (editingPatrolId) {
            await updateDoc(doc(checkinDb, 'patrols', editingPatrolId), patrolData);
        } else {
            const newId = name.toLowerCase().replace(/\s+/g, '-');
            patrolData.createdAt = new Date();
            patrolData.createdBy = currentUser.uid;
            await setDoc(doc(checkinDb, 'patrols', newId), patrolData);
        }
        
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
        await deleteDoc(doc(checkinDb, 'patrols', patrolId));
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
    
    QRCode.toCanvas(qrData, {
        width: 300,
        margin: 2,
        color: {
            dark: '#000000',
            light: '#FFFFFF'
        }
    }, (error, canvas) => {
        if (error) {
            console.error('QR Code 生成失敗:', error);
            container.innerHTML = '<p class="error">生成失敗</p>';
            return;
        }
        
        canvas.style.border = '2px solid #ddd';
        canvas.style.borderRadius = '8px';
        container.appendChild(canvas);
        
        document.getElementById('downloadQrBtn').onclick = () => {
            const link = document.createElement('a');
            link.download = `QRCode_${patrol.name}.png`;
            link.href = canvas.toDataURL();
            link.click();
        };
    });
    
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
