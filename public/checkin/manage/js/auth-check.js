/**
 * 奉香簽到管理 - 身分驗證
 */

import { platformAuth, platformDb } from '/js/firebase-init.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const loadingArea = document.getElementById('loadingArea');
const errorArea = document.getElementById('errorArea');
const errorMessage = document.getElementById('errorMessage');

// 監聽認證狀態
onAuthStateChanged(platformAuth, async (user) => {
    if (!user) {
        // 未登入，導向首頁
        window.location.href = '/';
        return;
    }

    try {
        // 檢查用戶權限
        const userDoc = await getDoc(doc(platformDb, 'users', user.uid));
        
        if (!userDoc.exists()) {
            showError('找不到用戶資料，請聯絡系統管理員。');
            return;
        }

        const userData = userDoc.data();
        const role = userData.role || 'user';

        // 檢查是否有管理權限
        if (role !== 'poweruser' && role !== 'admin' && role !== 'SuperAdmin') {
            showError(`您目前的角色為「${getRoleName(role)}」，無法存取管理功能。`);
            return;
        }

        // 權限通過，導向儀表板
        setTimeout(() => {
            window.location.href = '/checkin/manage/dashboard.html';
        }, 500);

    } catch (error) {
        console.error('權限檢查失敗:', error);
        showError('權限驗證過程中發生錯誤，請稍後再試。');
    }
});

function showError(message) {
    loadingArea.style.display = 'none';
    errorArea.style.display = 'block';
    errorMessage.textContent = message;
}

function getRoleName(role) {
    const roleNames = {
        'SuperAdmin': '超級管理員',
        'admin': '管理員',
        'poweruser': '進階用戶',
        'user': '一般用戶'
    };
    return roleNames[role] || role;
}
