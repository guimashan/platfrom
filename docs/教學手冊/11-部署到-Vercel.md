# 11 - 部署到 Vercel

> 把您的網站發布到網路上，讓所有人都可以使用！

## 🎯 本章目標

完成本章後，您將：
- 把程式碼推送到 GitHub
- 連接 Vercel 並自動部署
- 設定自訂網域
- 測試正式環境是否正常運作

## 📋 前置要求

- ✅ 已完成所有 LINE 設定（第 03-05 章）
- ✅ 已部署 Firebase Functions（第 07 章）
- ✅ 已測試過所有功能
- ✅ 有 GitHub 和 Vercel 帳號

## 📤 步驟一：推送程式碼到 GitHub

### 1-1. 檢查程式碼狀態

在終端機執行：
```bash
git status
```

您會看到所有修改過的檔案列表。

### 1-2. 添加所有檔案

```bash
git add .
```

這會把所有修改的檔案加入到準備提交的清單。

### 1-3. 提交變更

```bash
git commit -m "完成龜馬山 goLine 平台開發"
```

**提交訊息建議**：
- 簡短說明這次做了什麼
- 用中文或英文都可以
- 範例：
  - `"新增奉香簽到功能"`
  - `"修復權限控制問題"`
  - `"更新 LIFF 為金黃色主題"`

### 1-4. 推送到 GitHub

```bash
git push origin main
```

✅ **完成！**程式碼已經上傳到 GitHub 了！

### 1-5. 確認上傳成功

1. 打開瀏覽器
2. 前往您的 GitHub 倉庫：`https://github.com/您的帳號/platfrom`
3. 檢查檔案是否都在

## 🔗 步驟二：連接 Vercel

### 2-1. 登入 Vercel

1. 前往：https://vercel.com/
2. 用 GitHub 帳號登入

### 2-2. 建立新專案

1. 點擊「Add New...」→「Project」
2. 選擇「Import Git Repository」
3. 找到您的 GitHub 倉庫：`platfrom`
4. 點擊「Import」

### 2-3. 設定專案

| 設定項目 | 填什麼 | 說明 |
|---------|--------|------|
| Project Name | `platfrom`（或您想要的名稱） | 網址會是：platfrom.vercel.app |
| Framework Preset | Other | 選擇「Other」因為我們用純 HTML |
| Root Directory | `./` | 保持預設即可 |
| Build Command | （留空） | 靜態網站不需要 build |
| Output Directory | `public` | 我們的網站在 public 資料夾 |

### 2-4. 部署

點擊「Deploy」！

Vercel 會開始部署，大約需要 1-2 分鐘。

✅ **完成！**您的網站已經上線了！

## 🌐 步驟三：測試部署結果

### 3-1. 開啟網站

部署完成後，Vercel 會顯示網址：
```
https://platfrom.vercel.app
```

點擊網址或複製到瀏覽器開啟。

### 3-2. 測試功能清單

請逐一測試：

**基本功能**
- [ ] 網站可以正常開啟
- [ ] LINE Login 按鈕可以點擊
- [ ] 登入後顯示使用者名稱和頭像
- [ ] 可以看到模組選單（奉香簽到、神務服務等）

**奉香簽到模組**
- [ ] 可以進入簽到頁面
- [ ] GPS 定位正常運作
- [ ] 可以選擇巡邏點
- [ ] 簽到功能正常（會寫入資料庫）
- [ ] 可以查看簽到紀錄

**LIFF 功能**（手機測試）
- [ ] 可以在 LINE 開啟 LIFF 連結
- [ ] LIFF 頁面正常顯示
- [ ] 自動取得 LINE 使用者資料
- [ ] LIFF 簽到功能正常

**LINE 官方帳號**（手機測試）
- [ ] 可以加入官方帳號
- [ ] 收到問候訊息
- [ ] 輸入關鍵字有自動回覆
- [ ] 點擊 LIFF 連結可以開啟

### 3-3. 檢查控制台

按 F12 打開開發者工具，檢查：
- [ ] Console 沒有紅色錯誤訊息
- [ ] Network 分頁顯示 API 請求都成功（200 OK）

## 🏠 步驟四：設定自訂網域

### 4-1. 購買網域（如果還沒有）

**網域提供商建議**：
- Namecheap - https://www.namecheap.com/
- GoDaddy - https://godaddy.com/
- Google Domains - https://domains.google/

**龜馬山專案網域**：`guimashan.org.tw`

### 4-2. 在 Vercel 新增網域

1. 進入 Vercel 專案設定
2. 點擊「Domains」
3. 點擊「Add」
4. 輸入您的網域：`go.guimashan.org.tw`
5. 點擊「Add」

