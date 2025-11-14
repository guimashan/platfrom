import { platformAuth, platformDb, API_ENDPOINTS } from '/js/firebase-init.js';
import { 
    collection, 
    doc,
    getDocs,
    getDoc,
    updateDoc
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { logout } from '/js/auth.js';

let currentUser = null;
let allUsers = [];
let filteredUsers = [];
let editingUserId = null;

export async function init() {
    try {
        currentUser = platformAuth.currentUser;
        
        if (!currentUser) {
            console.error('無法取得用戶資訊');
            window.location.href = '/';
            return;
        }
        
        const mainApp = document.getElementById('mainApp');
        if (mainApp) {
            mainApp.style.display = 'block';
        }
        
        await loadUsers();
        
        document.getElementById('searchBtn').addEventListener('click', filterUsers);
        document.getElementById('searchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') filterUsers();
        });
        document.getElementById('saveUserBtn').addEventListener('click', saveUser);
        
    } catch (error) {
        console.error('初始化失敗:', error);
        alert('載入資料失敗，請重新整理頁面');
    }
}

async function loadUsers() {
    const usersList = document.getElementById('usersList');
    
    try {
        usersList.innerHTML = '<p class="loading">載入用戶資料中...</p>';
        
        const usersRef = collection(platformDb, 'users');
        const snapshot = await getDocs(usersRef);
        
        allUsers = [];
        snapshot.forEach(doc => {
            allUsers.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        allUsers.sort((a, b) => {
            const aName = a.displayName || '';
            const bName = b.displayName || '';
            return aName.localeCompare(bName, 'zh-TW');
        });
        
        const serviceRelatedRoles = ['poweruser_service', 'admin_service', 'superadmin'];
        filteredUsers = allUsers.filter(user => {
            const userRoles = user.roles || [];
            return userRoles.some(role => serviceRelatedRoles.includes(role));
        });
        
        console.log(`篩選後顯示 ${filteredUsers.length} 個神務相關用戶（總用戶 ${allUsers.length} 個）`);
        renderUsers();
        
    } catch (error) {
        console.error('載入用戶失敗:', error);
        usersList.innerHTML = '<p class="error">載入失敗，請重新整理頁面</p>';
    }
}

function renderUsers() {
    const usersList = document.getElementById('usersList');
    
    if (filteredUsers.length === 0) {
        usersList.innerHTML = '<p class="no-data">沒有找到符合的用戶</p>';
        return;
    }
    
    let html = `
        <table class="manage-table">
            <thead>
                <tr>
                    <th style="width: 60px;">頭像</th>
                    <th>用戶名稱</th>
                    <th>Email</th>
                    <th>狀態</th>
                    <th>操作</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    filteredUsers.forEach(user => {
        const statusBadge = user.active !== false ? '<span class="badge success">啟用</span>' : '<span class="badge danger">停用</span>';
        
        const avatarUrl = user.photoURL || '/images/default-avatar.svg';
        const displayName = user.displayName || user.email || '未設定名稱';
        
        html += `
            <tr>
                <td data-label="頭像" style="padding: 0.5rem; text-align: center;">
                    <img src="${avatarUrl}" 
                         alt="${displayName}" 
                         style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid #8A2BE2;"
                         onerror="this.src='/images/default-avatar.svg'">
                </td>
                <td data-label="用戶名稱">
                    <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                        <strong style="font-size: 1rem;">${displayName}</strong>
                        <small style="color: #666; font-size: 0.8rem; font-family: monospace;">${user.id.substring(0, 12)}...</small>
                    </div>
                </td>
                <td data-label="Email" style="font-size: 0.9rem; color: #666;">${user.email || '-'}</td>
                <td data-label="狀態">${statusBadge}</td>
                <td data-label="操作">
                    <button onclick="window.editUser('${user.id}')" class="btn btn-sm btn-secondary">編輯</button>
                </td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
    `;
    
    usersList.innerHTML = html;
}

function filterUsers() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const serviceRelatedRoles = ['poweruser_service', 'admin_service', 'superadmin'];
    
    let serviceUsers = allUsers.filter(user => {
        const userRoles = user.roles || [];
        return userRoles.some(role => serviceRelatedRoles.includes(role));
    });
    
    if (!searchTerm) {
        filteredUsers = serviceUsers;
    } else {
        filteredUsers = serviceUsers.filter(user => {
            const name = (user.displayName || '').toLowerCase();
            const email = (user.email || '').toLowerCase();
            const id = user.id.toLowerCase();
            
            return name.includes(searchTerm) || 
                   email.includes(searchTerm) || 
                   id.includes(searchTerm);
        });
    }
    
    renderUsers();
}

export function editUser(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;
    
    editingUserId = userId;
    
    document.getElementById('editUserName').textContent = user.displayName || '未設定';
    document.getElementById('editUserId').textContent = userId;
    
    const roles = user.roles || [];
    const checkboxes = document.querySelectorAll('.role-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = roles.includes(checkbox.value);
    });
    
    document.getElementById('userActive').checked = user.active !== false;
    
    document.getElementById('editUserModal').classList.remove('hidden');
}

export function closeEditModal() {
    document.getElementById('editUserModal').classList.add('hidden');
    editingUserId = null;
}

async function saveUser() {
    if (!editingUserId) return;
    
    try {
        const checkboxes = document.querySelectorAll('.role-checkbox:checked');
        const roles = Array.from(checkboxes).map(cb => cb.value);
        const active = document.getElementById('userActive').checked;
        
        const idToken = await platformAuth.currentUser.getIdToken();
        const response = await fetch('https://asia-east2-platform-bc783.cloudfunctions.net/updateUserRole', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify({
                targetUserId: editingUserId,
                roles: roles,
                active: active
            })
        });
        
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.message || '更新失敗');
        }
        
        const userIndex = allUsers.findIndex(u => u.id === editingUserId);
        if (userIndex !== -1) {
            allUsers[userIndex].roles = roles;
            allUsers[userIndex].active = active;
        }
        
        closeEditModal();
        filterUsers();
        
        alert('用戶權限已更新（已更新認證權限）');
        
    } catch (error) {
        console.error('更新用戶失敗:', error);
        alert('更新失敗：' + error.message);
    }
}

window.editUser = editUser;
window.closeEditModal = closeEditModal;
