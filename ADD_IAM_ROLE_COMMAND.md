# 使用指令新增 IAM 角色

## 🚀 快速方法：使用 Google Cloud Shell

### 步驟 1：開啟 Cloud Shell

訪問：https://console.cloud.google.com/?cloudshell=true&project=platform-bc783

會在瀏覽器下方開啟一個終端機視窗。

### 步驟 2：執行指令

在 Cloud Shell 中貼上並執行：

```bash
gcloud projects add-iam-policy-binding platform-bc783 \
  --member=serviceAccount:971307854623-compute@developer.gserviceaccount.com \
  --role=roles/iam.serviceAccountTokenCreator
```

### 步驟 3：確認結果

執行後會看到類似這樣的輸出：

```
Updated IAM policy for project [platform-bc783].
bindings:
- members:
  - serviceAccount:971307854623-compute@developer.gserviceaccount.com
  role: roles/iam.serviceAccountTokenCreator
...
```

### 步驟 4：立即測試

權限已生效！訪問：https://guimashan.vercel.app

---

## ✅ 驗證權限已設定

### 查看 IAM 設定

訪問：https://console.cloud.google.com/iam-admin/iam?project=platform-bc783

在列表中找到：`971307854623-compute@developer.gserviceaccount.com`

應該會看到新增的角色：
- ✅ Editor（原有）
- ✅ **Service Account Token Creator**（新增）

---

**這個方法最快速且不會出錯！** 🚀
