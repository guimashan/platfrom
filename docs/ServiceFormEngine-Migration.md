# ServiceFormEngine 遷移步驟與時程規劃

## 📋 遷移總覽

**目標**：將 11 個重複的服務表單重構為配置驅動架構，減少 48% 代碼並提升維護效率。

**⚠️ 重要聲明**：
本文件為**架構規劃指南**，用於未來實作參考。實際執行需要：
- 建立測試基礎設施（Vitest, Playwright）
- 配置監控工具（Firebase Console, Analytics）
- 根據實際團隊人力調整時程

**原則**：
- ✅ **漸進式遷移**：一次只遷移一個服務
- ✅ **零停機**：保持現有服務持續運作
- ✅ **完整測試**：每個服務遷移後必須通過回歸測試
- ✅ **可回滾**：任何階段都可以快速回滾

**預估時程**：4 週（約 20 個工作天，假設 2-3 位全職工程師）

**前置條件**：
- [ ] 測試框架已安裝（Vitest, Playwright）
- [ ] 監控工具已配置（Firebase Console, Sentry）
- [ ] 團隊人力確認（至少 2 位工程師）

---

## 🗓️ 階段劃分

### 階段 1：基礎設施建設（第 1 週）

**目標**：建立 ServiceFormEngine 核心引擎和模組系統

#### 1.1 建立目錄結構（Day 1）

```bash
# 建立引擎目錄
mkdir -p public/js/service-form-engine
mkdir -p public/service/configs

# 建立文件目錄（已完成）
mkdir -p docs
```

**產出**：
- ✅ `/public/js/service-form-engine/` 目錄
- ✅ `/public/service/configs/` 目錄

---

#### 1.2 實作核心引擎（Day 1-2）

**檔案**：`public/js/service-form-engine/ServiceFormEngine.js`

**核心功能**：
```javascript
export class ServiceFormEngine {
    constructor(config) {
        // 1. 解析 DOM 元素
        this.elements = this.resolveDOMElements(config.selectors);
        
        // 2. 初始化功能鉤子
        this.hooks = this.initializeHooks(config.features);
        
        // 3. 初始化模組
        this.modules = {
            auth: new AuthManager(config, this.elements),
            validator: new FormValidator(config, this.elements),
            payment: new PaymentHandler(config, this.elements),
            cards: new CardManager(config, this.elements, this.hooks),
            submit: new SubmitHandler(config, this.elements)
        };
    }

    async init() { /* 認證流程 */ }
    setupEventListeners() { /* 事件綁定 */ }
    handleSubmit() { /* 提交處理 */ }
    calculateTotal() { /* 金額計算 */ }
}
```

**測試點**：
- [ ] `resolveDOMElements()` 正確解析選擇器
- [ ] `initializeHooks()` 正確建立鉤子
- [ ] 模組初始化順序正確（hooks → modules）

**產出**：
- ✅ ServiceFormEngine.js（約 300 行）

---

#### 1.3 實作管理模組（Day 2-4）

##### AuthManager.js（Day 2）

**核心功能**：
- 載入 Firebase
- 檢查登入狀態
- 自動填入用戶資料

```javascript
export class AuthManager {
    constructor(config, elements) { /* ... */ }
    async initialize() { /* 載入 Firebase */ }
    async checkAuthState(onLoggedIn, onLoggedOut) { /* 狀態監聽 */ }
    async loadUserData(user) { /* 載入資料 */ }
}
```

**測試點**：
- [ ] Firebase 正確載入
- [ ] 登入狀態正確檢測
- [ ] 用戶資料正確填入

**產出**：
- ✅ AuthManager.js（約 150 行）

---

##### FormValidator.js（Day 2）

**核心功能**：
- 必填欄位驗證
- 格式驗證（手機、Email）
- 錯誤提示

```javascript
export class FormValidator {
    constructor(config, elements) { /* ... */ }
    validateAll() { /* 驗證所有欄位 */ }
    validateField(fieldName, value) { /* 驗證單一欄位 */ }
    showErrors(errors) { /* 顯示錯誤 */ }
}
```

