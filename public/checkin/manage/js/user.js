/**
 * User 角色權限管理頁面
 */

let currentUsers = [];
let currentEditingUser = null;

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
    console.log('User 管理頁面初始化');
    
    // 檢查權限（僅 superadmin 可訪問）
    const user = await checkAuthAndRole(['superadmin']);
    if (!user) {
        return;
    }

    // 載入用戶列表
    await loadUsers();

    // 載入操作日誌
    await loadActivityLog();

    // 綁定事件
    document.getElementById('refreshBtn').addEventListener('click', loadUsers);
    document.getElementById('refreshLogBtn').addEventListener('click', loadActivityLog);
    document.getElementById('cancelRoleBtn').addEventListener('click', closeRoleModal);
    document.getElementById('saveRoleBtn').addEventListener('click', saveUserRoles);
});

/**
 * 載入用戶列表
 */
async function loadUsers() {
    console.log('載入用戶列表');
    showLoading(true);

    try {
        const idToken = await firebase.auth().currentUser.getIdToken();
        
        const response = await fetch(`${PLATFORM_API_BASE}/listManageUsers`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${idToken}`
            }
        });

        const data = await response.json();

        if (!data.ok) {
            throw new Error(data.message || '載入用戶列表失敗');
        }

        currentUsers = data.users || [];
        renderUserTable();
        showMessage('用戶列表已更新', 'success');

    } catch (error) {
        console.error('載入用戶列表錯誤', error);
        showMessage(`載入失敗: ${error.message}`, 'error');
        document.getElementById('userTableBody').innerHTML = '<tr><td colspan="6" class="no-data">載入失敗，請重試</td></tr>';
    } finally {
        showLoading(false);
    }
}

/**
 * 渲染用戶表格
 */
function renderUserTable() {
    const tbody = document.getElementById('userTableBody');
    
    if (currentUsers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="no-data">暫無用戶資料</td></tr>';
        return;
    }

    tbody.innerHTML = currentUsers.map(user => {
        const roles = user.roles || [];
        const roleLabels = roles.map(r => {
            if (r === 'superadmin') return '<span class="role-badge superadmin">超級管理員</span>';
            if (r === 'admin_checkin') return '<span class="role-badge admin">簽到管理員</span>';
            if (r === 'poweruser_checkin') return '<span class="role-badge poweruser">簽到進階用戶</span>';
            return '';
        }).join(' ');

        const lastLogin = user.lastLoginAt ? formatTimestamp(user.lastLoginAt) : '從未登入';

        return `
            <tr>
                <td>
                    ${user.photoURL 
                        ? `<img src="${user.photoURL}" alt="${user.displayName}" class="user-avatar">` 
                        : '<div class="user-avatar" style="background: #ddd; display: flex; align-items: center; justify-content: center;">👤</div>'}
                </td>
                <td><strong>${escapeHtml(user.displayName)}</strong></td>
                <td>${user.email ? escapeHtml(user.email) : '-'}</td>
                <td>${roleLabels || '<span style="color: #999;">無角色</span>'}</td>
                <td style="font-size: 13px; color: #666;">${lastLogin}</td>
                <td>
                    <button class="btn-manage btn-primary btn-sm" onclick="openRoleModal('${user.userId}')">
                        編輯角色
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * 開啟角色編輯 Modal
 */
function openRoleModal(userId) {
    const user = currentUsers.find(u => u.userId === userId);
    if (!user) {
        showMessage('找不到用戶資料', 'error');
        return;
    }

    currentEditingUser = user;
    document.getElementById('modalUserName').textContent = user.displayName;
    document.getElementById('modalUserId').textContent = user.userId;

    // 設定當前角色
    const roles = user.roles || [];
    document.getElementById('roleSuperadmin').checked = roles.includes('superadmin');
    document.getElementById('roleAdmin').checked = roles.includes('admin_checkin');
    document.getElementById('rolePoweruser').checked = roles.includes('poweruser_checkin');

    // 顯示 Modal
    document.getElementById('roleModal').style.display = 'flex';
}

/**
 * 關閉角色編輯 Modal
 */
function closeRoleModal() {
    document.getElementById('roleModal').style.display = 'none';
    currentEditingUser = null;
}

/**
 * 儲存用戶角色
 */
async function saveUserRoles() {
    if (!currentEditingUser) {
        return;
    }

    const newRoles = [];
    if (document.getElementById('roleSuperadmin').checked) newRoles.push('superadmin');
    if (document.getElementById('roleAdmin').checked) newRoles.push('admin_checkin');
    if (document.getElementById('rolePoweruser').checked) newRoles.push('poweruser_checkin');

    // 確認對話框
    const confirmMsg = `確定要將 ${currentEditingUser.displayName} 的角色更新為：\n${newRoles.join(', ') || '無角色'}？`;
    if (!confirm(confirmMsg)) {
        return;
    }

    showLoading(true);

    try {
        const idToken = await firebase.auth().currentUser.getIdToken();
        
        const response = await fetch(`${PLATFORM_API_BASE}/updateUserRoles`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${idToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                targetUserId: currentEditingUser.userId,
                roles: newRoles
            })
        });

        const data = await response.json();

        if (!data.ok) {
            throw new Error(data.message || '更新角色失敗');
        }

        showMessage('角色已成功更新', 'success');
        closeRoleModal();
        
        // 重新載入用戶列表和日誌
        await loadUsers();
        await loadActivityLog();

    } catch (error) {
        console.error('更新角色錯誤', error);
        showMessage(`更新失敗: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * 載入操作日誌
 */
async function loadActivityLog() {
    console.log('載入操作日誌');

    try {
        const idToken = await firebase.auth().currentUser.getIdToken();
        
        const response = await fetch(`${PLATFORM_API_BASE}/getUserActivityLog?pageSize=20`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${idToken}`
            }
        });

        const data = await response.json();

        if (!data.ok) {
            throw new Error(data.message || '載入操作日誌失敗');
        }

        renderActivityLog(data.logs || []);

    } catch (error) {
        console.error('載入操作日誌錯誤', error);
        document.getElementById('activityLogContainer').innerHTML = '<div class="no-data">載入失敗，請重試</div>';
    }
}

