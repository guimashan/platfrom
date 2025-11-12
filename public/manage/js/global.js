/**
 * 全站管理 - 數據處理模組
 */

import { platformAuth, platformDb, checkinDb, serviceDb, API_ENDPOINTS } from '/js/firebase-init.js';
import { collection, getDocs, getDoc, doc, query, where, updateDoc } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { callAPI } from '/js/api-helper.js';

let allUsers = [];
let filteredUsers = [];
let editingUserId = null;

export async function loadDashboardStats() {
    try {
        document.getElementById('mainApp').style.display = 'block';

        const totalUsers = document.getElementById('totalUsers');
        const checkinUsers = document.getElementById('checkinUsers');
        const adminUsers = document.getElementById('adminUsers');
        const activeUsers = document.getElementById('activeUsers');
        const checkinTotal = document.getElementById('checkinTotal');
        const serviceTotal = document.getElementById('serviceTotal');

        totalUsers.textContent = '載入中...';
        checkinUsers.textContent = '載入中...';
        adminUsers.textContent = '載入中...';
        activeUsers.textContent = '載入中...';
        checkinTotal.textContent = '載入中...';
        serviceTotal.textContent = '載入中...';

        const usersSnapshot = await getDocs(collection(platformDb, 'users'));
        allUsers = usersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        const total = allUsers.length;
        const checkin = allUsers.filter(u => (u.roles || []).some(r => 
            r === 'user_checkin' || r === 'poweruser_checkin' || r === 'admin_checkin'
        )).length;
        const admin = allUsers.filter(u => (u.roles || []).some(r => 
            r.includes('admin') || r.includes('poweruser') || r === 'superadmin'
        )).length;
        const active = allUsers.filter(u => u.active !== false).length;

        totalUsers.textContent = total;
        checkinUsers.textContent = checkin;
        adminUsers.textContent = admin;
        activeUsers.textContent = active;

        try {
            const checkinResponse = await callAPI(API_ENDPOINTS.getCheckinHistory + '?limit=10000', {
                method: 'GET'
            });
            checkinTotal.textContent = (checkinResponse.checkins || []).length;
        } catch (error) {
            console.error('載入簽到統計失敗:', error);
            checkinTotal.textContent = '-';
        }

        try {
            const serviceResponse = await callAPI(API_ENDPOINTS.getRegistrations, {
                method: 'GET'
            });
            serviceTotal.textContent = (serviceResponse.registrations || []).length;
        } catch (error) {
            console.error('載入神務統計失敗:', error);
            serviceTotal.textContent = '-';
        }

        console.log('✅ 全站儀表板統計載入完成');
    } catch (error) {
        console.error('載入全站統計失敗:', error);
    }
}

export async function initUserManagement() {
    try {
        document.getElementById('mainApp').style.display = 'block';

        await loadAllUsers();
        renderUsers();

        document.getElementById('searchInput').addEventListener('keyup', (e) => {
            if (e.key === 'Enter') filterUsers();
        });
        document.getElementById('searchBtn').addEventListener('click', filterUsers);

        document.getElementById('closeModal').addEventListener('click', closeModal);
        document.getElementById('cancelBtn').addEventListener('click', closeModal);
        document.getElementById('editUserForm').addEventListener('submit', saveUserChanges);

        window.editUser = editUser;

        console.log('✅ 用戶管理初始化完成');
    } catch (error) {
        console.error('初始化用戶管理失敗:', error);
    }
}

async function loadAllUsers() {
    try {
        const usersSnapshot = await getDocs(collection(platformDb, 'users'));
        allUsers = usersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        filteredUsers = [...allUsers];
        console.log(`已載入 ${allUsers.length} 個用戶`);
    } catch (error) {
        console.error('載入用戶失敗:', error);
        allUsers = [];
        filteredUsers = [];
    }
}

