# ServiceFormEngine 架構設計文件

## 🎯 設計目標

### 問題分析
- **現狀**：11 個服務表單共 6,344 行代碼，其中 5,075 行 (80%) 為重複代碼
- **痛點**：
  - 修改 bug 需要更新 11 個檔案
  - 已發生遺漏更新（cookie→localStorage 遷移）
  - 維護成本極高，容易出錯
  - 新增服務需要複製完整檔案

### 解決方案
採用**配置驅動架構**，將相同邏輯抽取為可重用引擎，差異部分透過配置檔案控制。

**目標**：
- ✅ 減少 80% 代碼重複
- ✅ 單一修改點（Single Source of Truth）
- ✅ 新增服務只需配置檔案（無需寫代碼）
- ✅ 保持現有功能完全兼容

---

## 📐 架構設計

### 核心概念

```
服務表單 = ServiceFormEngine（通用引擎） + ServiceConfig（服務配置）
```

#### 1. ServiceFormEngine（通用引擎）
負責所有服務共享的邏輯：
- 🔐 認證流程（LINE OAuth）
- 📝 表單驗證（必填欄位、格式檢查）
- 💳 支付處理（信用卡格式化）
- 📊 計算邏輯（數量 × 單價）
- 🎴 卡片管理（新增/刪除/編輯）
- 📤 提交流程（Cloud Function 呼叫）
- 🔄 狀態管理（登入/未登入）

#### 2. ServiceConfig（服務配置）
定義每個服務的差異：
- `serviceType`：服務代碼（dd, ld, nd...）
- `pricing`：價格設定
  - `itemType`：項目類型（"lamp" 或 "dou"）
  - `pricePerItem`：單價
- `itemOptions`：項目選項（生肖、斗類型等）
- `validation`：自訂驗證規則
- `ui`：UI 客製化（標題、按鈕文字）

---

## 🏗️ 檔案結構

```
public/
├── js/
│   └── service-form-engine/
│       ├── ServiceFormEngine.js       # 核心引擎（1,500 行）
│       ├── AuthManager.js             # 認證管理模組（300 行）
│       ├── FormValidator.js           # 表單驗證模組（200 行）
│       ├── PaymentHandler.js          # 支付處理模組（150 行）
│       ├── CardManager.js             # 卡片管理模組（400 行）
│       └── SubmitHandler.js           # 提交處理模組（200 行）
│
├── service/
│   ├── configs/
│   │   ├── dd.config.js               # DD 配置（50 行）
│   │   ├── ld.config.js               # LD 配置（50 行）
│   │   └── ...其他 9 個配置檔
│   │
│   └── js/
│       ├── DD.js                      # 簡化為 20 行
│       ├── LD.js                      # 簡化為 20 行
│       └── ...其他 9 個入口檔
│
└── docs/
    ├── ServiceFormEngine-Architecture.md   # 本文件
    └── ServiceFormEngine-Migration.md      # 遷移指南（待建立）
```

**代碼行數變化**：
- 重構前：6,344 行（11 個服務 × 平均 577 行）
- 重構後：3,300 行
  - 核心引擎：2,750 行（可重用）
  - 配置檔案：550 行（11 × 50 行）
  - 入口檔案：220 行（11 × 20 行）
- **減少代碼**：3,044 行（48% 減少）

---

## 📦 模組設計

### 1. ServiceFormEngine.js（核心引擎）

