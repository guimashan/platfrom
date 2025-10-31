/**
 * 巡邏點管理模組
 * 允許 admin_checkin 和 superadmin 新增/編輯巡邏點
 */

import { platformAuth, platformDb, checkinDb } from '/js/firebase-init.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { 
    collection, 
    getDocs, 
    doc,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { logout } from '/js/auth.js';

let currentUser = null;
let userRoles = [];
let editingPatrolId = null;

// 監聽認證狀態
onAuthStateChanged(platformAuth, async (user) => {
    if (!user) {
        window.location.href = '/';
        return;
    }
    currentUser = user;
    await checkPermission();
});

// 檢查權限
async function checkPermission() {
    try {
        const userRef = doc(platformDb, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
            alert('無法取得使用者資料');
            window.location.href = '/';
            return;
        }
        
        const userData = userSnap.data();
        userRoles = userData.roles || [];
        
        // 檢查是否有 admin_checkin 或 superadmin 權限
        const hasPermission = userRoles.includes('admin_checkin') || userRoles.includes('superadmin');
        
        if (!hasPermission) {
            alert('您沒有權限訪問此頁面');
            window.location.href = '/';
            return;
        }
        
        await loadPatrols();
    } catch (error) {
        console.error('檢查權限失敗:', error);
        alert('載入失敗,請重新整理頁面');
    }
}

// 載入巡邏點列表
async function loadPatrols() {
    const patrolsList = document.getElementById('patrolsList');
    
    try {
        patrolsList.innerHTML = '<p>載入中...</p>';
        
        const patrolsRef = collection(checkinDb, 'patrols');
        const q = query(patrolsRef, orderBy('name'));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            patrolsList.innerHTML = '<p class="no-data">尚無巡邏點資料</p>';
            return;
        }
        
        let html = '';
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            html += renderPatrolItem(docSnap.id, data);
        });
        
        patrolsList.innerHTML = html;
        
        // 綁定編輯和刪除按鈕事件
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', handleEdit);
        });
        
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', handleDelete);
        });
        
    } catch (error) {
        console.error('載入巡邏點失敗:', error);
        patrolsList.innerHTML = '<p class="error">載入失敗,請重新整理頁面</p>';
    }
}

// 渲染巡邏點項目
function renderPatrolItem(id, data) {
    return `
        <div class="patrol-item">
            <div class="patrol-info">
                <h4>${data.name}</h4>
                <div class="patrol-details">
                    <div>座標: ${data.lat.toFixed(6)}, ${data.lng.toFixed(6)}</div>
                    <div>容許距離: ${data.tolerance || 30} 公尺</div>
                </div>
            </div>
            <div class="patrol-actions">
                <button class="btn btn-secondary btn-small edit-btn" data-id="${id}">編輯</button>
                <button class="btn btn-secondary btn-small delete-btn" data-id="${id}">刪除</button>
            </div>
        </div>
    `;
}

// 處理新增巡邏點
function handleAdd() {
    editingPatrolId = null;
    document.getElementById('modalTitle').textContent = '新增巡邏點';
    document.getElementById('patrolForm').reset();
    document.getElementById('patrolTolerance').value = '30';
    showModal();
}

// 處理編輯巡邏點
async function handleEdit(e) {
    const patrolId = e.target.dataset.id;
    editingPatrolId = patrolId;
    
    try {
        const patrolRef = doc(checkinDb, 'patrols', patrolId);
        const patrolSnap = await getDoc(patrolRef);
        
        if (!patrolSnap.exists()) {
            alert('找不到巡邏點資料');
            return;
        }
        
        const data = patrolSnap.data();
        
        document.getElementById('modalTitle').textContent = '編輯巡邏點';
        document.getElementById('patrolName').value = data.name;
        document.getElementById('patrolLat').value = data.lat;
        document.getElementById('patrolLng').value = data.lng;
        document.getElementById('patrolTolerance').value = data.tolerance || 30;
        
        showModal();
    } catch (error) {
        console.error('載入巡邏點資料失敗:', error);
        alert('載入失敗');
    }
}

// 處理刪除巡邏點
async function handleDelete(e) {
    const patrolId = e.target.dataset.id;
    
    if (!confirm('確定要刪除此巡邏點嗎?')) {
        return;
    }
    
    try {
        await deleteDoc(doc(checkinDb, 'patrols', patrolId));
        alert('刪除成功');
        await loadPatrols();
    } catch (error) {
        console.error('刪除失敗:', error);
        alert('刪除失敗: ' + error.message);
    }
}

// 處理表單提交
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = {
        name: document.getElementById('patrolName').value.trim(),
        lat: parseFloat(document.getElementById('patrolLat').value),
        lng: parseFloat(document.getElementById('patrolLng').value),
        tolerance: parseInt(document.getElementById('patrolTolerance').value),
        updatedAt: serverTimestamp()
    };
    
    // 驗證資料
    if (!formData.name || isNaN(formData.lat) || isNaN(formData.lng) || isNaN(formData.tolerance)) {
        alert('請填寫所有必填欄位');
        return;
    }
    
    if (formData.tolerance < 10 || formData.tolerance > 100) {
        alert('容許距離必須在 10-100 公尺之間');
        return;
    }
    
    try {
        if (editingPatrolId) {
            // 更新現有巡邏點
            await updateDoc(doc(checkinDb, 'patrols', editingPatrolId), formData);
            alert('更新成功');
        } else {
            // 新增巡邏點
            formData.createdAt = serverTimestamp();
            await addDoc(collection(checkinDb, 'patrols'), formData);
            alert('新增成功');
        }
        
        hideModal();
        await loadPatrols();
    } catch (error) {
        console.error('儲存失敗:', error);
        alert('儲存失敗: ' + error.message);
    }
}

// 顯示 Modal
function showModal() {
    document.getElementById('patrolModal').classList.remove('hidden');
}

// 隱藏 Modal
function hideModal() {
    document.getElementById('patrolModal').classList.add('hidden');
    document.getElementById('patrolForm').reset();
    editingPatrolId = null;
}

// 綁定事件
document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logoutBtn');
    const addPatrolBtn = document.getElementById('addPatrolBtn');
    const closeModal = document.getElementById('closeModal');
    const cancelBtn = document.getElementById('cancelBtn');
    const patrolForm = document.getElementById('patrolForm');
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    if (addPatrolBtn) {
        addPatrolBtn.addEventListener('click', handleAdd);
    }
    
    if (closeModal) {
        closeModal.addEventListener('click', hideModal);
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', hideModal);
    }
    
    if (patrolForm) {
        patrolForm.addEventListener('submit', handleFormSubmit);
    }
    
    // 點擊 Modal 外部關閉
    document.getElementById('patrolModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'patrolModal') {
            hideModal();
        }
    });
});