**測試點**：
- [ ] 必填欄位驗證正確
- [ ] 正規表達式驗證正確
- [ ] 錯誤提示正確顯示

**產出**：
- ✅ FormValidator.js（約 120 行）

---

##### PaymentHandler.js（Day 3）

**核心功能**：
- 信用卡格式化
- 支付資料收集

```javascript
export class PaymentHandler {
    constructor(config, elements) { /* ... */ }
    setupFormatting(elements) { /* 綁定格式化事件 */ }
    formatCardNumber(value) { /* 每 4 位加空格 */ }
    formatCardExpiry(value) { /* MM/YY 格式 */ }
    getPaymentInfo() { /* 收集支付資料 */ }
}
```

**測試點**：
- [ ] 信用卡號碼格式化正確
- [ ] 到期日格式化正確
- [ ] CVV 限制正確

**產出**：
- ✅ PaymentHandler.js（約 100 行）

---

##### CardManager.js（Day 3-4）

**核心功能**：
- 卡片模板管理
- 新增/刪除卡片
- 數據收集
- 生肖自動計算

```javascript
export class CardManager {
    constructor(config, elements, hooks) { /* ... */ }
    
    // UI 模板
    generateCardTemplate(fields) { /* 動態生成模板 */ }
    generateField(fieldName, fieldConfig) { /* 生成欄位 */ }
    
    // 卡片管理
    createCard(initialName) { /* 創建卡片 */ }
    deleteCard(card) { /* 刪除卡片 */ }
    toggleCard(card) { /* 摺疊/展開 */ }
    
    // 數據收集
    getAllCardData() { /* 收集所有卡片數據 */ }
    getTotalItemCount() { /* 計算總數量 */ }
}
```

**測試點**：
- [ ] 從現有 HTML 克隆模板成功
- [ ] 動態生成模板成功
- [ ] 卡片新增/刪除正常
- [ ] 數據收集正確

**產出**：
- ✅ CardManager.js（約 250 行）

---

##### SubmitHandler.js（Day 4）

**核心功能**：
- Cloud Function 呼叫
- 錯誤處理
- 成功導向

```javascript
export class SubmitHandler {
    constructor(config, elements) { /* ... */ }
    async submit(formData) { /* 提交到 Cloud Function */ }
    handleSuccess(result) { /* 成功處理 */ }
    handleError(error) { /* 錯誤處理 */ }
}
```

**測試點**：
- [ ] Cloud Function 呼叫成功
- [ ] 錯誤處理正確
- [ ] 成功導向正確

**產出**：
- ✅ SubmitHandler.js（約 80 行）

---

#### 1.4 單元測試（Day 4-5）

**測試框架**：Vitest 或 Jest

**測試範例**：
```javascript
// tests/ServiceFormEngine.test.js
import { ServiceFormEngine } from '../public/js/service-form-engine/ServiceFormEngine.js';

describe('ServiceFormEngine', () => {
    test('resolveDOMElements() 正確解析選擇器', () => {
        document.body.innerHTML = `<div id="testBtn"></div>`;
        const config = { selectors: { testBtn: '#testBtn' } };
        const engine = new ServiceFormEngine(config);
        expect(engine.elements.testBtn).toBeDefined();
    });

    test('initializeHooks() 正確建立鉤子', () => {
        const config = { features: { autoFillShengxiao: true } };
        const engine = new ServiceFormEngine(config);
        expect(typeof engine.hooks.autoFillShengxiao).toBe('function');
    });
});
```

**測試覆蓋率目標**：≥ 80%

**產出**：
- ✅ 單元測試檔案
- ✅ 測試覆蓋率報告

---

### 階段 2：首個服務遷移（第 2 週，Day 6-10）

**目標**：遷移 DD（點燈服務）作為範本，驗證架構可行性

#### 2.1 建立 DD 配置檔案（Day 6）

**檔案**：`public/service/configs/dd.config.js`