```javascript
/**
 * ServiceFormEngine - 服務表單通用引擎
 * 
 * 使用方式：
 *   import { ServiceFormEngine } from '/js/service-form-engine/ServiceFormEngine.js';
 *   import { ddConfig } from '../configs/dd.config.js';
 *   
 *   const engine = new ServiceFormEngine(ddConfig);
 *   engine.init();
 */
export class ServiceFormEngine {
    constructor(config) {
        this.config = config;
        
        // === CRITICAL: 解析 DOM 元素 ===
        // 將選擇器字串轉換為實際 DOM 元素
        this.elements = this.resolveDOMElements(config.selectors);
        
        // === 功能鉤子系統 ===
        // 必須在模組初始化之前建立，因為 CardManager 需要 hooks
        this.hooks = this.initializeHooks(config.features);
        
        // 初始化模組（傳入已解析的元素和鉤子）
        this.modules = {
            auth: new AuthManager(config, this.elements),
            validator: new FormValidator(config, this.elements),
            payment: new PaymentHandler(config, this.elements),
            cards: new CardManager(config, this.elements, this.hooks),  // 傳入 hooks
            submit: new SubmitHandler(config, this.elements)
        };
    }

    /**
     * 解析 DOM 元素
     * 將配置中的選擇器字串轉換為實際 DOM 元素
     */
    resolveDOMElements(selectors) {
        const elements = {};
        for (const [key, selector] of Object.entries(selectors)) {
            const element = document.querySelector(selector);
            if (!element) {
                console.warn(`Element not found: ${selector} (key: ${key})`);
            }
            elements[key] = element;
        }
        return elements;
    }

    /**
     * 初始化功能鉤子
     * 根據配置啟用特定功能
     */
    initializeHooks(features) {
        return {
            // 生肖自動計算
            autoFillShengxiao: features.autoFillShengxiao 
                ? (card, dateString) => this.handleAutoFillShengxiao(card, dateString)
                : () => {},
            
            // 第一張卡片姓名同步
            syncFirstCardName: features.syncFirstCardName
                ? (card) => this.handleSyncFirstCardName(card)
                : () => {},
            
            // 感謝狀領取方式
            handleReceiptOption: features.receiptOptions
                ? (option) => this.handleReceiptOptionChange(option)
                : () => {},
            
            // 斗類型選擇（LD 特有）
            handleDouType: features.douTypeSelection
                ? (type) => this.handleDouTypeSelection(type)
                : () => {}
        };
    }

    async init() {
        // 1. 載入 Firebase
        await this.modules.auth.initialize();
        
        // 2. 檢查登入狀態
        await this.modules.auth.checkAuthState(
            (user) => this.onUserLoggedIn(user),
            () => this.onUserNotLoggedIn()
        );
    }

    async onUserLoggedIn(user) {
        // 3. 載入用戶資料
        const userData = await this.modules.auth.loadUserData(user);
        
        // 4. 自動填入表單
        this.autoFillContactInfo(userData);
        
        // 5. 初始化事件監聽
        this.setupEventListeners();
        
        // 6. 顯示主畫面
        this.showMainApp();
    }

    setupEventListeners() {
        // 模式切換
        this.elements.modeSingle?.addEventListener('change', () => this.updateMode());
        this.elements.modeMulti?.addEventListener('change', () => this.updateMode());
        
        // 卡片管理
        this.elements.addApplicantBtn?.addEventListener('click', () => 
            this.modules.cards.createCard()
        );
        
        // 提交
        this.elements.submitBtn?.addEventListener('click', () => 
            this.handleSubmit()
        );
        
        // 支付欄位格式化
        this.modules.payment.setupFormatting(this.elements);
        
        // 感謝狀領取方式（如果啟用）
        if (this.config.features.receiptOptions) {
            const receiptOptions = document.querySelectorAll('input[name="receiptOption"]');
            receiptOptions.forEach(option => {
                option.addEventListener('change', () => 
                    this.hooks.handleReceiptOption(option.value)
                );
            });
        }
    }

    async handleSubmit() {
        // 1. 驗證表單
        const validation = this.modules.validator.validateAll();
        if (!validation.isValid) {
            this.showErrors(validation.errors);
            return;
        }

        // 2. 收集資料
        const formData = this.collectFormData();

        // 3. 提交到 Cloud Function
        const result = await this.modules.submit.submit(formData);

        // 4. 導向成功頁
        if (result.ok) {
            window.location.href = `success.html?orderId=${result.orderId}&service=${this.config.serviceType}`;
        }
    }

    collectFormData() {
        return {
            serviceType: this.config.serviceType,
            contactInfo: this.getContactInfo(),
            applicants: this.modules.cards.getAllCardData(),
            payment: this.modules.payment.getPaymentInfo(),
            totalAmount: this.calculateTotal()
        };
    }

    calculateTotal() {
        const totalItems = this.modules.cards.getTotalItemCount();
        return totalItems * this.config.pricing.pricePerItem;
    }
}
```

