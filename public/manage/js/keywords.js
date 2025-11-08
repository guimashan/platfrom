/**
 * LINE Bot 關鍵詞管理 (網頁版 - LINE Login)
 */

import { platformAuth, platformDb } from '/js/firebase-init.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import * as keywordService from '/js/keyword-service.js';

let currentUser = null;
let currentUserId = null;
let allKeywords = [];
let currentAliases = [];
let currentViewMode = 'list'; // 'list' or 'group'

// 初始化
async function init() {
    try {
        // 等待 Firebase 認證
        onAuthStateChanged(platformAuth, async (user) => {
            if (user) {
                currentUser = user;
                currentUserId = user.uid;
                console.log('使用者已登入:', user.uid);
                await checkPermission();
            } else {
                console.log('使用者未登入，顯示登入提示');
                document.getElementById('loginPrompt').style.display = 'flex';
                document.getElementById('mainApp').style.display = 'none';
                
                // 3 秒後導向首頁進行 LINE Login
                setTimeout(() => {
                    window.location.href = '/';
                }, 3000);
            }
        });
    } catch (error) {
        console.error('初始化失敗:', error);
        showError('系統初始化失敗');
    }
}

// 檢查權限
async function checkPermission() {
    try {
        const userRef = doc(platformDb, 'users', currentUserId);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
            showError('使用者資料不存在');
            setTimeout(() => {
                window.location.href = '/';
            }, 2000);
            return;
        }
        
        const userData = userSnap.data();
        const roles = userData.roles || [];
        
        if (!roles.includes('superadmin')) {
            showError('您沒有權限訪問此頁面（僅限 superadmin）');
            setTimeout(() => {
                window.location.href = '/manage/index.html';
            }, 2000);
            return;
        }
        
        console.log('✅ 權限驗證通過');
        
        // 顯示主要內容
        document.getElementById('loginPrompt').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
        
        await loadKeywords();
        initEventListeners();
        
    } catch (error) {
        console.error('權限檢查失敗:', error);
        showError('權限檢查失敗');
    }
}

// 初始化事件監聽器
function initEventListeners() {
    // 新增按鈕
    document.getElementById('addKeywordBtn').addEventListener('click', showAddModal);
    
    // 批量更新 URL 按鈕
    document.getElementById('updateUrlsBtn').addEventListener('click', batchUpdateUrls);
    
    // 網址轉換工具
    document.getElementById('convertBtn').addEventListener('click', convertPathToLiffUrl);
    document.getElementById('pathInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            convertPathToLiffUrl();
        }
    });
    
    // 關閉 Modal
    document.getElementById('closeModal').addEventListener('click', closeModal);
    document.getElementById('cancelBtn').addEventListener('click', closeModal);
    
    // 表單提交
    document.getElementById('keywordForm').addEventListener('submit', handleSubmit);
    
    // 搜尋
    document.getElementById('searchInput').addEventListener('input', filterKeywords);
    
    // 檢視模式切換
    document.getElementById('listViewBtn').addEventListener('click', () => switchView('list'));
    document.getElementById('groupViewBtn').addEventListener('click', () => switchView('group'));
    
    // 新增別名
    document.getElementById('addAliasBtn').addEventListener('click', addAlias);
    document.getElementById('aliasInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addAlias();
        }
    });
    
    // 登出按鈕
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        try {
            await platformAuth.signOut();
            window.location.href = '/';
        } catch (error) {
            console.error('登出失敗:', error);
        }
    });
}

// 載入關鍵詞列表
async function loadKeywords() {
    try {
        allKeywords = await keywordService.getAllKeywords();
        
        // 根據當前檢視模式渲染
        if (currentViewMode === 'list') {
            renderKeywords(allKeywords);
        } else {
            renderGroupView(allKeywords);
        }
    } catch (error) {
        console.error('載入關鍵詞失敗:', error);
        showError('載入關鍵詞失敗');
    }
}

// 切換檢視模式
function switchView(mode) {
    currentViewMode = mode;
    
    // 更新按鈕樣式
    if (mode === 'list') {
        document.getElementById('listViewBtn').classList.add('active');
        document.getElementById('groupViewBtn').classList.remove('active');
        document.getElementById('listView').style.display = 'block';
        document.getElementById('groupView').style.display = 'none';
        renderKeywords(allKeywords);
    } else {
        document.getElementById('listViewBtn').classList.remove('active');
        document.getElementById('groupViewBtn').classList.add('active');
        document.getElementById('listView').style.display = 'none';
        document.getElementById('groupView').style.display = 'block';
        renderGroupView(allKeywords);
    }
}

