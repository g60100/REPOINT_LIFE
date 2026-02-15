#!/bin/bash
# GitHub 푸시 + Cloudflare 자동 배포 설정 가이드
# 이 스크립트는 로컬 PC에서 실행하세요

set -e

echo "=================================================="
echo "🚀 GitHub → Cloudflare 자동 배포 설정"
echo "=================================================="
echo ""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 1. GitHub 저장소 확인
echo -e "${YELLOW}[1/4] GitHub 저장소 확인...${NC}"
if git remote get-url origin &> /dev/null; then
    REPO_URL=$(git remote get-url origin)
    echo -e "${GREEN}✓ GitHub 저장소: $REPO_URL${NC}"
else
    echo -e "${RED}✗ GitHub 저장소가 설정되지 않았습니다.${NC}"
    echo ""
    echo "다음 명령어로 저장소를 설정하세요:"
    echo "  git remote add origin https://github.com/g60100/REPOINT_LIFE.git"
    echo ""
    read -p "지금 설정하시겠습니까? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git remote add origin https://github.com/g60100/REPOINT_LIFE.git
        echo -e "${GREEN}✓ 저장소 설정 완료${NC}"
    else
        exit 1
    fi
fi
echo ""

# 2. Git 커밋 및 푸시
echo -e "${YELLOW}[2/4] Git 커밋 및 GitHub 푸시...${NC}"
git add -A
if git diff --staged --quiet; then
    echo -e "${GREEN}✓ 변경사항 없음. 이미 최신 상태입니다.${NC}"
else
    COMMIT_MSG="deploy: GitHub 연동 배포 - $(date '+%Y-%m-%d %H:%M:%S')"
    git commit -m "$COMMIT_MSG"
    echo -e "${GREEN}✓ 커밋 완료: $COMMIT_MSG${NC}"
fi

echo ""
echo "GitHub에 푸시 중..."
if git push -u origin main; then
    echo -e "${GREEN}✓ GitHub 푸시 완료!${NC}"
else
    echo -e "${RED}✗ GitHub 푸시 실패${NC}"
    echo ""
    echo "GitHub 인증이 필요합니다. 다음 중 하나를 선택하세요:"
    echo ""
    echo "방법 1: Personal Access Token 사용 (권장)"
    echo "  1. https://github.com/settings/tokens 접속"
    echo "  2. Generate new token (classic) 클릭"
    echo "  3. repo 권한 선택"
    echo "  4. 토큰 생성 후 복사"
    echo "  5. 아래 명령어 실행:"
    echo "     git remote set-url origin https://YOUR_TOKEN@github.com/g60100/REPOINT_LIFE.git"
    echo "     git push -u origin main"
    echo ""
    echo "방법 2: GitHub CLI 사용"
    echo "  gh auth login"
    echo "  git push -u origin main"
    echo ""
    exit 1
fi
echo ""

# 3. Cloudflare Pages 설정 안내
echo -e "${YELLOW}[3/4] Cloudflare Pages 자동 배포 설정...${NC}"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📋 Cloudflare Pages 설정 가이드${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "1. Cloudflare Dashboard 접속:"
echo "   https://dash.cloudflare.com/"
echo ""
echo "2. Workers & Pages → Create application → Pages → Connect to Git"
echo ""
echo "3. GitHub 저장소 연결:"
echo "   Repository: g60100/REPOINT_LIFE"
echo "   Branch: main"
echo ""
echo "4. 빌드 설정:"
echo "   Build command:    bash build.sh"
echo "   Build output:     dist"
echo "   Root directory:   /"
echo ""
echo "5. 환경 변수 (Environment variables) - 없음"
echo ""
echo "6. 고급 설정 (Advanced):"
echo "   Branch deployments: main (Production branch)"
echo ""
echo "7. 'Save and Deploy' 클릭!"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

read -p "Cloudflare Pages 설정을 완료하셨나요? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo -e "${YELLOW}설정을 완료한 후 다시 실행하세요.${NC}"
    exit 0
fi
echo ""

# 4. D1 바인딩 설정 안내
echo -e "${YELLOW}[4/4] D1 데이터베이스 바인딩 설정...${NC}"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📊 D1 데이터베이스 바인딩${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Cloudflare Pages에서 D1 데이터베이스 연결:"
echo ""
echo "1. Cloudflare Dashboard → Pages → repoint-life → Settings"
echo ""
echo "2. Functions → D1 database bindings"
echo ""
echo "3. Add binding:"
echo "   Variable name: DB"
echo "   D1 database:   repoint-production"
echo ""
echo "4. Save 클릭"
echo ""
echo "5. 데이터베이스 마이그레이션 (로컬 PC에서 실행):"
echo "   npx wrangler d1 migrations apply repoint-production --remote"
echo "   npx wrangler d1 execute repoint-production --remote --file=./seed.sql"
echo "   npx wrangler d1 execute repoint-production --remote --file=./seed_extended.sql"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${GREEN}=================================================="
echo "✅ GitHub 푸시 완료!"
echo "==================================================${NC}"
echo ""
echo "🌐 다음 단계:"
echo "   1. Cloudflare Pages에서 자동 배포 진행 중..."
echo "   2. 배포 완료 후 URL 확인"
echo "   3. D1 바인딩 및 마이그레이션 실행"
echo ""
echo "📊 배포 상태 확인:"
echo "   https://dash.cloudflare.com/ → Pages → repoint-life"
echo ""
echo "🧪 배포 완료 후 테스트:"
echo "   curl https://repoint-life.pages.dev/api/products"
echo ""