---

### 2. CardManager.js（卡片管理模組）

```javascript
/**
 * CardManager - 報名者卡片管理
 * 
 * 核心功能：
 * 1. 卡片樣板渲染（支援服務特定欄位）
 * 2. 新增/刪除卡片
 * 3. 數據收集
 * 4. 生肖自動計算
 */
export class CardManager {
    constructor(config, elements, hooks) {
        this.config = config;
        this.elements = elements;
        this.hooks = hooks;              // 注入功能鉤子
        this.cardIdCounter = 0;
        
        // === UI 模板策略 ===
        // 從 HTML 中讀取現有的卡片模板（保持現有 UI 不變）
        this.cardTemplate = this.elements.applicantCardList?.querySelector('.applicant-card')?.cloneNode(true);
        
        // 如果沒有現有卡片，使用配置生成模板
        if (!this.cardTemplate) {
            this.cardTemplate = this.generateCardTemplate(config.fields.applicant);
        }
    }

    /**
     * 生成卡片模板
     * 根據配置動態生成 HTML 模板（用於新服務）
     */
    generateCardTemplate(fields) {
        const template = document.createElement('div');
        template.className = 'applicant-card';
        template.setAttribute('data-collapsed', 'false');
        
        let html = `
            <div class="card-header">
                <span class="card-summary-name">報名者本人</span>
                <div class="card-actions">
                    <button class="card-toggle-btn" type="button">收合</button>
                    <button class="card-delete-btn" type="button">刪除</button>
                </div>
            </div>
            <div class="card-body">
        `;
        
        // 動態生成欄位
        for (const [fieldName, fieldConfig] of Object.entries(fields)) {
            html += this.generateField(fieldName, fieldConfig);
        }
        
        html += `</div>`;
        template.innerHTML = html;
        return template;
    }

    /**
     * 生成單一欄位 HTML
     * 支援不同欄位類型（text, date, select 等）
     * 
     * IMPORTANT: 使用 \${id} 佔位符，稍後在 createCard() 中替換為實際 ID
     */
    generateField(fieldName, fieldConfig) {
        const idPlaceholder = `${fieldName}-\${id}`;  // 使用 \${id} 佔位符
        const label = fieldConfig.label;
        const required = fieldConfig.required ? 'required' : '';
        
        switch (fieldName) {
            case 'birthDate':
                return `
                    <div class="form-group">
                        <label for="${idPlaceholder}">${label} ${required ? '<span class="required">*</span>' : ''}</label>
                        <input type="date" id="${idPlaceholder}" class="card-input-birthdate" ${required}>
                        <div class="date-info">
                            <span id="lunar-year-\${id}"></span>
                            <span id="western-year-\${id}"></span>
                        </div>
                    </div>
                `;
            case 'shengxiao':
                return `
                    <div class="form-group">
                        <label for="${idPlaceholder}">${label} ${required ? '<span class="required">*</span>' : ''}</label>
                        <select id="${idPlaceholder}" class="card-input-shengxiao" ${required}>
                            <option value="">-- 請選擇 --</option>
                            ${this.config.itemOptions.shengxiao.map(opt => 
                                `<option value="${opt.value}">${opt.label}</option>`
                            ).join('')}
                        </select>
                    </div>
                `;
            default:
                return `
                    <div class="form-group">
                        <label for="${idPlaceholder}">${label} ${required ? '<span class="required">*</span>' : ''}</label>
                        <input type="text" id="${idPlaceholder}" class="card-input-${fieldName}" ${required}>
                    </div>
                `;
        }
    }

    /**
     * 創建新卡片
     * 使用模板克隆並綁定事件
     */
    createCard(initialName = '') {
        const cardId = ++this.cardIdCounter;
        const newCard = this.cardTemplate.cloneNode(true);
        
        // 替換模板中的 ${id} 為實際 ID
        newCard.innerHTML = newCard.innerHTML.replace(/\${id}/g, cardId);
        
        // 綁定事件
        this.bindCardEvents(newCard, cardId);
        
        // 添加到 DOM
        this.elements.applicantCardList.appendChild(newCard);
        
        // 如果啟用生肖自動計算，綁定生日欄位
        if (this.config.features.autoFillShengxiao) {
            const birthDateInput = newCard.querySelector('.card-input-birthdate');
            birthDateInput?.addEventListener('change', (e) => {
                this.hooks.autoFillShengxiao(newCard, e.target.value);
            });
        }
        
        return newCard;
    }

    /**
     * 綁定卡片事件（摺疊/刪除）
     */
    bindCardEvents(card, cardId) {
        const toggleBtn = card.querySelector('.card-toggle-btn');
        const deleteBtn = card.querySelector('.card-delete-btn');
        
        toggleBtn?.addEventListener('click', () => this.toggleCard(card));
        deleteBtn?.addEventListener('click', () => this.deleteCard(card));
        
        // 姓名同步（如果是第一張卡片）
        if (this.config.features.syncFirstCardName) {
            const nameInput = card.querySelector('.card-input-name');
            nameInput?.addEventListener('input', () => {
                this.hooks.syncFirstCardName(card);
            });
        }
    }

    /**
     * 收集所有卡片數據
     */
    getAllCardData() {
        const cards = this.elements.applicantCardList.querySelectorAll('.applicant-card');
        return Array.from(cards).map(card => this.getCardData(card));
    }

    /**
     * 從單張卡片收集數據
     */
    getCardData(card) {
        const data = {};
        for (const fieldName of Object.keys(this.config.fields.applicant)) {
            const input = card.querySelector(`.card-input-${fieldName}`);
            data[fieldName] = input?.value || '';
        }
        return data;
    }

    /**
     * 計算總項目數量
     */
    getTotalItemCount() {
        return this.elements.applicantCardList.querySelectorAll('.applicant-card').length;
    }
}
```

