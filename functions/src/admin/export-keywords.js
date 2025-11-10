/**
 * Cloud Function: 從 Firestore 導出關鍵字為 keywords.js 代碼
 * HTTP Trigger: 訪問 URL 即可下載
 * 
 * 用途：保持 Firestore、硬編碼、網站後台三者同步
 * 工作流程：
 *   1. 網站後台修改 Firestore 關鍵字
 *   2. 訪問此 URL 導出最新的 keywords.js
 *   3. 複製到 functions/src/shared/keywords.js
 *   4. 重新部署
 *   5. ✅ 三者同步！
 */

const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const logger = require('firebase-functions/logger');

// 初始化 Firebase Admin（只初始化一次）
if (admin.apps.length === 0) {
  admin.initializeApp();
}

/**
 * LIFF App IDs（常量）
 */
const LIFF_IDS = {
  checkin: '2008269293-nYBm3JmV',
  service: '2008269293-Nl2pZBpV',
  schedule: '2008269293-N0wnqknr'
};

/**
 * 生成 keywords.js 代碼
 */
function generateKeywordsCode(keywords) {
  const lines = [];
  
  // 檔案頭部注釋
  lines.push('/**');
  lines.push(' * 共享關鍵字定義模組 - 統一管理所有 LINE Bot 關鍵字');
  lines.push(' * ');
  lines.push(' * 用途：');
  lines.push(' * 1. messaging/index.js - 硬編碼後備');
  lines.push(' * 2. rebuild.js - Firestore 重建資料來源');
  lines.push(' * ');
  lines.push(` * 自動生成時間：${new Date().toISOString()}`);
  lines.push(` * 關鍵字總數：${keywords.length} 個`);
  lines.push(' * 架構：16 個共用 LIFF App + 3 個獨立 LIFF App');
  lines.push(' */');
  lines.push('');
  
  // LIFF App IDs 常量
  lines.push('const LIFF_IDS = {');
  lines.push(`  checkin: '${LIFF_IDS.checkin}',`);
  lines.push(`  service: '${LIFF_IDS.service}',`);
  lines.push(`  schedule: '${LIFF_IDS.schedule}'`);
  lines.push('};');
  lines.push('');
  
  // KEYWORDS 陣列
  lines.push('const KEYWORDS = [');
  
  keywords.forEach((kw, index) => {
    const isLast = index === keywords.length - 1;
    
    lines.push('  {');
    lines.push(`    keyword: ${JSON.stringify(kw.keyword)},`);
    
    // aliases（使用 JSON.stringify 確保正確轉義）
    if (kw.aliases && kw.aliases.length > 0) {
      const aliasesStr = kw.aliases.map(a => JSON.stringify(a)).join(', ');
      lines.push(`    aliases: [${aliasesStr}],`);
    }
    
    // liffUrl（獨立 LIFF App）
    if (kw.liffUrl) {
      lines.push(`    liffUrl: ${JSON.stringify(kw.liffUrl)},`);
    }
    // liffApp + path（共用 LIFF App）
    else if (kw.liffApp && kw.path) {
      lines.push(`    liffApp: ${JSON.stringify(kw.liffApp)},`);
      lines.push(`    path: ${JSON.stringify(kw.path)},`);
    }
    
    // replyPayload（使用 JSON.stringify 確保正確轉義）
    lines.push('    replyPayload: {');
    lines.push(`      altText: ${JSON.stringify(kw.replyPayload.altText)},`);
    lines.push(`      text: ${JSON.stringify(kw.replyPayload.text)},`);
    lines.push(`      label: ${JSON.stringify(kw.replyPayload.label)}`);
    lines.push('    }');
    
    lines.push(`  }${isLast ? '' : ','}`);
  });
  
  lines.push('];');
  lines.push('');
  
  // buildLiffUrl 函數
  lines.push('/**');
  lines.push(' * 建立 LIFF URL（支援兩種模式）');
  lines.push(' */');
  lines.push('function buildLiffUrl(keyword) {');
  lines.push('  // 模式 1: 獨立 LIFF App（直接使用 liffUrl）');
  lines.push('  if (keyword.liffUrl) {');
  lines.push('    return keyword.liffUrl;');
  lines.push('  }');
  lines.push('  ');
  lines.push('  // 模式 2: 共用 LIFF App（組合 liffApp + path）');
  lines.push('  if (keyword.liffApp && keyword.path) {');
  lines.push('    const liffId = LIFF_IDS[keyword.liffApp];');
  lines.push('    return "https://liff.line.me/" + liffId + "?liff.state=" + keyword.path;');
  lines.push('  }');
  lines.push('  ');
  lines.push('  throw new Error("無效的關鍵字配置: " + keyword.keyword);');
  lines.push('}');
  lines.push('');
  
  // normalizeKeyword 函數
  lines.push('/**');
  lines.push(' * 正規化關鍵字（移除空白、轉小寫）');
  lines.push(' */');
  lines.push('function normalizeKeyword(text) {');
  lines.push('  return text.trim().toLowerCase().replace(/\\s+/g, \'\');');
  lines.push('}');
  lines.push('');
  
  // exports
  lines.push('module.exports = {');
  lines.push('  KEYWORDS,');
  lines.push('  LIFF_IDS,');
  lines.push('  buildLiffUrl,');
  lines.push('  normalizeKeyword');
  lines.push('};');
  
  return lines.join('\n');
}

/**
 * Cloud Function HTTP Handler
 */