**內容**（約 80 行）：
```javascript
export const ddConfig = {
    serviceType: 'dd',
    serviceName: '點燈服務',
    
    pricing: {
        itemType: 'lamp',
        itemName: '光明燈',
        pricePerItem: 500,
        displayUnit: '盞'
    },
    
    itemOptions: {
        shengxiao: [
            { value: 'rat', label: '鼠' },
            { value: 'ox', label: '牛' },
            // ... 其他 10 個生肖
        ]
    },
    
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
            address: { required: 'conditional', label: '通訊地址' }
        }
    },
    
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
        totalItems: '#totalLamps',
        totalAmount: '#totalAmount'
    },
    
    ui: {
        pageTitle: '點燈申請表單',
        submitButtonText: '送出申請',
        successMessage: '點燈申請已送出！'
    },
    
    features: {
        autoFillShengxiao: true,
        receiptOptions: ['self', 'mail'],
        syncFirstCardName: true
    }
};
```

**驗證點**：
- [ ] 所有選擇器對應正確的 HTML 元素
- [ ] 欄位配置與現有表單一致
- [ ] 價格設定正確

**產出**：
- ✅ dd.config.js（約 80 行）

---

#### 2.2 重構 DD.js 入口檔案（Day 6）

**原始代碼**：577 行  
**目標代碼**：25 行（包含註解）

**新的 DD.js**：
```javascript
/**
 * DD.js - 點燈服務入口
 * 
 * 重構前：577 行
 * 重構後：25 行（減少 96%）
 * 
 * 所有業務邏輯已移至 ServiceFormEngine
 */
import { ServiceFormEngine } from '/js/service-form-engine/ServiceFormEngine.js';
import { ddConfig } from '../configs/dd.config.js';

export async function init() {
    try {
        // 建立引擎實例
        const engine = new ServiceFormEngine(ddConfig);
        
        // 初始化
        await engine.init();
        
        // 將引擎掛載到全域（供 HTML onclick 使用）
        window.serviceFormEngine = engine;
        window.handleLineLogin = () => engine.modules.auth.handleLineLogin();
        
    } catch (error) {
        console.error('DD 服務初始化失敗:', error);
        alert('服務載入失敗，請重新整理頁面');
    }
}
```

**產出**：
- ✅ 新的 DD.js（25 行）
- ❌ 保留舊的 DD.js.backup（作為回滾備份）

---

#### 2.3 DD 服務完整測試（Day 7-8）

**測試清單**（必須 100% 通過）：

##### 認證流程
- [ ] 未登入時顯示登入提示
- [ ] LINE 登入按鈕正常運作
- [ ] LINE 登入成功後自動填入聯絡人資訊
- [ ] 登入狀態在頁面刷新後保持

##### 表單驗證
- [ ] 必填欄位未填時顯示錯誤提示
- [ ] 手機號碼格式驗證正確（09 開頭，10 位數字）
- [ ] Email 格式驗證正確
- [ ] 感謝狀領取方式影響地址欄位（親自領取時鎖定）

##### 卡片管理
- [ ] 預設顯示一張報名者卡片
- [ ] 點擊「新增報名者」正確新增卡片
- [ ] 卡片可以摺疊/展開
- [ ] 可以刪除卡片（至少保留一張）
- [ ] 第一張卡片姓名與聯絡人姓名雙向同步

##### 生肖計算
- [ ] 輸入陽曆生日後自動計算生肖
- [ ] 顯示農曆日期（例：農曆 113 年 10 月 11 日）
- [ ] 顯示西元/民國年（例：民國 113 年，西元 2024 年）

##### 計算邏輯
- [ ] 總盞數 = 報名者數量
- [ ] 總金額 = 總盞數 × 500 元
- [ ] 新增/刪除卡片時即時更新計算

##### 支付處理
- [ ] 信用卡號碼自動格式化（1234 5678 9012 3456）
- [ ] 到期日自動格式化（MM/YY）
- [ ] CVV 限制 3-4 位數字

##### 提交流程
- [ ] 點擊「送出申請」驗證所有欄位
- [ ] 驗證失敗時捲動到第一個錯誤欄位
- [ ] 提交成功後導向 `success.html?orderId=XXX&service=dd`
- [ ] 提交失敗時顯示錯誤訊息

##### 回歸測試
- [ ] 與舊版本對照，確認行為完全一致
- [ ] 資料格式與舊版本相同（Cloud Function 可接受）