**UI 模板策略總結**：
1. **保持現有 HTML**：從頁面克隆現有卡片模板（向後兼容）
2. **動態生成**：新服務可用配置自動生成模板
3. **欄位驅動**：根據 `config.fields.applicant` 決定顯示哪些欄位
4. **事件綁定**：自動綁定生肖計算、姓名同步等功能
5. **可擴展**：透過 `generateField()` 支援自訂欄位類型

---

### 3. ServiceConfig（配置檔案範例）

#### dd.config.js（點燈服務）

```javascript
/**
 * DD 服務配置
 * 服務名稱：點燈（點燈祈福）
 * 項目：光明燈
 * 單價：500 元/盞
 */
export const ddConfig = {
    // === 基本資訊 ===
    serviceType: 'dd',
    serviceName: '點燈服務',
    
    // === 價格設定 ===
    pricing: {
        itemType: 'lamp',           // 項目類型：lamp（燈）
        itemName: '光明燈',
        pricePerItem: 500,          // 單價：500 元/盞
        displayUnit: '盞'
    },
    
    // === 項目選項 ===
    itemOptions: {
        shengxiao: [                // 生肖選項
            { value: 'rat', label: '鼠' },
            { value: 'ox', label: '牛' },
            { value: 'tiger', label: '虎' },
            // ... 其他生肖
        ]
    },
    
    // === 表單欄位 ===
    fields: {
        applicant: {
            name: { required: true, label: '姓名' },
            birthDate: { required: true, label: '生日（陽曆）' },
            shengxiao: { required: true, label: '生肖' },
            address: { required: true, label: '住址' }
        },
        contact: {
            name: { required: true, label: '聯絡人姓名' },
            phone: { required: true, pattern: /^09\d{8}$/, label: '手機' },
            email: { required: false, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, label: 'Email' },
            address: { required: 'conditional', label: '通訊地址' }  // 依據領取方式決定
        }
    },
    
    // === DOM 元素選擇器 ===
    // IMPORTANT: 使用 selectors（字串），引擎會自動解析為 DOM 元素
    selectors: {
        loginPrompt: '#loginPrompt',
        mainApp: '#mainApp',
        loginBtn: '#loginBtn',
        contactName: '#contactName',
        contactPhone: '#contactPhone',
        contactEmail: '#contactEmail',
        contactAddress: '#contactAddress',
        modeSingle: '#modeSingle',
        modeMulti: '#modeMulti',
        applicantCardList: '#applicantCardList',
        addApplicantBtn: '#addApplicantBtn',
        submitBtn: '#submitBtn',
        totalItems: '#totalLamps',       // DD 使用 totalLamps
        totalAmount: '#totalAmount'
    },
    
    // === UI 客製化 ===
    ui: {
        pageTitle: '點燈申請表單',
        submitButtonText: '送出申請',
        successMessage: '點燈申請已送出！'
    },
    
    // === 特殊功能 ===
    features: {
        autoFillShengxiao: true,         // 自動計算生肖
        receiptOptions: ['self', 'mail'], // 感謝狀領取方式
        syncFirstCardName: true           // 同步第一張卡片姓名
    }
};
```

