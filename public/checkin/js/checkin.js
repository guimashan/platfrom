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
let html5QrcodeScanner = null;
let currentMode = 'gps'; // 'gps' or 'qr'

// 監聽認證狀態
onAuthStateChanged(platformAuth, async (user) => {
    if (!user) {
        window.location.href = '/';
        return;
    }
    currentUser = user;
    await loadPatrols();
    initializeModeSwitch();
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
            // 為缺少 qr 欄位的巡邏點生成預設值
            const qrCode = data.qr || `PATROL_${doc.id}`;
            patrols.push({ id: doc.id, ...data, qr: qrCode });
            
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

// 初始化模式切換
function initializeModeSwitch() {
    const gpsModeBtn = document.getElementById('gpsModeBtn');
    const qrModeBtn = document.getElementById('qrModeBtn');
    const gpsMode = document.getElementById('gpsMode');
    const qrMode = document.getElementById('qrMode');
    
    gpsModeBtn.addEventListener('click', () => {
        currentMode = 'gps';
        gpsModeBtn.classList.add('active');
        qrModeBtn.classList.remove('active');
        gpsMode.classList.remove('hidden');
        qrMode.classList.add('hidden');
        
        // 停止 QR 掃描
        if (html5QrcodeScanner) {
            stopQRScanner();
        }
    });
    
    qrModeBtn.addEventListener('click', () => {
        currentMode = 'qr';
        qrModeBtn.classList.add('active');
        gpsModeBtn.classList.remove('active');
        qrMode.classList.remove('hidden');
        gpsMode.classList.add('hidden');
    });
}

// QR Code 掃描功能
async function startQRScanner() {
    const startBtn = document.getElementById('startQrBtn');
    const stopBtn = document.getElementById('stopQrBtn');
    const qrStatus = document.getElementById('qrStatus');
    
    try {
        startBtn.classList.add('hidden');
        stopBtn.classList.remove('hidden');
        qrStatus.innerHTML = '<p>正在啟動相機...</p>';
        
        // 初始化 QR Code 掃描器
        html5QrcodeScanner = new Html5Qrcode("qrReader");
        
        await html5QrcodeScanner.start(
            { facingMode: "environment" }, // 使用後置鏡頭
            {
                fps: 10,
                qrbox: { width: 250, height: 250 }
            },
            onQRCodeScanned,
            (errorMessage) => {
                // 掃描錯誤（正常情況，持續掃描中）
            }
        );
        
        qrStatus.innerHTML = '<p>請對準 QR Code 進行掃描</p>';
        qrStatus.className = 'location-status active';
        
    } catch (error) {
        console.error('啟動掃描器失敗:', error);
        qrStatus.innerHTML = `<p>無法啟動相機: ${error.message}</p>`;
        qrStatus.className = 'location-status error';
        startBtn.classList.remove('hidden');
        stopBtn.classList.add('hidden');
    }
}

// 停止 QR Code 掃描
async function stopQRScanner() {
    const startBtn = document.getElementById('startQrBtn');
    const stopBtn = document.getElementById('stopQrBtn');
    const qrStatus = document.getElementById('qrStatus');
    
    if (html5QrcodeScanner) {
        try {
            await html5QrcodeScanner.stop();
            html5QrcodeScanner.clear();
            html5QrcodeScanner = null;
            
            qrStatus.innerHTML = '<p>掃描已停止</p>';
            qrStatus.className = 'location-status';
            
        } catch (error) {
            console.error('停止掃描器失敗:', error);
        }
    }
    
    startBtn.classList.remove('hidden');
    stopBtn.classList.add('hidden');
}

// QR Code 掃描成功回調
async function onQRCodeScanned(decodedText, decodedResult) {
    console.log('QR Code 掃描結果:', decodedText);
    
    // 立即停止掃描
    await stopQRScanner();
    
    const qrStatus = document.getElementById('qrStatus');
    qrStatus.innerHTML = '<p>QR Code 已掃描，正在驗證...</p>';
    qrStatus.className = 'location-status active';
    
    try {
        // 解析 QR Code 內容
        // 格式: PATROL_{patrolId}
        const match = decodedText.match(/^PATROL_(.+)$/);
        
        if (!match) {
            throw new Error('無效的 QR Code 格式');
        }
        
        const qrCode = decodedText;
        
        // 查找對應的巡邏點
        const patrol = patrols.find(p => p.qr === qrCode);
        
        if (!patrol) {
            throw new Error('找不到對應的巡邏點');
        }
        
        // 呼叫 Cloud Function 進行 QR Code 簽到
        const verifyCheckin = httpsCallable(checkinFunctions, 'verifyCheckinDistance');
        const result = await verifyCheckin({
            userId: currentUser.uid,
            patrolId: patrol.id,
            mode: 'qr',
            qrCode: qrCode
        });
        
        if (result.data.ok) {
            showResult(
                `✅ QR Code 簽到成功!<br>巡邏點: ${patrol.name}`,
                'success'
            );
            qrStatus.innerHTML = '<p>簽到完成</p>';
            qrStatus.className = 'location-status';
        } else {
            showResult(
                `❌ 簽到失敗: ${result.data.message || result.data.code}`,
                'error'
            );
            qrStatus.innerHTML = '<p>簽到失敗</p>';
            qrStatus.className = 'location-status error';
        }
        
    } catch (error) {
        console.error('QR Code 簽到失敗:', error);
        showResult(`❌ 簽到失敗: ${error.message}`, 'error');
        qrStatus.innerHTML = '<p>簽到失敗</p>';
        qrStatus.className = 'location-status error';
    }
}

// 綁定事件
document.addEventListener('DOMContentLoaded', () => {
    const checkinBtn = document.getElementById('checkinBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const startQrBtn = document.getElementById('startQrBtn');
    const stopQrBtn = document.getElementById('stopQrBtn');
    
    if (checkinBtn) {
        checkinBtn.addEventListener('click', handleCheckin);
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    if (startQrBtn) {
        startQrBtn.addEventListener('click', startQRScanner);
    }
    
    if (stopQrBtn) {
        stopQrBtn.addEventListener('click', stopQRScanner);
    }
});