**測試方法**：
1. **手動測試**：按清單逐項測試
2. **自動化測試**：使用 Playwright 記錄完整流程
3. **對照測試**：舊版本 vs 新版本並排測試

**產出**：
- ✅ 測試報告（所有項目通過）
- ✅ Playwright 測試腳本

---

#### 2.4 DD 服務上線（Day 9）

**上線步驟**：

1. **備份舊代碼**
```bash
cp public/service/js/DD.js public/service/js/DD.js.backup_20250111
```

2. **部署新代碼**
```bash
# 推送到 Git
git add public/js/service-form-engine/
git add public/service/configs/dd.config.js
git add public/service/js/DD.js
git commit -m "feat: 重構 DD 服務為配置驅動架構"
git push
```

3. **監控上線**（1-2 小時）
- 檢查 Cloud Function 錯誤率
- 檢查前端錯誤日誌
- 收集用戶回饋

4. **驗證成功指標**
- [ ] DD 服務正常運作
- [ ] Cloud Function 成功率 ≥ 99%
- [ ] 無用戶投訴
- [ ] 提交的訂單格式正確

**回滾方案**（如果失敗）：
```bash
# 還原舊代碼
cp public/service/js/DD.js.backup_20250111 public/service/js/DD.js
git add public/service/js/DD.js
git commit -m "revert: 回滾 DD 服務重構"
git push
```

**產出**：
- ✅ DD 服務成功上線
- ✅ 監控報告

---

#### 2.5 文件更新（Day 10）

**更新內容**：
- ✅ 更新 `replit.md`：記錄重構完成
- ✅ 建立 `docs/DD-Migration-Report.md`：記錄遷移過程和問題
- ✅ 更新 `ServiceFormEngine-Architecture.md`：補充實作細節

---

### 階段 3：批次遷移其他服務（第 3 週，Day 11-15）

**目標**：遷移剩餘 10 個服務

**遷移順序**：
1. LD（禮斗）- Day 11
2. ND（年斗）- Day 11
3. PS（普施）- Day 12
4. QJ（祈金）- Day 12
5. ZY（祖先）- Day 13
6. BG（補庫）- Day 13
7. FTC（福田）- Day 14
8. FTP（法會）- Day 14
9. FTY（法事）- Day 15
10. XY（消災）- Day 15

**每個服務遷移流程**（2-3 小時）：

1. **建立配置檔案**（30 分鐘）
   - 複製 `dd.config.js` 為範本
   - 修改 `serviceType`, `pricing`, `itemOptions`
   - 更新 `selectors`（totalLamps → totalDous 等）
   - 調整 `features`（LD 需要 douTypeSelection）

2. **重構入口檔案**（15 分鐘）
   - 複製新的 DD.js 為範本
   - 修改 import 路徑
   - 備份舊檔案

3. **測試**（1 小時）
   - 執行回歸測試清單
   - 確認所有功能正常

4. **部署**（30 分鐘）
   - Git commit
   - 推送上線
   - 監控 1 小時

**加速技巧**：
- 使用腳本自動生成配置檔案範本
- 批次執行測試
- 並行監控多個服務

**產出**（每個服務）：
- ✅ config 檔案（約 80 行）
- ✅ 簡化的入口檔案（約 25 行）
- ✅ 測試報告

---

### 階段 4：清理與優化（第 4 週，Day 16-20）

#### 4.1 移除舊代碼（Day 16）

**清理清單**：
```bash
# 刪除備份檔案（確認無誤後）
rm public/service/js/*.backup_20250111

# 確認沒有其他檔案引用舊代碼
grep -r "DD.js.backup" public/
```

**產出**：
- ✅ 刪除 11 個備份檔案

---

#### 4.2 整合測試（Day 17-18）

**測試範圍**：
- [ ] 所有 11 個服務同時測試
- [ ] 跨服務切換測試（DD → LD → ND）
- [ ] 併發測試（多人同時使用）
- [ ] 壓力測試（短時間大量提交）

**測試工具**：
- Playwright（端到端測試）
- Apache JMeter（壓力測試）

**產出**：
- ✅ 整合測試報告
- ✅ 效能測試報告

---

