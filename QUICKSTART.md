# 🚀 REPOINT 빠른 시작 가이드 (5분)

## 📦 다운로드
**https://www.genspark.ai/api/files/s/MJ3tWi2P**

---

## ⚡ 초간단 배포 (3단계)

### 1️⃣ 프로젝트 설정 (2분)

```bash
# 1. 압축 해제
tar -xzf REPOINT_LIFE_자동배포_최종_2026-02-15.tar.gz
cd REPOINT_LIFE

# 2. GitHub 저장소 연결
git remote add origin https://github.com/g60100/REPOINT_LIFE.git

# 3. Node 모듈 설치
npm install
```

---

### 2️⃣ Cloudflare 로그인 (1분)

```bash
# Cloudflare 로그인 (브라우저 자동 열림)
npx wrangler login

# 로그인 확인
npx wrangler whoami
```

---

### 3️⃣ 자동 배포 실행 (2분)

```bash
# 단 하나의 명령어로 모든 배포 완료!
bash deploy-all.sh
```

**자동 실행 내용:**
- ✅ Git 커밋
- ✅ GitHub 푸시
- ✅ D1 데이터베이스 마이그레이션
- ✅ 테스트 데이터 로드
- ✅ 프로젝트 빌드
- ✅ Cloudflare Pages 배포

**배포 완료 후:**
```
==================================================
✅ 배포 완료!
==================================================

🌐 프로덕션 URL:
   https://repoint-life.pages.dev

📊 테스트 계정:
   이메일: test@repoint.life
   비밀번호: password
```

---

## 🎯 배포 후 확인

### 웹사이트 테스트
1. https://repoint-life.pages.dev 접속
2. 로그인 (test@repoint.life / password)
3. 온라인 쇼핑 → 자사 제품 4종 확인
4. 장바구니 → 주문 테스트

### API 테스트
```bash
# 전체 상품 (12개)
curl https://repoint-life.pages.dev/api/products

# 자사 제품만 (4개)
curl https://repoint-life.pages.dev/api/products?product_type=internal

# 상품 상세
curl https://repoint-life.pages.dev/api/products/7
```

---

## 🐛 문제 발생 시

### GitHub 푸시 실패
```bash
# Personal Access Token 생성
# GitHub → Settings → Developer settings → Personal access tokens → Generate new token
# repo 권한 선택 후 생성

# Token으로 인증
git remote set-url origin https://YOUR_TOKEN@github.com/g60100/REPOINT_LIFE.git
git push -u origin main
```

### Cloudflare 로그인 실패
```bash
# 수동 로그인
npx wrangler login --browser=false
# 출력된 URL을 브라우저에서 열기
```

---

## 📝 npm 스크립트 (간편 명령어)

```bash
# 완전 자동 배포
npm run deploy:full

# 빌드만
npm run build

# 배포만 (빌드 포함)
npm run deploy:prod

# DB 마이그레이션 (프로덕션)
npm run db:migrate:prod

# 테스트 데이터 로드 (프로덕션)
npm run db:seed:prod

# Git 푸시
npm run git:push
```

---

## 📚 상세 문서

- **DEPLOY_GUIDE.md** - 상세한 배포 가이드
- **README.md** - 전체 프로젝트 문서
- **deploy-all.sh** - 자동 배포 스크립트

---

## 🎉 완료!

배포가 완료되면:
1. ✅ GitHub 업로드 완료
2. ✅ Cloudflare Pages 배포 완료
3. ✅ API 정상 작동
4. 🔜 프론트엔드 UI 업데이트 (2순위)
5. 🔜 토스페이먼츠 결제 연동 (3순위)

---

**마지막 업데이트**: 2026-02-15
**버전**: 1.2.0 (자동 배포 스크립트 완성)