// 渲染分組檢視（按 LIFF URL 分組）
function renderGroupView(keywords) {
    const groupTable = document.getElementById('groupTable');
    const emptyState = document.getElementById('emptyState');
    
    if (keywords.length === 0) {
        groupTable.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    
    // 按 LIFF URL 分組
    const groupedByUrl = {};
    keywords.forEach(kw => {
        const url = kw.liffUrl || '無 LIFF URL';
        if (!groupedByUrl[url]) {
            groupedByUrl[url] = [];
        }
        groupedByUrl[url].push(kw);
    });
    
    // 渲染分組表格
    const html = Object.entries(groupedByUrl).map(([url, kwList]) => {
        // 收集所有關鍵詞（主關鍵詞 + 別名）
        const allKeywordTexts = [];
        kwList.forEach(kw => {
            allKeywordTexts.push({text: kw.keyword, isMain: true, id: kw.id});
            if (kw.aliases && kw.aliases.length > 0) {
                kw.aliases.forEach(alias => {
                    allKeywordTexts.push({text: alias, isMain: false, id: kw.id});
                });
            }
        });
        
        const enabledCount = kwList.filter(kw => kw.enabled).length;
        const disabledCount = kwList.length - enabledCount;
        
        return `
            <div class="group-row">
                <div class="group-url">🔗 ${escapeHtml(url)}</div>
                <div class="group-keywords">
                    ${allKeywordTexts.map(item => `
                        <span class="group-keyword-tag ${item.isMain ? 'main' : ''}" 
                              onclick="showEditModal('${item.id}')"
                              title="${item.isMain ? '主關鍵詞（點擊編輯）' : '別名（點擊編輯）'}">
                            ${escapeHtml(item.text)}
                        </span>
                    `).join('')}
                </div>
                <div class="group-stats">
                    📊 共 ${kwList.length} 個主關鍵詞 
                    | ✅ ${enabledCount} 個啟用 
                    | ❌ ${disabledCount} 個停用
                    | 🏷️ ${allKeywordTexts.length - kwList.length} 個別名
                </div>
            </div>
        `;
    }).join('');
    
    groupTable.innerHTML = html;
}

// 渲染關鍵詞列表
function renderKeywords(keywords) {
    const listEl = document.getElementById('keywordList');
    const emptyState = document.getElementById('emptyState');
    
    if (keywords.length === 0) {
        listEl.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    
    listEl.innerHTML = keywords.map(kw => `
        <div class="keyword-card ${kw.enabled ? '' : 'disabled'}">
            <div class="keyword-header">
                <div class="keyword-title">${escapeHtml(kw.keyword)}</div>
                <div class="keyword-status ${kw.enabled ? 'enabled' : 'disabled'}">
                    ${kw.enabled ? '啟用' : '停用'}
                </div>
            </div>
            
            <div class="keyword-meta">
                <span>🔢 優先級: ${kw.priority}</span>
                ${kw.createdAt ? `<span>📅 ${formatDate(kw.createdAt)}</span>` : ''}
            </div>
            
            ${kw.description ? `<div style="margin-bottom: 10px; color: #666;">${escapeHtml(kw.description)}</div>` : ''}
            
            <div class="keyword-url">🔗 ${escapeHtml(kw.liffUrl)}</div>
            
            ${kw.aliases && kw.aliases.length > 0 ? `
                <div class="keyword-aliases">
                    ${kw.aliases.map(alias => `<span class="alias-tag">${escapeHtml(alias)}</span>`).join('')}
                </div>
            ` : ''}
            
            <div class="keyword-actions">
                <button class="btn btn-warning" onclick="toggleStatus('${kw.id}', ${!kw.enabled})">
                    ${kw.enabled ? '停用' : '啟用'}
                </button>
                <button class="btn btn-edit" onclick="showEditModal('${kw.id}')">
                    編輯
                </button>
                <button class="btn btn-danger" onclick="deleteKeyword('${kw.id}', '${escapeHtml(kw.keyword)}')">
                    刪除
                </button>
            </div>
        </div>
    `).join('');
}

// 搜尋過濾
function filterKeywords() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    if (!searchTerm) {
        renderKeywords(allKeywords);
        return;
    }
    
    const filtered = allKeywords.filter(kw => 
        kw.keyword.toLowerCase().includes(searchTerm) ||
        kw.description?.toLowerCase().includes(searchTerm) ||
        kw.aliases?.some(alias => alias.toLowerCase().includes(searchTerm))
    );
    
    renderKeywords(filtered);
}

// 顯示新增 Modal
function showAddModal() {
    document.getElementById('modalTitle').textContent = '新增關鍵詞';
    document.getElementById('keywordForm').reset();
    document.getElementById('keywordId').value = '';
    currentAliases = [];
    renderAliases();
    document.getElementById('keywordModal').classList.remove('hidden');
}

// 顯示編輯 Modal
window.showEditModal = async function(keywordId) {
    try {
        const kw = await keywordService.getKeyword(keywordId);
        
        document.getElementById('modalTitle').textContent = '編輯關鍵詞';
        document.getElementById('keywordId').value = kw.id;
        document.getElementById('keyword').value = kw.keyword;
        document.getElementById('liffUrl').value = kw.liffUrl;
        document.getElementById('description').value = kw.description || '';
        document.getElementById('priority').value = kw.priority || 0;
        document.getElementById('buttonLabel').value = kw.replyPayload?.label || '立即開啟';
        document.getElementById('enabled').checked = kw.enabled;
        
        currentAliases = kw.aliases || [];
        renderAliases();
        
        document.getElementById('keywordModal').classList.remove('hidden');
    } catch (error) {
        console.error('載入關鍵詞失敗:', error);
        showError('載入關鍵詞失敗');
    }
};

// 關閉 Modal
function closeModal() {
    document.getElementById('keywordModal').classList.add('hidden');
    document.getElementById('modalError').style.display = 'none';
}

// 新增別名
function addAlias() {
    const input = document.getElementById('aliasInput');
    const alias = input.value.trim();
    
    if (!alias) return;
    
    if (currentAliases.includes(alias)) {
        showModalError('別名已存在');
        return;
    }
    
    currentAliases.push(alias);
    renderAliases();
    input.value = '';
}

// 移除別名
window.removeAlias = function(alias) {
    currentAliases = currentAliases.filter(a => a !== alias);
    renderAliases();
};

// 渲染別名列表
function renderAliases() {
    const listEl = document.getElementById('aliasList');
    
    if (currentAliases.length === 0) {
        listEl.innerHTML = '';
        return;
    }
    
    listEl.innerHTML = currentAliases.map(alias => `
        <div class="alias-item">
            ${escapeHtml(alias)}
            <button type="button" onclick="removeAlias('${escapeHtml(alias)}')">&times;</button>
        </div>
    `).join('');
}

// 處理表單提交
async function handleSubmit(event) {
    event.preventDefault();
    
    const keywordId = document.getElementById('keywordId').value;
    const keywordData = {
        keyword: document.getElementById('keyword').value,
        liffUrl: document.getElementById('liffUrl').value,
        description: document.getElementById('description').value,
        priority: document.getElementById('priority').value,
        enabled: document.getElementById('enabled').checked,
        aliases: currentAliases,
        replyType: 'template',
        replyPayload: {
            altText: document.getElementById('keyword').value,
            text: document.getElementById('keyword').value,
            label: document.getElementById('buttonLabel').value
        }
    };
    
    try {
        if (keywordId) {
            await keywordService.updateKeyword(keywordId, keywordData, currentUserId);
            showSuccess('關鍵詞已更新');
        } else {
            await keywordService.createKeyword(keywordData, currentUserId);
            showSuccess('關鍵詞已新增');
        }
        
        closeModal();
        await loadKeywords();
    } catch (error) {
        console.error('儲存失敗:', error);
        showModalError(error.message || '儲存失敗');
    }
}

// 切換狀態
window.toggleStatus = async function(keywordId, enabled) {
    try {
        await keywordService.toggleKeywordStatus(keywordId, enabled, currentUserId);
        await loadKeywords();
        showSuccess(enabled ? '關鍵詞已啟用' : '關鍵詞已停用');
    } catch (error) {
        console.error('更新狀態失敗:', error);
        showError('更新狀態失敗');
    }
};

// 刪除關鍵詞
window.deleteKeyword = async function(keywordId, keyword) {
    if (!confirm(`確定要刪除關鍵詞「${keyword}」嗎？`)) {
        return;
    }
    
    try {
        await keywordService.deleteKeyword(keywordId);
        await loadKeywords();
        showSuccess('關鍵詞已刪除');
    } catch (error) {
        console.error('刪除失敗:', error);
        showError('刪除失敗');
    }
};

// 工具函數
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('zh-TW');
}

