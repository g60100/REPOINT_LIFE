# 🚀 REPOINT 자동 배포 가이드

## 📋 준비사항 (5분)

### 1️⃣ GitHub 설정 (필수)

**이미 g60100/REPOINT_LIFE 저장소가 있으므로:**

```bash
cd C:\repoint\REPOINT_LIFE

# 원격 저장소 연결 (저장소 주소 확인 후)
git remote add origin https://github.com/g60100/REPOINT_LIFE.git

# 또는 기존 origin 제거 후 재설정
git remote remove origin
git remote add origin https://github.com/g60100/REPOINT_LIFE.git
```

**GitHub 인증 설정:**

```bash
# 방법 1: Git Credential Manager (권장)
# Windows에서 Git 설치 시 자동으로 설정됨
# 첫 push 시 브라우저에서 GitHub 로그인 요청

# 방법 2: Personal Access Token
# 1. GitHub → Settings → Developer settings → Personal access tokens
# 2. Generate new token (classic)
# 3. repo 권한 체크
# 4. 토큰 복사 후 git push 시 비밀번호 대신 사용
```

---

### 2️⃣ Cloudflare 설정 (필수)

**이미 D1 데이터베이스가 생성되어 있습니다:**
- Database ID: `4a26ee4e-4454-4871-9e08-5a838252a415`
- Database Name: `repoint-production`

**Cloudflare 로그인만 하면 됩니다:**

```bash
cd C:\repoint\REPOINT_LIFE

# Cloudflare 로그인 (브라우저 자동 열림)
npx wrangler login

# 로그인 확인
npx wrangler whoami
```

---

## 🎯 자동 배포 실행 (1분)

모든 준비가 완료되면 **단 하나의 명령어**로 배포 완료!

```bash
cd C:\repoint\REPOINT_LIFE

# Windows (Git Bash)
bash deploy-all.sh

# 또는 PowerShell
wsl bash deploy-all.sh
```

**자동 실행 내용:**
1. ✅ Git 변경사항 커밋
2. ✅ GitHub에 푸시
3. ✅ Cloudflare 로그인 확인
4. ✅ D1 데이터베이스 마이그레이션
5. ✅ 테스트 데이터 로드
6. ✅ 프로젝트 빌드
7. ✅ Cloudflare Pages 배포

---

## 📊 배포 완료 후

**배포 성공 메시지:**
```
==================================================
✅ 배포 완료!
==================================================

🌐 프로덕션 URL:
   https://repoint-life.pages.dev

📊 테스트 계정:
   이메일: test@repoint.life
   비밀번호: password
   포인트: 4,500P

🧪 API 테스트:
   curl https://repoint-life.pages.dev/api/products
```

---

## 🧪 배포 후 테스트

### 웹사이트 접속
1. https://repoint-life.pages.dev 접속
2. 로그인 (test@repoint.life / password)
3. 온라인 쇼핑 → 자사 제품 확인
4. 장바구니 → 주문 → 마이페이지

### API 테스트

```bash
# 1. 전체 상품 조회 (12개)
curl https://repoint-life.pages.dev/api/products | jq '.products | length'

# 2. 자사 제품만 (4개)
curl https://repoint-life.pages.dev/api/products?product_type=internal

# 3. 외부 제품만 (2개)
curl https://repoint-life.pages.dev/api/products?product_type=external

# 4. 상품 상세 (옵션, 이미지 포함)
curl https://repoint-life.pages.dev/api/products/7 | jq

# 5. 매장 목록
curl https://repoint-life.pages.dev/api/stores

# 6. 회원가입 테스트
curl -X POST https://repoint-life.pages.dev/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@test.com",
    "password": "test1234",
    "name": "신규사용자",
    "phone": "010-9999-8888"
  }'
```

---

## 🐛 문제 해결

### 문제 1: GitHub 푸시 실패 (권한 오류)

**증상:**
```
remote: Permission denied
```

**해결:**
```bash
# Personal Access Token 생성
# 1. GitHub → Settings → Developer settings → Personal access tokens
# 2. Generate new token (classic)
# 3. repo 권한 선택
# 4. 토큰 복사

# Git 설정
git remote set-url origin https://YOUR_TOKEN@github.com/g60100/REPOINT_LIFE.git

# 다시 시도
git push -u origin main
```

---

### 문제 2: Cloudflare 로그인 실패

**증상:**
```
Error: Not logged in
```

**해결:**
```bash
# 브라우저 열지 않고 수동 로그인
npx wrangler login --browser=false

# URL이 출력되면 브라우저에서 수동으로 열기
# 인증 후 다시 시도
```

---

### 문제 3: D1 마이그레이션 오류

**증상:**
```
Error: Migration already applied
```

**해결:**
```bash
# 이미 적용된 마이그레이션 - 정상입니다!
# 계속 진행하세요.

# 마이그레이션 상태 확인
npx wrangler d1 migrations list repoint-production
```

---

### 문제 4: 배포 실패 (프로젝트 이름 중복)

**증상:**
```
Error: Project already exists
```

**해결:**
```bash
# 다른 이름으로 배포
npx wrangler pages deploy dist --project-name repoint-life-2

# 또는 기존 프로젝트 삭제 후 재배포
# Cloudflare Dashboard → Pages → repoint-life → Settings → Delete
```

---

## 📝 수동 배포 (스크립트 사용 안 할 경우)

### GitHub 업로드
```bash
cd C:\repoint\REPOINT_LIFE

# 변경사항 커밋
git add -A
git commit -m "deploy: 프로덕션 배포"

# GitHub 푸시
git push -u origin main
```

### Cloudflare 배포
```bash
# 1. 로그인
npx wrangler login

# 2. 마이그레이션
npx wrangler d1 migrations apply repoint-production --remote

# 3. 데이터 로드
npx wrangler d1 execute repoint-production --remote --file=./seed.sql
npx wrangler d1 execute repoint-production --remote --file=./seed_extended.sql

# 4. 빌드
bash build.sh

# 5. 배포
npx wrangler pages deploy dist --project-name repoint-life
```

---

## 🔄 재배포 (코드 수정 후)

코드를 수정한 후 재배포:

```bash
cd C:\repoint\REPOINT_LIFE

# 자동 배포 스크립트 실행
bash deploy-all.sh

# 또는 빠른 배포 (DB 마이그레이션 스킵)
bash build.sh
npx wrangler pages deploy dist --project-name repoint-life
```

---

## 📊 배포 상태 확인

```bash
# Cloudflare Pages 배포 목록
npx wrangler pages list

# D1 데이터베이스 목록
npx wrangler d1 list

# 최근 배포 로그
npx wrangler pages deployments list --project-name repoint-life
```

---

## 🎯 다음 단계

배포 성공 후:

1. ✅ API 테스트 완료
2. ✅ 웹사이트 정상 작동 확인
3. 🔜 프론트엔드 UI 업데이트
4. 🔜 토스페이먼츠 결제 연동

---

## 📞 도움말

문제가 발생하면:
1. 이 가이드의 "문제 해결" 섹션 확인
2. README.md 파일 참고
3. Cloudflare 로그 확인: `npx wrangler pages deployments tail --project-name repoint-life`

---

**마지막 업데이트**: 2026-02-15
