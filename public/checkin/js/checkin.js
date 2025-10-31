/**
 * 奉香簽到模組
 * 處理 GPS 簽到功能
 */

import { platformAuth, checkinDb, checkinFunctions } from '/js/firebase-init.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { 
    collection, 
    getDocs, 
    query, 
    orderBy 
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { httpsCallable } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js';
import { logout } from '/js/auth.js';

let currentUser = null;
let patrols = [];

// 監聽認證狀態
onAuthStateChanged(platformAuth, async (user) => {
    if (!user) {
        window.location.href = '/';
        return;
    }
    currentUser = user;
    await loadPatrols();
});

// 載入巡邏點列表
async function loadPatrols() {
    try {
        const patrolsRef = collection(checkinDb, 'patrols');
        const q = query(patrolsRef, orderBy('name'));
        const snapshot = await getDocs(q);
        
        patrols = [];
        const dropdown = document.getElementById('patrolDropdown');
        dropdown.innerHTML = '<option value="">請選擇巡邏點</option>';
        
        snapshot.forEach(doc => {
            const data = doc.data();
            patrols.push({ id: doc.id, ...data });
            
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = data.name;
            dropdown.appendChild(option);
        });
        
        console.log(`已載入 ${patrols.length} 個巡邏點`);
    } catch (error) {
        console.error('載入巡邏點失敗:', error);
        showResult('載入巡邏點失敗,請重新整理頁面', 'error');
    }
}

// 處理簽到
async function handleCheckin() {
    const patrolId = document.getElementById('patrolDropdown').value;
    
    if (!patrolId) {
        showResult('請選擇巡邏點', 'error');
        return;
    }
    
    const statusEl = document.getElementById('locationStatus');
    const checkinBtn = document.getElementById('checkinBtn');
    
    try {
        checkinBtn.disabled = true;
        statusEl.textContent = '正在取得位置資訊...';
        statusEl.className = 'location-status active';
        
        // 取得 GPS 位置
        const position = await getCurrentPosition();
        const { latitude, longitude } = position.coords;
        
        statusEl.textContent = `位置已取得 (${latitude.toFixed(6)}, ${longitude.toFixed(6)})`;
        
        // 呼叫 Cloud Function 驗證簽到
        const verifyCheckin = httpsCallable(checkinFunctions, 'verifyCheckinDistance');
        const result = await verifyCheckin({
            userId: currentUser.uid,
            patrolId: patrolId,
            lat: latitude,
            lng: longitude
        });
        
        if (result.data.ok) {
            showResult(
                `簽到成功!<br>距離: ${result.data.distanceMeters.toFixed(1)} 公尺`,
                'success'
            );
            statusEl.textContent = '簽到完成';
        } else {
            showResult(
                `簽到失敗: ${result.data.code}<br>距離: ${result.data.distanceMeters.toFixed(1)} 公尺<br>容許範圍: ${result.data.allowedMeters} 公尺`,
                'error'
            );
            statusEl.textContent = '超出簽到範圍';
            statusEl.className = 'location-status error';
        }
        
    } catch (error) {
        console.error('簽到失敗:', error);
        showResult('簽到失敗: ' + error.message, 'error');
        statusEl.textContent = '簽到失敗';
        statusEl.className = 'location-status error';
    } finally {
        checkinBtn.disabled = false;
    }
}

// 取得當前 GPS 位置
function getCurrentPosition() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('此瀏覽器不支援定位功能'));
            return;
        }
        
        navigator.geolocation.getCurrentPosition(
            position => resolve(position),
            error => {
                let message = '定位失敗';
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        message = '請開啟定位權限';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        message = '無法取得位置資訊';
                        break;
                    case error.TIMEOUT:
                        message = '定位逾時';
                        break;
                }
                reject(new Error(message));
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    });
}

// 顯示結果
function showResult(message, type) {
    const resultEl = document.getElementById('result');
    resultEl.innerHTML = message;
    resultEl.className = `result-area ${type}`;
    resultEl.classList.remove('hidden');
}

// 綁定事件
document.addEventListener('DOMContentLoaded', () => {
    const checkinBtn = document.getElementById('checkinBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (checkinBtn) {
        checkinBtn.addEventListener('click', handleCheckin);
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
});