function showError(message) {
    alert('❌ ' + message);
}

function showSuccess(message) {
    alert('✅ ' + message);
}

function showModalError(message) {
    const errorEl = document.getElementById('modalError');
    errorEl.textContent = message;
    errorEl.style.display = 'block';
}

// 批量更新 LIFF URL 格式
async function batchUpdateUrls() {
    if (!confirm('🔧 確定要批量更新所有關鍵詞的 LIFF URL 格式嗎？\n\n將會把舊格式：\nhttps://liff.line.me/ID/path\n\n轉換為新格式：\nhttps://liff.line.me/ID?liff.state=/path')) {
        return;
    }
    
    try {
        let updatedCount = 0;
        let skippedCount = 0;
        
        for (const kw of allKeywords) {
            if (!kw.liffUrl) {
                skippedCount++;
                continue;
            }
            
            const oldUrl = kw.liffUrl;
            const newUrl = convertLiffUrl(oldUrl);
            
            if (oldUrl !== newUrl) {
                console.log(`更新 ${kw.keyword}: ${oldUrl} → ${newUrl}`);
                // 必須傳遞完整的關鍵詞資料（包含所有欄位避免覆蓋）
                await keywordService.updateKeyword(kw.id, {
                    keyword: kw.keyword,
                    liffUrl: newUrl,
                    aliases: kw.aliases || [],
                    priority: kw.priority || 0,
                    enabled: kw.enabled !== undefined ? kw.enabled : true,
                    description: kw.description || '',
                    replyType: kw.replyType || 'template',
                    replyPayload: kw.replyPayload || {
                        altText: kw.keyword,
                        text: kw.keyword,
                        label: '立即開啟'
                    }
                }, currentUserId);
                updatedCount++;
            } else {
                skippedCount++;
            }
        }
        
        await loadKeywords();
        showSuccess(`✅ 批量更新完成！\n\n更新: ${updatedCount} 個\n跳過: ${skippedCount} 個`);
    } catch (error) {
        console.error('批量更新失敗:', error);
        showError('批量更新失敗: ' + error.message);
    }
}