### 4-3. 設定 DNS

Vercel 會顯示需要設定的 DNS 記錄：

```
Type: CNAME
Name: go
Value: cname.vercel-dns.com
```

**在您的網域提供商設定**：
1. 登入網域提供商
2. 找到 DNS 設定
3. 新增 CNAME 記錄：
   - Name/Host: `go`
   - Value/Points to: `cname.vercel-dns.com`
4. 儲存

### 4-4. 等待 DNS 生效

DNS 設定需要時間生效（可能 5 分鐘到 48 小時）。

**檢查是否生效**：
```bash
nslookup go.guimashan.org.tw
```

如果看到 Vercel 的 IP，就是成功了！

### 4-5. 啟用 HTTPS

Vercel 會自動為您的網域申請 SSL 憑證。

等待約 5-10 分鐘，您的網站就會有 HTTPS 了：
```
https://go.guimashan.org.tw ✅
```

## 🔄 步驟五：更新 LINE 設定

### 5-1. 更新 LINE Login Callback URL

1. 前往 LINE Developers Console
2. 進入 LINE Login Channel
3. 編輯 Callback URLs
4. 新增：`https://go.guimashan.org.tw/callback.html`

### 5-2. 更新 LIFF Endpoint URL

1. 進入 LINE Login Channel
2. 切換到 LIFF 分頁
3. 編輯每個 LIFF App
4. 更新 Endpoint URL：
   - 奉香簽到：`https://go.guimashan.org.tw/liff/checkin.html`
   - 神務服務：`https://go.guimashan.org.tw/liff/service.html`
   - 排班系統：`https://go.guimashan.org.tw/liff/schedule.html`

## 🎉 步驟六：最終測試

### 6-1. 電腦測試

1. 開啟：`https://go.guimashan.org.tw`
2. 測試 LINE Login
3. 測試所有功能

### 6-2. 手機測試

1. 在 LINE 開啟 LIFF 連結
2. 測試簽到功能
3. 測試關鍵字回覆

### 6-3. 不同角色測試

使用不同角色的帳號測試權限：
- [ ] user - 只能看到自己的簽到記錄
- [ ] admin_checkin - 可以看到所有記錄
- [ ] superadmin - 可以管理所有模組

## ⚙️ 步驟七：設定自動部署

**好消息**：Vercel 已經自動設定好了！

以後只要：
1. 修改程式碼
2. 推送到 GitHub
3. Vercel 會自動部署新版本！

### 7-1. 查看部署歷史

1. 進入 Vercel 專案
2. 點擊「Deployments」
3. 可以看到每次部署的紀錄

### 7-2. 回滾到之前的版本

如果新版本有問題：
1. 找到之前正常運作的部署
2. 點擊「...」→「Promote to Production」
3. 立即回滾到之前的版本！

## ⚠️ 常見問題

### 問題 1：網站打不開（404）

**原因**：Output Directory 設定錯誤

**解決**：
1. 進入 Vercel 專案設定
2. 點擊「Settings」→「General」
3. Output Directory 改成：`public`
4. 重新部署

### 問題 2：自訂網域無法使用

**原因**：DNS 還沒生效

**解決**：
- 耐心等待（最多 48 小時）
- 檢查 DNS 設定是否正確
- 使用 `nslookup` 或 `dig` 檢查

### 問題 3：LINE Login 失敗

**原因**：Callback URL 沒更新

**解決**：
- 確認 LINE Developers 有加入新的網域
- 檢查網址是否完全正確（包含 https://）

### 問題 4：LIFF 打不開

**原因**：Endpoint URL 沒更新

**解決**：
- 更新所有 LIFF App 的 Endpoint URL
- 確認網址可以直接在瀏覽器開啟

## ✅ 部署完成檢查清單

請確認：
- [ ] 程式碼已推送到 GitHub
- [ ] Vercel 部署成功
- [ ] 網站可以正常開啟
- [ ] 所有功能都正常運作
- [ ] 自訂網域已設定並生效
- [ ] HTTPS 已啟用
- [ ] LINE Login 和 LIFF 都正常
- [ ] 不同角色的權限都正確

## 🎓 下一步

恭喜！您的網站已經正式上線了！🎉

➡️ **下一章：12-日常維護和更新.md**

在下一章，我們會教您如何：
- 更新網站
- 監控系統狀態
- 備份重要資料
- 處理常見問題

---

💡 **小提示**：
- Vercel Pro 方案：$20/月，無部署次數限制
- 每次推送到 GitHub 都會自動部署
- 建議在推送前先在本機測試好
- 重要更新前記得備份資料！