exports.exportKeywordsToCode = onRequest(
  {
    region: 'asia-east2',
    cors: true
  },
  async (req, res) => {
    logger.info('📦 開始導出關鍵字代碼...');
    
    try {
      const db = admin.firestore();
      const collection = db.collection('lineKeywordMappings');
      
      // 讀取所有關鍵字
      const snapshot = await collection.get();
      
      if (snapshot.empty) {
        res.status(404).send('<pre>❌ 錯誤：Firestore 中沒有關鍵字資料\n\n請先執行 rebuildKeywords</pre>');
        return;
      }
      
      // 讀取並排序（在內存中排序，避免需要 Firestore 索引）
      const keywords = [];
      snapshot.forEach(doc => {
        keywords.push(doc.data());
      });
      
      // 排序：依 category (checkin, service, schedule) 然後依 keyword 字母順序
      keywords.sort((a, b) => {
        const categoryOrder = { 'checkin': 1, 'service': 2, 'schedule': 3 };
        const aCat = categoryOrder[a.category] || 999;
        const bCat = categoryOrder[b.category] || 999;
        
        if (aCat !== bCat) {
          return aCat - bCat;
        }
        
        return a.keyword.localeCompare(b.keyword);
      });
      
      logger.info(`找到 ${keywords.length} 個關鍵字`);
      
      // 生成代碼
      const code = generateKeywordsCode(keywords);
      
      // 檢查是否要下載
      const download = req.query.download === 'true';
      
      if (download) {
        // 下載模式：返回 .js 文件
        res.setHeader('Content-Type', 'application/javascript');
        res.setHeader('Content-Disposition', 'attachment; filename="keywords.js"');
        res.send(code);
      } else {
        // 預覽模式：返回 HTML 格式
        // HTML 轉義函數（防止 XSS）
        function escapeHtml(text) {
          return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
        }
        
        const html = `
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>導出 keywords.js</title>
  <style>
    body {
      font-family: 'Courier New', monospace;
      margin: 20px;
      background: #f5f5f5;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1 {
      color: #333;
      border-bottom: 2px solid #06c755;
      padding-bottom: 10px;
    }
    .stats {
      background: #e8f5e9;
      padding: 15px;
      border-radius: 5px;
      margin: 20px 0;
    }
    .stats p {
      margin: 5px 0;
      color: #2e7d32;
    }
    .buttons {
      margin: 20px 0;
    }
    .btn {
      display: inline-block;
      padding: 12px 24px;
      margin-right: 10px;
      background: #06c755;
      color: white;
      text-decoration: none;
      border-radius: 5px;
      font-weight: bold;
      transition: background 0.3s;
    }
    .btn:hover {
      background: #05b04b;
    }
    .btn-secondary {
      background: #666;
    }
    .btn-secondary:hover {
      background: #555;
    }
    pre {
      background: #f8f8f8;
      border: 1px solid #ddd;
      border-radius: 5px;
      padding: 15px;
      overflow-x: auto;
      font-size: 12px;
      line-height: 1.5;
    }
    .warning {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin: 20px 0;
    }
    .steps {
      background: #e3f2fd;
      border-left: 4px solid #2196f3;
      padding: 15px;
      margin: 20px 0;
    }
    .steps ol {
      margin: 10px 0;
      padding-left: 20px;
    }
    .steps li {
      margin: 8px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📦 導出 keywords.js</h1>
    
    <div class="stats">
      <p><strong>📊 統計資訊：</strong></p>
      <p>✅ 關鍵字總數：${keywords.length} 個</p>
      <p>✅ 生成時間：${new Date().toLocaleString('zh-TW')}</p>
      <p>✅ 代碼行數：${code.split('\n').length} 行</p>
    </div>
    
    <div class="buttons">
      <a href="?download=true" class="btn">📥 下載 keywords.js</a>
      <button class="btn btn-secondary" onclick="copyToClipboard()">📋 複製代碼</button>
    </div>
    
    <div class="steps">
      <p><strong>🔄 同步工作流程：</strong></p>
      <ol>
        <li>在網站後台修改關鍵字（Firestore）</li>
        <li>點擊上方「下載 keywords.js」按鈕</li>
        <li>替換 <code>functions/src/shared/keywords.js</code></li>
        <li>執行 <code>npm run deploy</code> 重新部署</li>
        <li>✅ 三者同步完成！（硬編碼 = Firebase = 網站後台）</li>
      </ol>
    </div>
    
    <div class="warning">
      <p><strong>⚠️ 注意事項：</strong></p>
      <ul>
        <li>此代碼是從 Firestore 實時生成的</li>
        <li>下載後請立即替換並重新部署</li>
        <li>重新部署後，硬編碼與 Firestore 才會同步</li>
      </ul>
    </div>
    
    <h2>📄 生成的代碼預覽：</h2>
    <pre id="code">${escapeHtml(code)}</pre>
  </div>
  
  <script>
    function copyToClipboard() {
      const code = document.getElementById('code').textContent;
      navigator.clipboard.writeText(code).then(() => {
        alert('✅ 代碼已複製到剪貼簿！');
      }).catch(err => {
        alert('❌ 複製失敗：' + err);
      });
    }
  </script>
</body>
</html>
        `;
        
        res.status(200).send(html);
      }
      
      logger.info('導出成功！');
      
    } catch (error) {
      logger.error('導出失敗:', error);
      res.status(500).send(`<pre>❌ 錯誤：${error.message}</pre>`);
    }
  }
);