#### ld.config.js（禮斗服務）

```javascript
/**
 * LD 服務配置
 * 服務名稱：禮斗（安太歲斗）
 * 項目：斗
 * 單價：1,500 元/斗
 */
export const ldConfig = {
    serviceType: 'ld',
    serviceName: '禮斗服務',
    
    pricing: {
        itemType: 'dou',            // 項目類型：dou（斗）
        itemName: '安太歲斗',
        pricePerItem: 1500,         // 單價：1,500 元/斗
        displayUnit: '斗'
    },
    
    itemOptions: {
        douType: [                  // 斗類型（LD 特有）
            { value: 'an-tai-sui', label: '安太歲斗' },
            { value: 'xie-tai-sui', label: '謝太歲斗' }
        ],
        shengxiao: [/* 同 DD */]
    },
    
    fields: {/* 同 DD，但 itemType 不同 */},
    selectors: {
        /* 大部分同 DD，差異： */
        totalItems: '#totalDous',    // LD 使用 totalDous
    },
    
    ui: {
        pageTitle: '禮斗申請表單',
        submitButtonText: '送出申請',
        successMessage: '禮斗申請已送出！'
    },
    
    features: {
        autoFillShengxiao: true,
        receiptOptions: ['self', 'mail'],
        syncFirstCardName: true,
        douTypeSelection: true       // LD 特有：斗類型選擇
    }
};
```

---

### 3. 簡化後的服務入口檔案

#### DD.js（簡化為 20 行）

```javascript
/**
 * DD.js - 點燈服務入口
 * 
 * 原始代碼：577 行
 * 重構後：20 行（減少 97%）
 */
import { ServiceFormEngine } from '/js/service-form-engine/ServiceFormEngine.js';
import { ddConfig } from '../configs/dd.config.js';

export async function init() {
    // 建立引擎實例
    const engine = new ServiceFormEngine(ddConfig);
    
    // 初始化
    await engine.init();
    
    // 將引擎掛載到全域（供 HTML onclick 使用）
    window.serviceFormEngine = engine;
}
```

---

## 🔄 遷移策略

### 階段 1：建立基礎設施（1 週）
- ✅ 建立 `/js/service-form-engine/` 目錄結構
- ✅ 實作 `ServiceFormEngine.js` 核心引擎
- ✅ 實作 5 個管理模組（Auth, Validator, Payment, Card, Submit）
- ✅ 撰寫單元測試

### 階段 2：配置化第一個服務（3 天）
- ✅ 建立 `dd.config.js`
- ✅ 重構 `DD.js` 使用引擎
- ✅ **完整測試 DD 服務功能**（不能有任何回歸）
- ✅ 確認 DD.html 正常運作

### 階段 3：逐步遷移其他服務（2 週）
每個服務採用**漸進式遷移**：
1. 建立配置檔案（ld.config.js）
2. 重構入口檔案（LD.js）
3. 測試該服務
4. 確認無誤後繼續下一個

**遷移順序**：DD → LD → ND → PS → QJ → ZY → BG → FTC → FTP → FTY → XY