#### 4.3 效能優化（Day 18-19）

**優化項目**：
- [ ] 程式碼分割（Code Splitting）
- [ ] 懶加載（Lazy Loading）
- [ ] 快取策略
- [ ] Bundle 大小優化

**目標**：
- 首次載入時間 < 2 秒
- 互動時間（TTI）< 3 秒
- Lighthouse 分數 ≥ 90

**產出**：
- ✅ 效能優化報告

---

#### 4.4 文件完善（Day 19-20）

**文件清單**：
- ✅ `ServiceFormEngine-API.md` - 引擎 API 文件
- ✅ `ServiceFormEngine-Testing.md` - 測試指南
- ✅ `ServiceFormEngine-Troubleshooting.md` - 故障排除
- ✅ 更新 `replit.md` - 專案總覽

---

## 📊 時程總覽表

| 階段 | 時間 | 任務 | 產出 | 風險等級 |
|------|------|------|------|----------|
| **階段 1** | Day 1-5 | 基礎設施建設 | 引擎 + 5 個模組 | 🟡 中 |
| 1.1 | Day 1 | 建立目錄結構 | 目錄結構 | 🟢 低 |
| 1.2 | Day 1-2 | 實作核心引擎 | ServiceFormEngine.js | 🟡 中 |
| 1.3 | Day 2-4 | 實作管理模組 | 5 個模組檔案 | 🟡 中 |
| 1.4 | Day 4-5 | 單元測試 | 測試檔案 | 🟢 低 |
| **階段 2** | Day 6-10 | 首個服務遷移（DD） | DD 配置 + 測試 | 🔴 高 |
| 2.1 | Day 6 | 建立 DD 配置 | dd.config.js | 🟢 低 |
| 2.2 | Day 6 | 重構 DD.js | 新 DD.js（25 行） | 🟡 中 |
| 2.3 | Day 7-8 | DD 完整測試 | 測試報告 | 🔴 高 |
| 2.4 | Day 9 | DD 上線 | 上線報告 | 🔴 高 |
| 2.5 | Day 10 | 文件更新 | 遷移報告 | 🟢 低 |
| **階段 3** | Day 11-15 | 批次遷移（10 個服務） | 10 個配置 | 🟡 中 |
| 3.1-3.10 | Day 11-15 | 遷移 LD~XY | 配置 + 測試 | 🟡 中 |
| **階段 4** | Day 16-20 | 清理與優化 | 文件 + 報告 | 🟢 低 |
| 4.1 | Day 16 | 移除舊代碼 | 清理完成 | 🟢 低 |
| 4.2 | Day 17-18 | 整合測試 | 測試報告 | 🟡 中 |
| 4.3 | Day 18-19 | 效能優化 | 優化報告 | 🟢 低 |
| 4.4 | Day 19-20 | 文件完善 | API 文件 | 🟢 低 |

**總計**：20 個工作天（約 4 週）

---

## ✅ 驗收標準

### 功能驗收
- [ ] 所有 11 個服務功能正常
- [ ] 回歸測試 100% 通過
- [ ] 無新增 bug
- [ ] 提交流程與舊版本完全兼容

### 代碼品質
- [ ] 代碼行數減少 48%（6,344 → 3,300 行）
- [ ] 單元測試覆蓋率 ≥ 80%
- [ ] ESLint 無錯誤
- [ ] TypeScript 型別檢查通過（如適用）

### 效能指標
- [ ] 首次載入時間 < 2 秒
- [ ] 互動時間（TTI）< 3 秒
- [ ] Lighthouse 分數 ≥ 90
- [ ] Cloud Function 成功率 ≥ 99%

### 文件完整性
- [ ] 架構文件完整
- [ ] API 文件完整
- [ ] 測試文件完整
- [ ] 遷移報告完整

---

## 🔄 回滾計劃

### 緊急回滾（< 1 小時）

**觸發條件**：
- Cloud Function 錯誤率 > 5%
- 用戶無法提交訂單
- 重大 bug 影響業務

**回滾步驟**：
```bash
# 1. 還原舊代碼
cp public/service/js/DD.js.backup_20250111 public/service/js/DD.js

# 2. 推送上線
git add public/service/js/DD.js
git commit -m "revert: 緊急回滾 DD 服務"
git push

# 3. 驗證
# 確認服務恢復正常
```

