#!/bin/bash
# 部署 Platform Functions 到 platform-bc783

echo "🚀 開始部署 Platform Functions..."

# 切換到 Platform 專案
firebase use platform-bc783

# 部署 Platform Functions (僅部署 platform 相關的函數)
firebase deploy --only functions:generateCustomToken,functions:updateUserRole --project platform-bc783

echo "✅ Platform Functions 部署完成！"