/**
 * 渲染操作日誌
 */
function renderActivityLog(logs) {
    const container = document.getElementById('activityLogContainer');
    
    if (logs.length === 0) {
        container.innerHTML = '<div class="no-data">暫無操作記錄</div>';
        return;
    }

    container.innerHTML = logs.map(log => {
        const timestamp = log.timestamp ? formatTimestamp(log.timestamp) : '未知時間';
        const added = log.changes?.added || [];
        const removed = log.changes?.removed || [];

        let changesHtml = '';
        if (added.length > 0) {
            changesHtml += added.map(r => `<span class="badge-added">+${r}</span>`).join(' ');
        }
        if (removed.length > 0) {
            changesHtml += removed.map(r => `<span class="badge-removed">-${r}</span>`).join(' ');
        }

        return `
            <div class="log-item">
                <div class="log-header">
                    <span class="log-operator">${escapeHtml(log.operatorName || log.operatorId)}</span>
                    <span class="log-time">${timestamp}</span>
                </div>
                <div class="log-details">
                    修改了 <strong>${escapeHtml(log.targetUserName || log.targetUserId)}</strong> 的角色權限
                    ${changesHtml ? `<br>${changesHtml}` : ''}
                </div>
            </div>
        `;
    }).join('');
}

/**
 * 格式化時間戳
 */
function formatTimestamp(timestamp) {
    if (!timestamp) return '-';
    
    let date;
    if (timestamp.toDate) {
        // Firestore Timestamp
        date = timestamp.toDate();
    } else if (timestamp._seconds) {
        // Firestore Timestamp object
        date = new Date(timestamp._seconds * 1000);
    } else {
        date = new Date(timestamp);
    }
    
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '剛剛';
    if (minutes < 60) return `${minutes} 分鐘前`;
    if (hours < 24) return `${hours} 小時前`;
    if (days < 7) return `${days} 天前`;
    
    return date.toLocaleString('zh-TW', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

/**
 * HTML 轉義
 */
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}
