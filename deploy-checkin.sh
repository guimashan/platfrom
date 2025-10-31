#!/bin/bash
# 部署 Check-in Functions 到 checkin-29f7f

echo "🚀 開始部署 Check-in Functions..."

# 切換到 Check-in 專案
firebase use checkin-29f7f

# 部署 Check-in Functions
firebase deploy --only functions:verifyCheckinDistance --project checkin-29f7f

echo "✅ Check-in Functions 部署完成！"
