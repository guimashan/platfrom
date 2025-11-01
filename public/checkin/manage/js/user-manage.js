/**
 * 用戶管理
 */

import { platformAuth, platformDb, checkinDb } from '/js/firebase-init.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { 
    collection, 
    doc,
    getDocs,
    getDoc,
    updateDoc,
    query,
    where
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { logout } from '/js/auth.js';

let currentUser = null;
let allUsers = [];
let filteredUsers = [];
let editingUserId = null;

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
        await loadUsers();
    } catch (error) {
        console.error('權限檢查失敗:', error);
        alert('權限驗證失敗');
        window.location.href = '/';
    }
});

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
        
        filteredUsers = [...allUsers];
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
        <table>
            <thead>
                <tr>
                    <th style="width: 60px;"></th>
                    <th>用戶名稱</th>
                    <th>角色</th>
                    <th>Email</th>
                    <th>狀態</th>
                    <th>操作</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    filteredUsers.forEach(user => {
        const roles = user.roles || [];
        const roleNames = roles.map(r => getRoleName(r)).join(', ') || '一般用戶';
        const roleBadges = roles.length > 0 
            ? roles.map(r => getRoleBadge(r)).join(' ') 
            : '<span class="badge">一般用戶</span>';
        const statusBadge = user.active !== false ? '<span class="badge success">啟用</span>' : '<span class="badge danger">停用</span>';
        
        const avatarUrl = user.photoURL || '/images/default-avatar.svg';
        const displayName = user.displayName || user.email || '未設定名稱';
        
        html += `
            <tr>
                <td style="padding: 0.5rem; text-align: center;">
                    <img src="${avatarUrl}" 
                         alt="${displayName}" 
                         style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid #D4AF37;"
                         onerror="this.src='/images/default-avatar.svg'">
                </td>
                <td>
                    <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                        <strong style="font-size: 1rem;">${displayName}</strong>
                        <small style="color: #666; font-size: 0.8rem; font-family: monospace;">${user.id.substring(0, 12)}...</small>
                    </div>
                </td>
                <td>
                    <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; max-width: 250px;">
                        ${roleBadges}
                    </div>
                </td>
                <td style="color: ${user.email ? '#333' : '#999'};">${user.email || '未綁定'}</td>
                <td>${statusBadge}</td>
                <td>
                    <button class="btn btn-sm btn-secondary" onclick="window.editUser('${user.id}')">編輯</button>
                    <button class="btn btn-sm btn-primary" onclick="window.viewUserStats('${user.id}')">統計</button>
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
        'user': '<span class="badge">一般用戶</span>'
    };
    return badges[role] || `<span class="badge">${role}</span>`;
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

function editUser(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;
    
    editingUserId = userId;
    
    document.getElementById('editUserName').textContent = user.displayName || '未設定';
    document.getElementById('editUserId').textContent = userId;
    
    const roles = user.roles || [];
    const select = document.getElementById('userRole');
    Array.from(select.options).forEach(option => {
        option.selected = roles.includes(option.value);
    });
    
    document.getElementById('userActive').checked = user.active !== false;
    
    document.getElementById('editUserModal').classList.remove('hidden');
}

function closeEditModal() {
    document.getElementById('editUserModal').classList.add('hidden');
    editingUserId = null;
}

async function saveUserChanges(event) {
    event.preventDefault();
    
    if (!editingUserId) return;
    
    const select = document.getElementById('userRole');
    const selectedRoles = Array.from(select.selectedOptions).map(opt => opt.value);
    const active = document.getElementById('userActive').checked;
    
    try {
        await updateDoc(doc(platformDb, 'users', editingUserId), {
            roles: selectedRoles,
            active,
            updatedAt: new Date(),
            updatedBy: currentUser.uid
        });
        
        closeEditModal();
        await loadUsers();
        alert('儲存成功');
        
    } catch (error) {
        console.error('儲存失敗:', error);
        alert('儲存失敗：' + error.message);
    }
}

async function viewUserStats(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;
    
    const modal = document.getElementById('statsModal');
    const content = document.getElementById('statsContent');
    
    content.innerHTML = '<p class="loading">載入統計資料中...</p>';
    modal.classList.remove('hidden');
    
    try {
        const checkinsRef = collection(checkinDb, 'checkins');
        const q = query(checkinsRef, where('userId', '==', userId));
        const snapshot = await getDocs(q);
        
        const records = [];
        snapshot.forEach(doc => {
            records.push(doc.data());
        });
        
        records.sort((a, b) => {
            const aTime = a.timestamp?.toDate() || new Date(0);
            const bTime = b.timestamp?.toDate() || new Date(0);
            return bTime - aTime;
        });
        
        const now = new Date();
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const thisWeek = new Date(now);
        thisWeek.setDate(thisWeek.getDate() - 7);
        
        const monthRecords = records.filter(r => {
            const recordDate = r.timestamp?.toDate() || new Date(0);
            return recordDate >= thisMonth;
        });
        
        const weekRecords = records.filter(r => {
            const recordDate = r.timestamp?.toDate() || new Date(0);
            return recordDate >= thisWeek;
        });
        
        let html = `
            <div style="margin-bottom: 2rem;">
                <h4>${user.displayName || '未設定'}</h4>
                <p style="color: #666;">簽到統計資料</p>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 2rem;">
                <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px; text-align: center;">
                    <div style="font-size: 2rem; font-weight: 700; color: #667eea;">${records.length}</div>
                    <div style="color: #666; font-size: 0.9rem;">總簽到數</div>
                </div>
                <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px; text-align: center;">
                    <div style="font-size: 2rem; font-weight: 700; color: #11998e;">${monthRecords.length}</div>
                    <div style="color: #666; font-size: 0.9rem;">本月簽到</div>
                </div>
                <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px; text-align: center;">
                    <div style="font-size: 2rem; font-weight: 700; color: #f5576c;">${weekRecords.length}</div>
                    <div style="color: #666; font-size: 0.9rem;">本週簽到</div>
                </div>
            </div>
            
            <h4 style="margin-bottom: 1rem;">最近 10 次簽到記錄</h4>
        `;
        
        if (records.length === 0) {
            html += '<p class="no-data">尚無簽到記錄</p>';
        } else {
            html += '<table style="width: 100%;"><thead><tr><th>時間</th><th>巡邏點</th><th>距離</th></tr></thead><tbody>';
            
            records.slice(0, 10).forEach(record => {
                const timestamp = record.timestamp?.toDate() || new Date();
                const distance = record.distance !== undefined ? `${record.distance.toFixed(1)} m` : 'N/A';
                
                html += `
                    <tr>
                        <td>${formatDateTime(timestamp)}</td>
                        <td>${record.patrolId}</td>
                        <td>${distance}</td>
                    </tr>
                `;
            });
            
            html += '</tbody></table>';
        }
        
        content.innerHTML = html;
        
    } catch (error) {
        console.error('載入統計失敗:', error);
        content.innerHTML = '<p class="error">載入失敗</p>';
    }
}

function closeStatsModal() {
    document.getElementById('statsModal').classList.add('hidden');
}

function formatDateTime(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}`;
}

window.editUser = editUser;
window.viewUserStats = viewUserStats;

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    document.getElementById('searchBtn')?.addEventListener('click', filterUsers);
    document.getElementById('searchInput')?.addEventListener('input', filterUsers);
    document.getElementById('searchInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            filterUsers();
        }
    });
    document.getElementById('closeModal')?.addEventListener('click', closeEditModal);
    document.getElementById('cancelBtn')?.addEventListener('click', closeEditModal);
    document.getElementById('editUserForm')?.addEventListener('submit', saveUserChanges);
    document.getElementById('closeStatsModal')?.addEventListener('click', closeStatsModal);
});
