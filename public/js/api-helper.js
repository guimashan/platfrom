/**
 * API 輔助模組
 * 提供統一的 API 調用方法
 */

import { platformAuth } from '/js/firebase-init.js';

/**
 * 調用 Cloud Function API (需要認證)
 * @param {string} url - API endpoint URL
 * @param {object} options - fetch options
 * @returns {Promise<object>} API 響應
 */
export async function callAPI(url, options = {}) {
    try {
        const idToken = await platformAuth.currentUser.getIdToken();
        
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`,
                ...options.headers
            }
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || `API 錯誤: ${response.status}`);
        }

        return data;
    } catch (error) {
        console.error('API 調用失敗:', error);
        throw error;
    }
}
