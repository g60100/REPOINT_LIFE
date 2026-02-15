#!/bin/bash
# REPOINT GitHub 업로드 및 Cloudflare 배포 자동화 스크립트
# 사용법: ./deploy-all.sh

set -e  # 오류 발생 시 중단

echo "=================================================="
echo "🚀 REPOINT 자동 배포 스크립트"
echo "=================================================="
echo ""

# 색상 코드
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. GitHub 저장소 확인
echo -e "${YELLOW}[1/6] GitHub 저장소 확인...${NC}"
if git remote get-url origin &> /dev/null; then
    REPO_URL=$(git remote get-url origin)
    echo -e "${GREEN}✓ GitHub 저장소 이미 설정됨: $REPO_URL${NC}"
else
    echo -e "${RED}✗ GitHub 저장소가 설정되지 않았습니다.${NC}"
    echo "다음 명령어로 저장소를 설정하세요:"
    echo "  git remote add origin https://github.com/YOUR_USERNAME/REPOINT_LIFE.git"
    exit 1
fi
echo ""

# 2. Git 커밋 및 푸시
echo -e "${YELLOW}[2/6] Git 커밋 및 푸시...${NC}"
git add -A
if git diff --staged --quiet; then
    echo -e "${GREEN}✓ 변경사항 없음. 이미 최신 상태입니다.${NC}"
else
    git commit -m "deploy: 프로덕션 배포 준비 완료 - $(date '+%Y-%m-%d %H:%M:%S')"
    echo -e "${GREEN}✓ 변경사항 커밋 완료${NC}"
fi

echo "GitHub에 푸시 중..."
git push -u origin main
echo -e "${GREEN}✓ GitHub 푸시 완료!${NC}"
echo ""

# 3. Cloudflare 로그인 확인
echo -e "${YELLOW}[3/6] Cloudflare 로그인 확인...${NC}"
if npx wrangler whoami &> /dev/null; then
    ACCOUNT=$(npx wrangler whoami 2>/dev/null | grep "Account Name" || echo "Unknown")
    echo -e "${GREEN}✓ Cloudflare 로그인 완료${NC}"
    echo "  $ACCOUNT"
else
    echo -e "${YELLOW}⚠ Cloudflare 로그인이 필요합니다.${NC}"
    echo "브라우저가 열립니다. 로그인 후 계속됩니다..."
    npx wrangler login
fi
echo ""

# 4. D1 데이터베이스 마이그레이션
echo -e "${YELLOW}[4/6] D1 데이터베이스 마이그레이션...${NC}"
echo "프로덕션 데이터베이스에 마이그레이션 적용 중..."
if npx wrangler d1 migrations apply repoint-production --remote; then
    echo -e "${GREEN}✓ 마이그레이션 완료${NC}"
else
    echo -e "${YELLOW}⚠ 마이그레이션 실패 (이미 적용됨일 수 있음)${NC}"
fi
echo ""

# 5. 테스트 데이터 로드
echo -e "${YELLOW}[5/6] 테스트 데이터 로드...${NC}"
echo "기본 데이터 로드 중..."
if npx wrangler d1 execute repoint-production --remote --file=./seed.sql; then
    echo -e "${GREEN}✓ 기본 데이터 로드 완료${NC}"
else
    echo -e "${YELLOW}⚠ 기본 데이터 로드 실패 (이미 존재할 수 있음)${NC}"
fi

echo "확장 데이터 로드 중..."
if npx wrangler d1 execute repoint-production --remote --file=./seed_extended.sql; then
    echo -e "${GREEN}✓ 확장 데이터 로드 완료${NC}"
else
    echo -e "${YELLOW}⚠ 확장 데이터 로드 실패 (이미 존재할 수 있음)${NC}"
fi
echo ""

# 6. 프로젝트 빌드 및 배포
echo -e "${YELLOW}[6/6] 프로젝트 빌드 및 배포...${NC}"
echo "빌드 중..."
./build.sh

echo ""
echo "Cloudflare Pages에 배포 중..."
if npx wrangler pages deploy dist --project-name repoint-life; then
    echo ""
    echo -e "${GREEN}=================================================="
    echo "✅ 배포 완료!"
    echo "==================================================${NC}"
    echo ""
    echo "🌐 프로덕션 URL:"
    echo "   https://repoint-life.pages.dev"
    echo ""
    echo "📊 테스트 계정:"
    echo "   이메일: test@repoint.life"
    echo "   비밀번호: password"
    echo "   포인트: 4,500P"
    echo ""
    echo "🧪 API 테스트:"
    echo "   curl https://repoint-life.pages.dev/api/products"
    echo "   curl https://repoint-life.pages.dev/api/products?product_type=internal"
    echo ""
else
    echo -e "${RED}✗ 배포 실패${NC}"
    echo "다음 명령어로 수동 배포를 시도하세요:"
    echo "  npx wrangler pages deploy dist --project-name repoint-life"
    exit 1
fi

echo -e "${GREEN}=================================================="
echo "🎉 모든 작업 완료!"
echo "==================================================${NC}"