**回滾驗證**：
- [ ] DD 服務恢復正常
- [ ] Cloud Function 成功率恢復
- [ ] 用戶可以正常提交訂單

---

### 階段回滾

**如果階段 2（DD）失敗**：
- 只回滾 DD 服務
- 其他服務保持不變
- 重新評估架構設計

**如果階段 3（批次遷移）失敗**：
- 回滾失敗的服務
- 保留已成功遷移的服務
- 分析失敗原因

---

## 📈 風險管理

### 高風險項目

| 風險 | 影響 | 機率 | 緩解措施 |
|------|------|------|----------|
| DD 測試不通過 | 🔴 高 | 🟡 中 | 延長測試時間，逐項排查 |
| Cloud Function 不兼容 | 🔴 高 | 🟡 中 | 提前驗證資料格式 |
| 用戶投訴服務異常 | 🔴 高 | 🟢 低 | 充分測試，快速回滾 |

### 中風險項目

| 風險 | 影響 | 機率 | 緩解措施 |
|------|------|------|----------|
| 生肖計算錯誤 | 🟡 中 | 🟡 中 | 單元測試覆蓋所有生肖 |
| 格式化邏輯不一致 | 🟡 中 | 🟡 中 | 對照舊版本逐一驗證 |
| 效能下降 | 🟡 中 | 🟢 低 | 效能測試，按需優化 |

---

## 📝 後續維護

### 新增服務流程（< 30 分鐘）

1. **建立配置檔案**（10 分鐘）
```javascript
// public/service/configs/new-service.config.js
export const newServiceConfig = {
    serviceType: 'new-service',
    pricing: { /* ... */ },
    fields: { /* ... */ },
    selectors: { /* ... */ },
    features: { /* ... */ }
};
```

2. **建立入口檔案**（5 分鐘）
```javascript
// public/service/js/NewService.js
import { ServiceFormEngine } from '/js/service-form-engine/ServiceFormEngine.js';
import { newServiceConfig } from '../configs/new-service.config.js';

export async function init() {
    const engine = new ServiceFormEngine(newServiceConfig);
    await engine.init();
    window.serviceFormEngine = engine;
}
```

3. **測試**（15 分鐘）
   - 執行回歸測試清單
   - 確認功能正常

**總時間**：30 分鐘（vs 舊架構的 4 小時）

---

### 修改業務邏輯流程（< 10 分鐘）

**例如：修改價格計算邏輯**

**修改前**（需要改 11 個檔案）：
```bash
# 舊架構：每個服務都要改
vim public/service/js/DD.js
vim public/service/js/LD.js
# ... 共 11 個檔案
```

**修改後**（只需改 1 個檔案）：
```bash
# 新架構：只改引擎
vim public/js/service-form-engine/ServiceFormEngine.js

# 修改 calculateTotal() 方法
calculateTotal() {
    const totalItems = this.modules.cards.getTotalItemCount();
    const baseAmount = totalItems * this.config.pricing.pricePerItem;
    
    // 新增：滿 10 個打 9 折
    return totalItems >= 10 ? baseAmount * 0.9 : baseAmount;
}
```

**總時間**：10 分鐘（vs 舊架構的 2 小時）

---

## 🎯 成功指標

### 代碼指標
- ✅ 代碼行數減少 48%
- ✅ 重複代碼減少 80%
- ✅ 單元測試覆蓋率 ≥ 80%

### 效率指標
- ✅ 新增服務時間：4 小時 → 30 分鐘（減少 88%）
- ✅ 修改業務邏輯：2 小時 → 10 分鐘（減少 92%）
- ✅ Bug 修復時間：11 次修改 → 1 次修改（減少 91%）

### 品質指標
- ✅ Cloud Function 成功率 ≥ 99%
- ✅ 用戶投訴數量 = 0
- ✅ Lighthouse 分數 ≥ 90

---

**版本**：v1.0  
**建立日期**：2025-11-11  
**作者**：Replit Agent  
**狀態**：規劃階段