// 轉換 LIFF URL 格式（批量更新用）
function convertLiffUrl(url) {
    if (!url) return url;
    
    // 如果已經是正確的簡短格式，直接返回
    if (/^https:\/\/liff\.line\.me\/[^?]+$/.test(url)) {
        return url;
    }
    
    // 移除錯誤的 liff.state 參數
    const match = url.match(/https:\/\/liff\.line\.me\/([^?]+)(\?liff\.state=(.+))?/);
    
    if (match) {
        const liffId = match[1];
        // 只返回基礎 URL，不需要 liff.state
        return `https://liff.line.me/${liffId}`;
    }
    
    return url;
}

// 網址轉換工具：將路徑轉換為完整 LIFF URL
function convertPathToLiffUrl() {
    const pathInput = document.getElementById('pathInput');
    const liffUrlInput = document.getElementById('liffUrl');
    
    let path = pathInput.value.trim();
    
    if (!path) {
        alert('⚠️ 請輸入網頁路徑');
        pathInput.focus();
        return;
    }
    
    // 確保路徑以 / 開頭
    if (!path.startsWith('/')) {
        path = '/' + path;
    }
    
    // 🎯 智能 LIFF ID 分類：根據路徑自動選擇對應的 LIFF App
    const LIFF_ID_MAP = {
        '/liff/checkin': '2008269293-nYBm3JmV',  // 奉香簽到
        '/liff/schedule': '2008269293-N0wnqknr', // 排班系統
        '/liff/service': '2008269293-Nl2pZBpV'   // 神務服務
    };
    
    // 判斷路徑屬於哪個模組
    let LIFF_ID = null;
    let moduleName = '';
    
    for (const [prefix, liffId] of Object.entries(LIFF_ID_MAP)) {
        if (path.startsWith(prefix)) {
            LIFF_ID = liffId;
            moduleName = prefix.split('/').pop(); // 提取模組名稱
            break;
        }
    }
    
    // 如果無法自動判斷，提示用戶
    if (!LIFF_ID) {
        alert(`⚠️ 無法自動判斷 LIFF ID！\n\n請確認路徑格式：\n• /liff/checkin/xxx.html（奉香簽到）\n• /liff/schedule/xxx.html（排班系統）\n• /liff/service/xxx.html（神務服務）\n\n您輸入的路徑：${path}`);
        return;
    }
    
    // 生成正確的 LIFF URL（不需要 liff.state 參數）
    const liffUrl = `https://liff.line.me/${LIFF_ID}`;
    
    // 填入 LIFF URL 欄位
    liffUrlInput.value = liffUrl;
    
    // 清空路徑輸入框
    pathInput.value = '';
    
    // 模組名稱對照表
    const moduleNameMap = {
        'checkin': '奉香簽到',
        'schedule': '排班系統',
        'service': '神務服務'
    };
    
    // 顯示成功提示
    showSuccess(`✅ 轉換成功！\n\n模組：${moduleNameMap[moduleName]}\nLIFF ID：${LIFF_ID}\n\n已生成 LIFF URL：\n${liffUrl}\n\n💡 提示：路徑 "${path}" 已自動對應到正確的 LIFF App`);
}

// 初始化
init();
