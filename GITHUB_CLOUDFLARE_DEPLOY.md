# 🚀 GitHub → Cloudflare Pages 자동 배포 가이드

## ⚡ 압축 파일 없이 바로 배포! (10분)

GitHub에 푸시만 하면 Cloudflare Pages가 자동으로 빌드하고 배포합니다.

---

## 📋 준비사항

1. **GitHub 계정** (이미 있음: g60100)
2. **Cloudflare 계정** (이미 있음)
3. **Node.js 18+** 설치
4. **Git** 설치

---

## 🎯 배포 프로세스

```
로컬 PC → GitHub 푸시 → Cloudflare Pages 자동 빌드/배포 → 완료!
```

---

## ✅ Step 1: GitHub에 푸시 (5분)

### A. 프로젝트 다운로드 및 설정

```bash
# 1. 다운로드 (샌드박스에서)
# URL: https://www.genspark.ai/api/files/s/wsmSaYlc

# 2. 압축 해제
cd C:\repoint
tar -xzf REPOINT_완전자동배포_최종완성_2026-02-15.tar.gz
cd REPOINT_LIFE

# 3. Node 모듈 설치
npm install
```

### B. GitHub 저장소 연결

```bash
# GitHub 저장소 연결
git remote add origin https://github.com/g60100/REPOINT_LIFE.git

# 원격 저장소 확인
git remote -v
```

### C. GitHub 인증 설정

**방법 1: Personal Access Token (권장)**

```bash
# 1. GitHub 토큰 생성
# https://github.com/settings/tokens → Generate new token (classic)
# repo 권한 선택 → 토큰 복사

# 2. Git URL에 토큰 추가
git remote set-url origin https://YOUR_TOKEN@github.com/g60100/REPOINT_LIFE.git

# 3. 푸시
git push -u origin main
```

**방법 2: GitHub CLI**

```bash
# GitHub CLI 설치 후
gh auth login

# 푸시
git push -u origin main
```

### D. 자동 푸시 스크립트 실행

```bash
# 간단하게 스크립트 실행
bash setup-github-cloudflare.sh
```

**푸시 성공 메시지:**
```
✓ GitHub 푸시 완료!
   https://github.com/g60100/REPOINT_LIFE
```

---

## ✅ Step 2: Cloudflare Pages 설정 (3분)

### A. Cloudflare Pages 프로젝트 생성

**1. Cloudflare Dashboard 접속**
```
https://dash.cloudflare.com/
```

**2. Pages 메뉴로 이동**
```
Workers & Pages → Create application → Pages → Connect to Git
```

**3. GitHub 계정 연결**
```
- Connect GitHub 클릭
- GitHub 인증 완료
- g60100/REPOINT_LIFE 저장소 선택
```

**4. 빌드 설정**
```
Project name:        repoint-life
Production branch:   main
Build command:       bash build.sh
Build output:        dist
Root directory:      / (루트)
```

**5. 환경 변수**
```
(없음 - D1 바인딩으로 설정)
```

**6. Deploy 클릭!**

---

## ✅ Step 3: D1 데이터베이스 바인딩 (2분)

### A. D1 바인딩 설정

**1. Cloudflare Pages 설정**
```
Cloudflare Dashboard → Pages → repoint-life → Settings
```

**2. D1 바인딩 추가**
```
Functions → D1 database bindings → Add binding

Variable name:  DB
D1 database:    repoint-production (선택)

Save 클릭
```

### B. 데이터베이스 마이그레이션 (로컬 PC에서)

```bash
cd C:\repoint\REPOINT_LIFE

# Cloudflare 로그인
npx wrangler login

# 프로덕션 DB 마이그레이션
npx wrangler d1 migrations apply repoint-production --remote

# 테스트 데이터 로드
npx wrangler d1 execute repoint-production --remote --file=./seed.sql
npx wrangler d1 execute repoint-production --remote --file=./seed_extended.sql
```

---

## ✅ Step 4: 재배포 트리거

D1 바인딩 후 재배포:

```bash
# 방법 1: 더미 커밋으로 재배포 트리거
cd C:\repoint\REPOINT_LIFE
git commit --allow-empty -m "trigger: Cloudflare 재배포"
git push origin main

# Cloudflare가 자동으로 다시 빌드/배포합니다!
```

**또는**

Cloudflare Dashboard에서 수동 재배포:
```
Pages → repoint-life → Deployments → Retry deployment
```

---

## 🎉 배포 완료!

**배포 URL:**
```
Production:  https://repoint-life.pages.dev
Branch:      https://main.repoint-life.pages.dev
```

**배포 상태 확인:**
```
Cloudflare Dashboard → Pages → repoint-life → Deployments
```

---

## 🧪 배포 후 테스트

### 1. 웹사이트 접속
```
https://repoint-life.pages.dev
로그인: test@repoint.life / password
```

### 2. API 테스트
```bash
# 전체 상품
curl https://repoint-life.pages.dev/api/products

# 자사 제품만
curl https://repoint-life.pages.dev/api/products?product_type=internal

# 상품 상세
curl https://repoint-life.pages.dev/api/products/7
```

---

## 🔄 코드 수정 후 재배포

코드를 수정한 후:

```bash
cd C:\repoint\REPOINT_LIFE

# 변경사항 커밋
git add -A
git commit -m "update: 기능 수정"

# GitHub 푸시
git push origin main

# Cloudflare가 자동으로 새 버전 배포!
```

**배포 진행 상황:**
```
Cloudflare Dashboard → Pages → repoint-life → Deployments
- Building...
- Deploying...
- Success! ✅
```

---

## 📊 자동 배포 장점

### ✅ GitHub 푸시만으로 배포
- 압축 파일 다운로드 불필요
- 로컬에서 wrangler 명령 불필요
- Git commit → push → 자동 배포

### ✅ 배포 히스토리 관리
- 모든 배포 버전 저장
- 이전 버전 롤백 가능
- 배포 로그 확인

### ✅ 브랜치별 배포
- main → Production
- develop → Preview
- feature/* → Preview

---

## 🐛 문제 해결

### 문제 1: 빌드 실패 (build.sh not found)

**원인:** build.sh 파일 권한 문제

**해결:**
```bash
# Cloudflare 빌드 설정 변경
Build command: chmod +x build.sh && bash build.sh
```

### 문제 2: API 404 에러

**원인:** D1 바인딩 누락

**해결:**
```
1. Cloudflare Dashboard → Pages → repoint-life → Settings
2. Functions → D1 database bindings
3. Variable name: DB, Database: repoint-production
4. Save → Retry deployment
```

### 문제 3: GitHub 푸시 실패 (Permission denied)

**해결:**
```bash
# Personal Access Token 사용
git remote set-url origin https://YOUR_TOKEN@github.com/g60100/REPOINT_LIFE.git
git push origin main
```

---

## 📝 Cloudflare Pages 빌드 설정 요약

```yaml
Project name:        repoint-life
Production branch:   main
Build command:       bash build.sh
Build output:        dist
Root directory:      /

D1 Bindings:
  - Variable name: DB
  - Database:      repoint-production

Environment variables: (없음)
```

---

## 🎯 다음 단계

### 완료 ✅
1. GitHub 저장소 생성
2. Cloudflare Pages 연결
3. 자동 배포 설정
4. D1 데이터베이스 바인딩

### 진행 중 🔄
- 코드 수정 → Git push → 자동 배포

### 다음 작업 📝
1. 프론트엔드 UI 업데이트
2. 토스페이먼츠 결제 연동

---

## 💡 Tip: 빠른 배포

```bash
# 간단한 배포 스크립트 만들기
echo '#!/bin/bash
git add -A
git commit -m "update: $(date +%Y%m%d-%H%M%S)"
git push origin main
echo "✅ Cloudflare Pages가 자동 배포 중입니다!"
' > quick-deploy.sh

chmod +x quick-deploy.sh

# 사용
./quick-deploy.sh
```

---

**GitHub 푸시 후 Cloudflare Dashboard에서 배포 진행 상황을 확인하세요!**

배포가 완료되면 URL을 알려주시면, 2순위 프론트엔드 UI 업데이트를 시작하겠습니다! 🚀
