#!/bin/bash
# 빠른 GitHub 푸시 스크립트
# Cloudflare Pages가 자동으로 배포합니다

git add -A
git commit -m "update: $(date '+%Y-%m-%d %H:%M:%S')"
git push origin main

echo ""
echo "✅ GitHub 푸시 완료!"
echo "🚀 Cloudflare Pages가 자동 배포 중입니다..."
echo ""
echo "📊 배포 상태 확인:"
echo "   https://dash.cloudflare.com/ → Pages → repoint-life"
echo ""