function filterUsers() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    if (!searchTerm) {
        filteredUsers = [...allUsers];
    } else {
        filteredUsers = allUsers.filter(user => {
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

function renderUsers() {
    const usersList = document.getElementById('usersList');
    
    if (filteredUsers.length === 0) {
        usersList.innerHTML = '<p class="empty-message">沒有找到用戶</p>';
        return;
    }

    let html = '<table><thead><tr>';
    html += '<th>用戶名稱</th>';
    html += '<th>角色</th>';
    html += '<th>Email</th>';
    html += '<th>狀態</th>';
    html += '<th>操作</th>';
    html += '</tr></thead><tbody>';

    filteredUsers.forEach(user => {
        const displayName = user.displayName || '未設定';
        const roles = user.roles || ['user'];
        const roleBadges = roles.map(r => getRoleBadge(r)).join(' ');
        const statusBadge = user.active === false 
            ? '<span class="badge" style="background: #dc3545;">停用</span>' 
            : '<span class="badge" style="background: #28a745;">啟用</span>';

        html += `
            <tr>
                <td data-label="用戶名稱">
                    <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                        <strong style="font-size: 1rem;">${displayName}</strong>
                        <small style="color: #666; font-size: 0.8rem; font-family: monospace;">${user.id.substring(0, 12)}...</small>
                    </div>
                </td>
                <td data-label="角色">
                    <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; max-width: 250px;">
                        ${roleBadges}
                    </div>
                </td>
                <td data-label="Email" style="color: ${user.email ? '#333' : '#999'};">${user.email || '未綁定'}</td>
                <td data-label="狀態">${statusBadge}</td>
                <td data-label="操作">
                    <button class="btn btn-sm btn-secondary" onclick="window.editUser('${user.id}')">編輯</button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    usersList.innerHTML = html;
}

function getRoleName(role) {
    const roleNames = {
        'superadmin': '超級管理員',
        'admin_checkin': '簽到管理員',
        'admin_service': '神務管理員',
        'admin_schedule': '排班管理員',
        'poweruser_checkin': '簽到幹部',
        'poweruser_service': '神務專員',
        'poweruser_schedule': '排班幹部',
        'user_checkin': '簽到使用者',
        'user_schedule': '排班使用者',
        'user': '一般用戶'
    };
    return roleNames[role] || role;
}

function getRoleBadge(role) {
    const badges = {
        'superadmin': '<span class="badge danger">超級管理員</span>',
        'admin_checkin': '<span class="badge warning">簽到管理員</span>',
        'admin_service': '<span class="badge warning">神務管理員</span>',
        'admin_schedule': '<span class="badge warning">排班管理員</span>',
        'poweruser_checkin': '<span class="badge info">簽到幹部</span>',
        'poweruser_service': '<span class="badge info">神務專員</span>',
        'poweruser_schedule': '<span class="badge info">排班幹部</span>',
        'user_checkin': '<span class="badge success">簽到使用者</span>',
        'user_schedule': '<span class="badge success">排班使用者</span>',
        'user': '<span class="badge">一般用戶</span>'
    };
    return badges[role] || `<span class="badge">${role}</span>`;
}

function editUser(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;
    
    editingUserId = userId;
    
    document.getElementById('editUserName').textContent = user.displayName || '未設定';
    document.getElementById('editUserId').textContent = user.id;
    
    const userRoles = user.roles || ['user'];
    document.querySelectorAll('.role-checkbox').forEach(checkbox => {
        checkbox.checked = userRoles.includes(checkbox.value);
    });
    
    document.getElementById('userActive').checked = user.active !== false;
    
    document.getElementById('editUserModal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('editUserModal').classList.add('hidden');
    editingUserId = null;
}

async function saveUserChanges(e) {
    e.preventDefault();
    
    if (!editingUserId) return;
    
    const selectedRoles = Array.from(document.querySelectorAll('.role-checkbox:checked')).map(cb => cb.value);
    const isActive = document.getElementById('userActive').checked;
    
    if (selectedRoles.length === 0) {
        alert('請至少選擇一個角色');
        return;
    }
    
    try {
        const userRef = doc(platformDb, 'users', editingUserId);
        await updateDoc(userRef, {
            roles: selectedRoles,
            active: isActive
        });
        
        alert('✅ 用戶角色已更新');
        closeModal();
        await loadAllUsers();
        renderUsers();
    } catch (error) {
        console.error('更新用戶失敗:', error);
        alert('❌ 更新失敗: ' + error.message);
    }
}
