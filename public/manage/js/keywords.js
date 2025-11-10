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
    
    // 診斷按鈕
    document.getElementById('diagnosticBtn').addEventListener('click', showDiagnostic);
    
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

// 🔍 診斷功能：顯示所有 URL
function showDiagnostic() {
    let diagnostic = '📊 當前數據庫中的 LIFF URL：\n\n';
    let urlList = [];
    
    for (const kw of allKeywords) {
        if (kw.liffUrl) {
            const line = `${kw.keyword}: ${kw.liffUrl}`;
            diagnostic += `• ${line}\n`;
            urlList.push(line);
        }
    }
    
    console.log(diagnostic);
    
    // 創建一個可複製的對話框
    const textarea = document.createElement('textarea');
    textarea.value = diagnostic;
    textarea.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:80%;max-width:800px;height:400px;padding:20px;font-family:monospace;font-size:14px;border:2px solid #667eea;border-radius:8px;background:white;z-index:10000;box-shadow:0 4px 20px rgba(0,0,0,0.3);';
    
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999;';
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✓ 關閉';
    closeBtn.className = 'btn btn-primary';
    closeBtn.style.cssText = 'position:fixed;top:calc(50% + 220px);left:50%;transform:translateX(-50%);z-index:10001;';
    
    closeBtn.onclick = () => {
        document.body.removeChild(textarea);
        document.body.removeChild(overlay);
        document.body.removeChild(closeBtn);
    };
    
    overlay.onclick = closeBtn.onclick;
    
    document.body.appendChild(overlay);
    document.body.appendChild(textarea);
    document.body.appendChild(closeBtn);
    
    textarea.select();
    
    showSuccess('✅ 診斷結果已顯示！您可以直接選取並複製文字');
}

// 批量更新 LIFF URL 格式
async function batchUpdateUrls() {
    // 🔍 先在控制台輸出診斷
    let diagnostic = '📊 當前數據庫中的 LIFF URL：\n\n';
    for (const kw of allKeywords) {
        if (kw.liffUrl) {
            diagnostic += `• ${kw.keyword}: ${kw.liffUrl}\n`;
        }
    }
    console.log(diagnostic);
    
    if (!confirm('🔧 確定要批量更新所有關鍵詞的 LIFF URL 格式嗎？\n\n將會修復錯誤格式：\n❌ https://liff.line.me/ID/liff/service\n✅ https://liff.line.me/ID\n\n點擊「確定」前，請查看瀏覽器控制台的診斷日誌')) {
        return;
    }
    
    try {
        let updatedCount = 0;
        let skippedCount = 0;
        
        for (const kw of allKeywords) {
            if (!kw.liffUrl) {
                console.log(`⏭️ 跳過（無 URL）: ${kw.keyword}`);
                skippedCount++;
                continue;
            }
            
            const oldUrl = kw.liffUrl;
            const newUrl = convertLiffUrl(oldUrl, kw.keyword);
            
            if (oldUrl !== newUrl) {
                console.log(`🔧 更新 ${kw.keyword}: ${oldUrl} → ${newUrl}`);
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
                console.log(`✅ 跳過（已正確）: ${kw.keyword} - ${oldUrl}`);
                skippedCount++;
            }
        }
        
        await loadKeywords();
        showSuccess(`✅ 批量更新完成！\n\n更新: ${updatedCount} 個\n跳過: ${skippedCount} 個\n\n詳細日誌請查看瀏覽器控制台（F12）`);
    } catch (error) {
        console.error('批量更新失敗:', error);
        showError('批量更新失敗: ' + error.message);
    }
}

