/**
 * LIFF 初始化模組
 * 處理 LINE LIFF App 的初始化和用戶認證
 */

import { platformAuth, platformDb } from '/js/firebase-init.js';
import { signInWithCustomToken } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { doc, setDoc, getDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

let liffInitialized = false;
let liffProfile = null;

export async function initLiff(liffId) {
    try {
        console.log('開始初始化 LIFF...');
        
        await liff.init({ liffId });
        liffInitialized = true;
        
        console.log('LIFF 初始化成功');
        console.log('環境:', liff.isInClient() ? 'LINE App' : '外部瀏覽器');
        console.log('已登入:', liff.isLoggedIn());
        
        if (!liff.isLoggedIn()) {
            console.log('用戶未登入，執行登入流程...');
            liff.login();
            return null;
        }
        
        liffProfile = await liff.getProfile();
        console.log('LINE 用戶資料:', liffProfile);
        
        const firebaseUser = await authenticateWithFirebase();
        
        return {
            liffProfile,
            firebaseUser,
            isInClient: liff.isInClient()
        };
        
    } catch (error) {
        console.error('LIFF 初始化失敗:', error);
        throw error;
    }
}

async function authenticateWithFirebase() {
    try {
        console.log('開始 Firebase 認證...');
        
        const idToken = liff.getIDToken();
        
        if (!idToken) {
            throw new Error('無法取得 LINE ID Token');
        }
        
        const response = await fetch('https://asia-east2-platform-bc783.cloudfunctions.net/generateCustomTokenFromLiff', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                liffIdToken: idToken,
                lineUserId: liffProfile.userId,
                displayName: liffProfile.displayName,
                pictureUrl: liffProfile.pictureUrl
            })
        });
        
        if (!response.ok) {
            const errorData = await response.text();
            console.error('Cloud Function 回應錯誤:', errorData);
            throw new Error('Firebase Token 交換失敗');
        }
        
        const data = await response.json();
        
        if (!data.ok || !data.customToken) {
            console.error('Cloud Function 回應格式錯誤:', data);
            throw new Error(data.message || 'Firebase Token 交換失敗');
        }
        
        const customToken = data.customToken;
        
        const userCredential = await signInWithCustomToken(platformAuth, customToken);
        console.log('Firebase 登入成功:', userCredential.user.uid);
        
        await updateUserData(userCredential.user);
        
        return userCredential.user;
        
    } catch (error) {
        console.error('Firebase 認證失敗:', error);
        throw error;
    }
}

async function updateUserData(firebaseUser) {
    try {
        const userRef = doc(platformDb, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userRef);
        
        const userData = {
            lineUserId: liffProfile.userId,
            displayName: liffProfile.displayName,
            pictureUrl: liffProfile.pictureUrl || null,
            lastLogin: serverTimestamp(),
            updatedAt: serverTimestamp()
        };
        
        if (!userDoc.exists()) {
            userData.roles = ['user'];
            userData.active = true;
            userData.createdAt = serverTimestamp();
        }
        
        await setDoc(userRef, userData, { merge: true });
        console.log('用戶資料已更新');
        
    } catch (error) {
        console.error('更新用戶資料失敗:', error);
    }
}

export function getLiffProfile() {
    return liffProfile;
}

export function isLiffInitialized() {
    return liffInitialized;
}

export function isInLineClient() {
    return liffInitialized && liff.isInClient();
}

export async function closeLiffWindow() {
    if (liffInitialized && liff.isInClient()) {
        liff.closeWindow();
    } else {
        window.close();
    }
}

export async function sendMessageToChat(messages) {
    if (!liffInitialized || !liff.isInClient()) {
        console.warn('無法發送訊息：不在 LINE 環境中');
        return false;
    }
    
    try {
        await liff.sendMessages(messages);
        console.log('訊息已發送');
        return true;
    } catch (error) {
        console.error('發送訊息失敗:', error);
        return false;
    }
}

export function openExternalBrowser(url) {
    if (liffInitialized) {
        liff.openWindow({
            url: url,
            external: true
        });
    } else {
        window.open(url, '_blank');
    }
}

export default {
    initLiff,
    getLiffProfile,
    isLiffInitialized,
    isInLineClient,
    closeLiffWindow,
    sendMessageToChat,
    openExternalBrowser
};
