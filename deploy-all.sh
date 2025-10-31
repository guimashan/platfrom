#!/bin/bash
# 一鍵部署所有 Firebase Functions

echo "========================================="
echo "🚀 開始部署龜馬山 goLine 平台 Functions"
echo "========================================="

# 部署 Platform Functions
echo ""
echo "📦 步驟 1/2: 部署 Platform Functions"
bash deploy-platform.sh

# 部署 Check-in Functions
echo ""
echo "📦 步驟 2/2: 部署 Check-in Functions"
bash deploy-checkin.sh

echo ""
echo "========================================="
echo "✅ 所有 Functions 部署完成！"
echo "========================================="
echo ""
echo "請前往以下網址測試："
echo "Frontend: https://guimashan.vercel.app"
echo "Platform API: https://asia-east2-platform-bc783.cloudfunctions.net/"
echo "Check-in API: https://asia-east2-checkin-29f7f.cloudfunctions.net/"
