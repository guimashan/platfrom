/**
 * LINE Bot 關鍵詞管理服務
 * 處理關鍵詞的 CRUD 操作
 */

import { platformDb } from '/js/firebase-init.js';
import { 
    collection, 
    doc, 
    getDocs, 
    getDoc,
    addDoc, 
    updateDoc, 
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const COLLECTION_NAME = 'lineKeywordMappings';

/**
 * 正規化關鍵詞（轉小寫並去空白）
 */
export function normalizeKeyword(keyword) {
    return keyword.trim().toLowerCase();
}

/**
 * 取得所有關鍵詞
 */
export async function getAllKeywords() {
    try {
        const q = query(
            collection(platformDb, COLLECTION_NAME),
            orderBy('priority', 'desc'),
            orderBy('createdAt', 'desc')
        );
        
        const snapshot = await getDocs(q);
        const keywords = [];
        
        snapshot.forEach(doc => {
            keywords.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return keywords;
    } catch (error) {
        console.error('取得關鍵詞列表失敗:', error);
        throw error;
    }
}

/**
 * 取得啟用的關鍵詞（供 Cloud Function 使用）
 */
export async function getEnabledKeywords() {
    try {
        const q = query(
            collection(platformDb, COLLECTION_NAME),
            where('enabled', '==', true),
            orderBy('priority', 'desc')
        );
        
        const snapshot = await getDocs(q);
        const keywords = [];
        
        snapshot.forEach(doc => {
            keywords.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return keywords;
    } catch (error) {
        console.error('取得啟用關鍵詞失敗:', error);
        throw error;
    }
}

/**
 * 取得單一關鍵詞
 */
export async function getKeyword(keywordId) {
    try {
        const docRef = doc(platformDb, COLLECTION_NAME, keywordId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            return {
                id: docSnap.id,
                ...docSnap.data()
            };
        } else {
            throw new Error('關鍵詞不存在');
        }
    } catch (error) {
        console.error('取得關鍵詞失敗:', error);
        throw error;
    }
}

/**
 * 檢查關鍵詞是否重複（包含別名）
 */
export async function checkKeywordDuplicate(keyword, excludeId = null) {
    const normalized = normalizeKeyword(keyword);
    const allKeywords = await getAllKeywords();
    
    for (const kw of allKeywords) {
        if (excludeId && kw.id === excludeId) {
            continue; // 編輯時排除自己
        }
        
        // 檢查主關鍵詞
        if (kw.normalizedKeyword === normalized) {
            return { duplicate: true, existingKeyword: kw.keyword };
        }
        
        // 檢查別名
        if (kw.aliases && kw.aliases.length > 0) {
            const normalizedAliases = kw.aliases.map(a => normalizeKeyword(a));
            if (normalizedAliases.includes(normalized)) {
                return { duplicate: true, existingKeyword: `${kw.keyword} (別名)` };
            }
        }
    }
    
    return { duplicate: false };
}

/**
 * 新增關鍵詞
 */
export async function createKeyword(keywordData, userId) {
    try {
        // 驗證必填欄位
        if (!keywordData.keyword || !keywordData.liffUrl) {
            throw new Error('關鍵詞和 LIFF URL 為必填欄位');
        }
        
        // 檢查重複
        const duplicateCheck = await checkKeywordDuplicate(keywordData.keyword);
        if (duplicateCheck.duplicate) {
            throw new Error(`關鍵詞重複：已存在於 "${duplicateCheck.existingKeyword}"`);
        }
        
        // 檢查別名重複
        if (keywordData.aliases && keywordData.aliases.length > 0) {
            for (const alias of keywordData.aliases) {
                const aliasCheck = await checkKeywordDuplicate(alias);
                if (aliasCheck.duplicate) {
                    throw new Error(`別名 "${alias}" 重複：已存在於 "${aliasCheck.existingKeyword}"`);
                }
            }
        }
        
        // 正規化關鍵詞
        const normalizedKeyword = normalizeKeyword(keywordData.keyword);
        
        // 準備資料
        const data = {
            keyword: keywordData.keyword.trim(),
            normalizedKeyword: normalizedKeyword,
            liffUrl: keywordData.liffUrl.trim(),
            replyType: keywordData.replyType || 'template',
            replyPayload: keywordData.replyPayload || {
                altText: keywordData.keyword,
                text: keywordData.keyword,
                label: '立即開啟'
            },
            enabled: keywordData.enabled !== undefined ? keywordData.enabled : true,
            priority: parseInt(keywordData.priority) || 0,
            aliases: keywordData.aliases || [],
            description: keywordData.description || '',
            createdBy: userId,
            createdAt: serverTimestamp(),
            updatedBy: userId,
            updatedAt: serverTimestamp()
        };
        
        const docRef = await addDoc(collection(platformDb, COLLECTION_NAME), data);
        console.log('關鍵詞已新增:', docRef.id);
        
        return {
            id: docRef.id,
            ...data
        };
    } catch (error) {
        console.error('新增關鍵詞失敗:', error);
        throw error;
    }
}

/**
 * 更新關鍵詞
 */
export async function updateKeyword(keywordId, keywordData, userId) {
    try {
        // 驗證必填欄位
        if (!keywordData.keyword || !keywordData.liffUrl) {
            throw new Error('關鍵詞和 LIFF URL 為必填欄位');
        }
        
        // 檢查重複（排除自己）
        const duplicateCheck = await checkKeywordDuplicate(keywordData.keyword, keywordId);
        if (duplicateCheck.duplicate) {
            throw new Error(`關鍵詞重複：已存在於 "${duplicateCheck.existingKeyword}"`);
        }
        
        // 檢查別名重複
        if (keywordData.aliases && keywordData.aliases.length > 0) {
            for (const alias of keywordData.aliases) {
                const aliasCheck = await checkKeywordDuplicate(alias, keywordId);
                if (aliasCheck.duplicate) {
                    throw new Error(`別名 "${alias}" 重複：已存在於 "${aliasCheck.existingKeyword}"`);
                }
            }
        }
        
        // 正規化關鍵詞
        const normalizedKeyword = normalizeKeyword(keywordData.keyword);
        
        // 準備更新資料
        const data = {
            keyword: keywordData.keyword.trim(),
            normalizedKeyword: normalizedKeyword,
            liffUrl: keywordData.liffUrl.trim(),
            replyType: keywordData.replyType || 'template',
            replyPayload: keywordData.replyPayload || {
                altText: keywordData.keyword,
                text: keywordData.keyword,
                label: '立即開啟'
            },
            enabled: keywordData.enabled !== undefined ? keywordData.enabled : true,
            priority: parseInt(keywordData.priority) || 0,
            aliases: keywordData.aliases || [],
            description: keywordData.description || '',
            updatedBy: userId,
            updatedAt: serverTimestamp()
        };
        
        const docRef = doc(platformDb, COLLECTION_NAME, keywordId);
        await updateDoc(docRef, data);
        console.log('關鍵詞已更新:', keywordId);
        
        return {
            id: keywordId,
            ...data
        };
    } catch (error) {
        console.error('更新關鍵詞失敗:', error);
        throw error;
    }
}

/**
 * 刪除關鍵詞
 */
export async function deleteKeyword(keywordId) {
    try {
        const docRef = doc(platformDb, COLLECTION_NAME, keywordId);
        await deleteDoc(docRef);
        console.log('關鍵詞已刪除:', keywordId);
        return true;
    } catch (error) {
        console.error('刪除關鍵詞失敗:', error);
        throw error;
    }
}

/**
 * 切換關鍵詞啟用狀態
 */
export async function toggleKeywordStatus(keywordId, enabled, userId) {
    try {
        const docRef = doc(platformDb, COLLECTION_NAME, keywordId);
        await updateDoc(docRef, {
            enabled: enabled,
            updatedBy: userId,
            updatedAt: serverTimestamp()
        });
        console.log('關鍵詞狀態已更新:', keywordId, enabled);
        return true;
    } catch (error) {
        console.error('更新關鍵詞狀態失敗:', error);
        throw error;
    }
}

export default {
    normalizeKeyword,
    getAllKeywords,
    getEnabledKeywords,
    getKeyword,
    checkKeywordDuplicate,
    createKeyword,
    updateKeyword,
    deleteKeyword,
    toggleKeywordStatus
};
