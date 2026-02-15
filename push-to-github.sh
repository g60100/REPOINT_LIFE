#!/bin/bash
# GitHub 푸시 스크립트
# 사용법: bash push-to-github.sh

set -e

echo "=================================================="
echo "🚀 GitHub 푸시 시작"
echo "=================================================="
echo ""

# 원격 저장소 확인
if ! git remote get-url origin &> /dev/null; then
    echo "❌ GitHub 저장소가 설정되지 않았습니다."
    echo ""
    echo "다음 명령어를 먼저 실행하세요:"
    echo "  git remote add origin https://YOUR_TOKEN@github.com/g60100/REPOINT_LIFE.git"
    echo ""
    echo "Personal Access Token 생성:"
    echo "  https://github.com/settings/tokens → Generate new token → repo 권한"
    echo ""
    exit 1
fi

# 원격 URL 확인
REMOTE_URL=$(git remote get-url origin)
echo "📍 원격 저장소: $REMOTE_URL"
echo ""

# 변경사항 확인 및 커밋
echo "📝 변경사항 확인 중..."
if git diff --quiet && git diff --cached --quiet; then
    echo "✅ 변경사항 없음. 이미 최신 상태입니다."
else
    echo "📦 변경사항 발견. 커밋 생성 중..."
    git add -A
    COMMIT_MSG="update: $(date '+%Y-%m-%d %H:%M:%S')"
    git commit -m "$COMMIT_MSG"
    echo "✅ 커밋 완료: $COMMIT_MSG"
fi
echo ""

# 푸시
echo "📤 GitHub 푸시 중..."
if git push -u origin main; then
    echo ""
    echo "=================================================="
    echo "✅ GitHub 푸시 완료!"
    echo "=================================================="
    echo ""
    echo "🌐 GitHub 저장소:"
    echo "   https://github.com/g60100/REPOINT_LIFE"
    echo ""
    echo "🔄 다음 단계:"
    echo "   1. Cloudflare Pages 설정"
    echo "   2. GitHub 저장소 연결"
    echo "   3. 자동 배포 확인"
    echo ""
    echo "📚 가이드:"
    echo "   GITHUB_CLOUDFLARE_DEPLOY.md 참고"
    echo ""
else
    echo ""
    echo "=================================================="
    echo "❌ GitHub 푸시 실패"
    echo "=================================================="
    echo ""
    echo "🔧 문제 해결:"
    echo ""
    echo "1. Personal Access Token 확인"
    echo "   https://github.com/settings/tokens"
    echo ""
    echo "2. 원격 URL 업데이트"
    echo "   git remote set-url origin https://YOUR_TOKEN@github.com/g60100/REPOINT_LIFE.git"
    echo ""
    echo "3. Force push (최초 푸시인 경우)"
    echo "   git push -u origin main --force"
    echo ""
    echo "📚 상세 가이드: GITHUB_PUSH_GUIDE.md"
    echo ""
    exit 1
fi