// 轉換 LIFF URL 格式（批量更新用）
function convertLiffUrl(url, keyword) {
    if (!url) return url;
    
    // ❌ 錯誤格式1：https://liff.line.me/ID/liff/service （主頁面錯誤帶了路徑）
    // ❌ 錯誤格式2：https://liff.line.me/ID/liff/checkin.html （主頁面錯誤帶了路徑）
    const wrongMainPagePattern = /https:\/\/liff\.line\.me\/([^/]+)\/liff\/(service|checkin|schedule)(\.html)?$/;
    if (wrongMainPagePattern.test(url)) {
        const match = url.match(/https:\/\/liff\.line\.me\/([^/]+)\//);
        console.log(`🔧 修復主頁面 URL: ${url} → https://liff.line.me/${match[1]}`);
        return `https://liff.line.me/${match[1]}`;
    }
    
    // 🎯 智能修復：為服務關鍵詞添加缺少的 liff.state 參數
    const serviceMapping = {
        '點燈': '/DD',
        '龜馬山一點靈': '/DD',
        '年斗': '/ND',
        '年斗法會': '/ND',
        '禮斗': '/LD',
        '禮斗法會': '/LD',
        '中元': '/ZY',
        '中元法會': '/ZY',
        '普施': '/PS',
        '普施法會': '/PS',
        '秋祭': '/QJ',
        '秋祭法會': '/QJ',
        '建宮廟款': '/BG',
        '添香油': '/XY',
        '福田會': '/FT',
        '奉獻': '/donation'
    };
    
    // 檢查是否是服務關鍵詞但缺少 liff.state
    if (serviceMapping[keyword]) {
        const serviceCode = serviceMapping[keyword];
        // 如果 URL 是純 LIFF ID（沒有 liff.state），添加它
        if (url === 'https://liff.line.me/2008269293-Nl2pZBpV') {
            const newUrl = `${url}?liff.state=${serviceCode}`;
            console.log(`🔧 添加 liff.state: ${keyword} - ${url} → ${newUrl}`);
            return newUrl;
        }
    }
    
    // ✅ 其他格式不需要轉換，直接返回
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
    
    // 🎯 智能 LIFF ID 分類：根據路徑自動選擇對應的 LIFF App（支持新舊兩種格式）
    const LIFF_ID_MAP = {
        '/liff/checkin': '2008269293-nYBm3JmV',  // 奉香簽到（舊格式）
        '/checkin': '2008269293-nYBm3JmV',       // 奉香簽到（新格式）
        '/liff/schedule': '2008269293-N0wnqknr', // 排班系統（舊格式）
        '/schedule': '2008269293-N0wnqknr',      // 排班系統（新格式）
        '/liff/service': '2008269293-Nl2pZBpV',  // 神務服務（舊格式）
        '/service': '2008269293-Nl2pZBpV'        // 神務服務（新格式）
    };
    
    // 判斷路徑屬於哪個模組
    let LIFF_ID = null;
    let moduleName = '';
    
    for (const [prefix, liffId] of Object.entries(LIFF_ID_MAP)) {
        if (path.startsWith(prefix)) {
            LIFF_ID = liffId;
            // 提取模組名稱（移除 /liff 前綴）
            moduleName = prefix.replace('/liff/', '').replace('/', ''); 
            break;
        }
    }
    
    // 如果無法自動判斷，提示用戶
    if (!LIFF_ID) {
        alert(`⚠️ 無法自動判斷 LIFF ID！\n\n請確認路徑格式：\n• /checkin/xxx.html 或 /liff/checkin/xxx.html（奉香簽到）\n• /schedule/xxx.html 或 /liff/schedule/xxx.html（排班系統）\n• /service/xxx.html 或 /liff/service/xxx.html（神務服務）\n\n您輸入的路徑：${path}`);
        return;
    }
    
    // 🎯 判斷是否需要 liff.state 參數
    let liffUrl;
    let explanation;
    
    // 🎯 主頁面邏輯：直接使用 LIFF ID，不帶任何路徑
    if (path === '/liff/checkin.html' || path === '/liff/service.html' || path === '/liff/schedule.html') {
        liffUrl = `https://liff.line.me/${LIFF_ID}`;
        explanation = '📋 這是主頁面，直接使用 LIFF ID（LIFF Endpoint URL 已配置在 LINE Developers Console）';
    } else {
        // 子頁面需要 liff.state 參數來路由
        // 支持新格式（/service/DD.html）和舊格式（/liff/service/DD.html）
        let statePath;
        
        // 先將舊格式轉換為新格式（移除 /liff 前綴）
        let normalizedPath = path;
        if (path.startsWith('/liff/')) {
            normalizedPath = path.replace('/liff', '');
        }
        
        if (normalizedPath.startsWith('/service/')) {
            // 🎯 神務服務：使用新格式的完整路徑
            // 例如 /service/DD.html → liff.state=/service/DD.html
            statePath = normalizedPath;
        } else if (normalizedPath.startsWith('/checkin/')) {
            // 🎯 簽到頁面：使用新格式的完整路徑
            // 例如 /checkin/index.html → liff.state=/checkin/index.html
            statePath = normalizedPath;
        } else if (normalizedPath.startsWith('/schedule/')) {
            // 🎯 排班頁面：使用新格式的完整路徑
            // 例如 /schedule/week.html → liff.state=/schedule/week.html
            statePath = normalizedPath;
        } else {
            // 其他情況，使用完整路徑
            statePath = normalizedPath;
        }
        
        liffUrl = `https://liff.line.me/${LIFF_ID}?liff.state=${statePath}`;
        explanation = `📍 子頁面需要 liff.state 參數來路由到：${statePath}`;
    }
    
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
    showSuccess(`✅ 轉換成功！\n\n模組：${moduleNameMap[moduleName]}\nLIFF ID：${LIFF_ID}\n\n已生成 LIFF URL：\n${liffUrl}\n\n${explanation}`);
}

// 初始化
init();