### 階段 4：清理與優化（3 天）
- ✅ 移除舊代碼
- ✅ 整合測試
- ✅ 效能優化
- ✅ 文件更新

**總時程**：約 4 週

---

## ✅ 測試策略

### 回歸測試清單
每個服務遷移後必須測試：

#### 1. 認證流程
- [ ] 未登入時顯示登入提示
- [ ] LINE 登入成功後自動填入聯絡人資訊
- [ ] 登入狀態保持

#### 2. 表單驗證
- [ ] 必填欄位驗證（姓名、電話、地址）
- [ ] 格式驗證（手機號碼、Email）
- [ ] 錯誤提示正確顯示
- [ ] 感謝狀領取方式影響地址欄位

#### 3. 卡片管理
- [ ] 新增報名者卡片
- [ ] 刪除卡片（至少保留一張）
- [ ] 摺疊/展開卡片
- [ ] 第一張卡片姓名同步

#### 4. 生肖計算
- [ ] 輸入陽曆生日自動計算生肖
- [ ] 顯示農曆日期
- [ ] 顯示西元/民國年

#### 5. 計算邏輯
- [ ] 總數量計算正確
- [ ] 總金額計算正確
- [ ] 數量變更即時更新

#### 6. 支付處理
- [ ] 信用卡號碼格式化（每 4 位加空格）
- [ ] 到期日格式化（MM/YY）
- [ ] CVV 限制 3-4 位數字

#### 7. 提交流程
- [ ] 資料正確送到 Cloud Function
- [ ] 成功後導向 success.html
- [ ] 失敗時顯示錯誤訊息

### 自動化測試
建議使用 Playwright 進行端到端測試：

```javascript
// tests/service-forms/dd.spec.js
test('DD 服務完整流程', async ({ page }) => {
    // 1. 訪問 DD 頁面
    await page.goto('/service/DD.html');
    
    // 2. 模擬登入
    // ...
    
    // 3. 填寫表單
    await page.fill('#contactName', '測試用戶');
    await page.fill('#contactPhone', '0912345678');
    
    // 4. 新增報名者
    await page.click('#addApplicantBtn');
    
    // 5. 提交表單
    await page.click('#submitBtn');
    
    // 6. 驗證導向成功頁
    await expect(page).toHaveURL(/success.html/);
});
```

---

## 🛡️ 風險評估

### 高風險區域
1. **認證流程**：LINE OAuth 流程不能中斷
2. **生肖計算**：依賴 lunar-javascript 套件
3. **支付處理**：信用卡資料不能外洩
4. **Cloud Function 整合**：API 格式必須兼容

### 降低風險措施
1. **分階段上線**：一次只遷移一個服務
2. **金絲雀部署**：先部署 DD，觀察 1 週無誤後繼續
3. **回滾方案**：保留舊代碼，如有問題可立即回滾
4. **監控告警**：設定 Cloud Function 錯誤告警

---

## 📊 預期效益

### 代碼層面
- **減少重複代碼**：從 80% → 0%
- **程式碼行數**：6,344 → 3,300 行（減少 48%）
- **維護成本**：11 次修改 → 1 次修改

### 開發層面
- **修復 bug 時間**：從 2 小時（11 個檔案）→ 10 分鐘（1 個檔案）
- **新增服務時間**：從 4 小時（複製+修改）→ 30 分鐘（配置檔案）
- **測試時間**：從 11 次完整測試 → 1 次核心測試 + 11 次配置測試

### 品質層面
- **一致性**：所有服務使用相同邏輯，行為統一
- **可測試性**：模組化後易於單元測試
- **可擴展性**：新增功能只需在引擎中實作一次

---

## 📝 後續文件
- [ ] `ServiceFormEngine-Migration.md` - 詳細遷移步驟指南
- [ ] `ServiceFormEngine-API.md` - 引擎 API 文件
- [ ] `ServiceFormEngine-Testing.md` - 測試指南

---

**版本**：v1.0  
**建立日期**：2025-11-11  
**作者**：Replit Agent  
**狀態**：設計階段
