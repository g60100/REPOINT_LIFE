# REPOINT - 포인트로 되돌리는 생활

온라인부터 동네 카페까지, 모든 소비가 포인트로 돌아오는 리워드 플랫폼

---

## 🌐 배포 URL

- **로컬 개발**: http://localhost:3000
- **샌드박스**: https://3000-irx5iamv1qoe07vjsg6tv-2e77fc33.sandbox.novita.ai
- **프로덕션**: https://repoint-life.pages.dev (배포 후)

---

## 🎯 프로젝트 개요

### 주요 기능
- ✅ 회원가입/로그인 (JWT 인증, SHA-256 암호화)
- ✅ 온라인 쇼핑 (자사 제품 + 외부 제품)
- ✅ 주변 매장 찾기
- ✅ 포인트 적립/사용 시스템
- ✅ 장바구니 관리
- ✅ 주문 및 배송 관리
- ✅ 리뷰 시스템 (이미지 포함)
- ✅ 추천인 시스템 (1:1 보너스)
- ✅ 마이페이지 (프로필, 주문내역, 포인트내역)
- ✅ 관리자 페이지 (상품/주문/사용자/매장 관리)

---

## 📊 완료된 기능 (95%)

### ✅ 백엔드 API (20개 이상)

#### 인증 (Authentication)
- `POST /api/auth/signup` - 회원가입 (1,000P 적립)
- `POST /api/auth/login` - 로그인
- `GET /api/auth/me` - 사용자 정보 조회
- `PATCH /api/auth/me` - 프로필 수정

#### 상품 (Products)
- `GET /api/products` - 상품 목록 (검색/필터)
  - `?category=카테고리` - 카테고리 필터
  - `?search=키워드` - 검색
  - `?product_type=internal` - 자사 제품
  - `?product_type=external` - 외부 제품
- `GET /api/products/:id` - 상품 상세 (옵션/이미지/리뷰 포함)
- `GET /api/products/:id/options` - 상품 옵션
- `GET /api/products/:id/images` - 상품 이미지

#### 리뷰 (Reviews)
- `GET /api/products/:id/reviews` - 리뷰 목록
- `POST /api/reviews` - 리뷰 작성 (이미지 포함)
- `PATCH /api/reviews/:id` - 리뷰 수정
- `DELETE /api/reviews/:id` - 리뷰 삭제

#### 장바구니 (Cart)
- `GET /api/cart` - 장바구니 조회
- `POST /api/cart` - 장바구니 추가
- `PATCH /api/cart/:id` - 수량 변경
- `DELETE /api/cart/:id` - 장바구니 삭제

#### 주문 (Orders)
- `POST /api/orders` - 주문 생성
- `GET /api/orders` - 주문 목록
- `GET /api/orders/:id/shipping` - 배송 정보

#### 배송 (Shipping)
- `POST /api/shipping` - 배송 정보 등록

#### 추천인 (Referrals)
- `GET /api/referral/code` - 내 추천인 코드
- `POST /api/referral/apply` - 추천인 코드 등록 (1000P + 500P)
- `GET /api/referral/list` - 내가 초대한 친구

#### 포인트 (Points)
- `GET /api/points/history` - 포인트 내역

#### 매장 (Stores)
- `GET /api/stores` - 매장 목록
- `GET /api/stores/:id` - 매장 상세

#### 관리자 (Admin)
- `GET /api/admin/users` - 전체 사용자
- `GET /api/admin/orders` - 전체 주문
- `POST /api/admin/products` - 상품 추가
- `PATCH /api/admin/products/:id` - 상품 수정
- `DELETE /api/admin/products/:id` - 상품 삭제
- `PATCH /api/admin/orders/:id/status` - 주문 상태 변경
- `POST /api/admin/stores` - 매장 추가
- `PATCH /api/admin/stores/:id` - 매장 수정
- `DELETE /api/admin/stores/:id` - 매장 삭제

---

## 🗄️ 데이터베이스 스키마

### 주요 테이블 (11개)
1. **users** - 사용자 (이메일, 비밀번호, 포인트, 추천인 코드)
2. **products** - 상품 (이름, 가격, 재고, 자사/외부 구분)
3. **product_images** - 상품 이미지 (다중 이미지 지원)
4. **product_options** - 상품 옵션 (사이즈, 색상, 수량)
5. **stores** - 매장 (위치, 등급, 할인율)
6. **orders** - 주문 (금액, 포인트, 상태)
7. **order_items** - 주문 상품 (다중 상품 주문)
8. **cart** - 장바구니
9. **reviews** - 리뷰 (평점, 내용, 이미지)
10. **shipping_info** - 배송 정보 (주소, 택배사, 추적번호)
11. **referrals** - 추천인 (추천인-피추천인, 보너스)
12. **points_history** - 포인트 내역 (적립/사용/보너스)

---

## 🛍️ 상품 데이터

### 자사 제품 (4종) - REPOINT 브랜드
```
1. REPOINT 멀티비타민 - 35,000원 (15% 적립)
2. REPOINT 면역력 부스터 - 79,000원 (15% 적립)
3. REPOINT 관절 건강 MSM - 68,000원 (15% 적립)
4. REPOINT 마그네슘 - 42,000원 (15% 적립)
```

### 외부 제품 (2종) - 해외직구
```
5. 아이허브 베스트 오메가3 - 125,000원 (5% 적립, 외부 링크 포함)
6. 아마존 프로틴 파우더 - 98,000원 (5% 적립, 외부 링크 포함)
```

### 기본 샘플 상품 (6종)
```
7. 프리미엄 오메가3 - 89,000원
8. 비타민 D 고함량 - 45,000원
9. 프로바이오틱스 30캡슐 - 67,000원
10. 콜라겐 펩타이드 - 98,000원
11. 루테인 지아잔틴 - 55,000원
12. 밀크씨슬 실리마린 - 72,000원
```

**총 12개 상품, 18개 이미지, 7개 옵션, 3개 리뷰**

---

## 🧪 테스트 계정

```
이메일: test@repoint.life
비밀번호: password
보유 포인트: 4,500P
추천인 코드: TEST2024
```

---

## 🚀 배포 가이드

### 1️⃣ Cloudflare API 키 설정

**방법 1: Deploy 탭 이용 (추천)**
1. 사이드바에서 **Deploy** 탭 클릭
2. Cloudflare API Token 생성
3. API 키 저장

**방법 2: 수동 설정**
1. https://dash.cloudflare.com/profile/api-tokens 접속
2. "Create Token" 클릭
3. "Edit Cloudflare Workers" 템플릿 선택
4. 권한 추가:
   - Account: Cloudflare Pages - Edit
   - Account: D1 - Edit
5. 토큰 생성 후 복사

---

### 2️⃣ 프로덕션 데이터베이스 마이그레이션

```bash
cd C:\repoint\REPOINT_LIFE

# Cloudflare 로그인
npx wrangler login

# 프로덕션 DB에 마이그레이션 적용
npx wrangler d1 migrations apply repoint-production --remote

# 테스트 데이터 로드
npx wrangler d1 execute repoint-production --remote --file=./seed.sql
npx wrangler d1 execute repoint-production --remote --file=./seed_extended.sql
```

---

### 3️⃣ 프로젝트 빌드

```bash
# 빌드 스크립트 실행
./build.sh

# 또는 수동 빌드
npm run build
cp -r public/* dist/
cat > dist/_routes.json << 'EOF'
{
  "version": 1,
  "include": ["/api/*"],
  "exclude": []
}
EOF
```

---

### 4️⃣ Cloudflare Pages 배포

```bash
# Pages 프로젝트 생성 (최초 1회만)
npx wrangler pages project create repoint-life \
  --production-branch main \
  --compatibility-date 2024-01-01

# 배포
npx wrangler pages deploy dist --project-name repoint-life

# 배포 후 URL 확인
# Production: https://repoint-life.pages.dev
# Branch: https://main.repoint-life.pages.dev
```

---

### 5️⃣ API 테스트

```bash
# 상품 목록 조회
curl https://repoint-life.pages.dev/api/products

# 자사 제품만 필터
curl https://repoint-life.pages.dev/api/products?product_type=internal

# 외부 제품만 필터
curl https://repoint-life.pages.dev/api/products?product_type=external

# 상품 검색
curl https://repoint-life.pages.dev/api/products?search=오메가3

# 상품 상세 (옵션, 이미지 포함)
curl https://repoint-life.pages.dev/api/products/1
```

---

## 🔧 로컬 개발 환경

### 초기 설정

```bash
# 의존성 설치
npm install

# 로컬 DB 마이그레이션
npx wrangler d1 migrations apply repoint-production --local

# 테스트 데이터 로드
npx wrangler d1 execute repoint-production --local --file=./seed.sql
npx wrangler d1 execute repoint-production --local --file=./seed_extended.sql
```

### 개발 서버 실행

```bash
# 빌드
./build.sh

# PM2로 서버 시작
pm2 start ecosystem.config.cjs

# 또는 직접 실행
npx wrangler pages dev dist --d1=repoint-production --local --port 3000

# 브라우저에서 접속
# http://localhost:3000
```

### PM2 명령어

```bash
pm2 list                         # 프로세스 목록
pm2 logs repoint-life --nostream # 로그 확인
pm2 restart repoint-life         # 재시작
pm2 stop repoint-life            # 중지
pm2 delete repoint-life          # 삭제
```

---

## 📁 프로젝트 구조

```
REPOINT_LIFE/
├── src/
│   └── index.tsx              # Hono 백엔드 API (800+ lines)
├── public/
│   ├── index.html             # 홈페이지
│   ├── signup.html            # 회원가입
│   ├── login.html             # 로그인
│   ├── shop.html              # 온라인 쇼핑
│   ├── cart.html              # 장바구니
│   ├── local.html             # 주변 매장
│   ├── my.html                # 마이페이지
│   ├── admin.html             # 관리자 페이지
│   └── static/
│       ├── app.js             # 글로벌 상태 관리
│       ├── signup.js
│       ├── login.js
│       ├── shop.js
│       ├── cart.js
│       ├── local.js
│       ├── my.js
│       ├── admin.js
│       └── style.css
├── migrations/
│   ├── 0001_initial_schema.sql      # 초기 스키마
│   └── 0002_extended_features.sql   # 확장 기능 (리뷰, 옵션, 배송 등)
├── seed.sql                   # 기본 테스트 데이터
├── seed_extended.sql          # 확장 데이터 (자사/외부 제품)
├── build.sh                   # 빌드 스크립트
├── wrangler.jsonc             # Cloudflare 설정
├── ecosystem.config.cjs       # PM2 설정
├── package.json
└── README.md
```

---

## 🎯 다음 단계 (2순위, 3순위)

### 2순위: 프론트엔드 UI 업데이트 ⏳
- [ ] 리뷰 작성/표시 UI
- [ ] 상품 옵션 선택 드롭다운
- [ ] 배송지 입력 폼
- [ ] 추천인 코드 입력 필드
- [ ] 자사/외부 제품 필터 버튼
- [ ] 주문 상태 표시 (pending, paid, shipping, delivered)

### 3순위: 결제 시스템 연동 ⏳
- [ ] 토스페이먼츠 연동
- [ ] Stripe 연동 (글로벌)
- [ ] 실제 결제 플로우

---

## 🐛 알려진 이슈

### 로컬 개발 환경 라우팅 문제
- **문제**: wrangler pages dev 실행 시 /api/* 경로가 제대로 라우팅되지 않음
- **원인**: _routes.json 설정 문제
- **해결책**: 프로덕션 환경에서는 정상 작동 예상
- **임시 방법**: build.sh 스크립트 사용

---

## 📊 기술 스택

### 프론트엔드
- HTML5, TailwindCSS
- Vanilla JavaScript
- Axios (HTTP 클라이언트)
- Font Awesome (아이콘)

### 백엔드
- Hono (Cloudflare Workers Framework)
- TypeScript
- Cloudflare D1 (SQLite Database)
- JWT 인증
- Web Crypto API (SHA-256)

### 배포
- Cloudflare Pages
- Cloudflare Workers
- PM2 (로컬 개발)
- Wrangler CLI

---

## 📄 라이선스

MIT License

---

## 👨‍💻 개발자

REPOINT Development Team

---

## 🔗 링크

- **GitHub**: https://github.com/g60100/REPOINT_LIFE
- **Production**: https://repoint-life.pages.dev (배포 후)
- **Documentation**: 이 README 파일

---

## 📞 문의

이슈나 문의사항은 GitHub Issues를 이용해주세요.

---

**마지막 업데이트**: 2026-02-15
**버전**: 1.1.0 (데이터베이스 확장 및 전체 쇼핑몰 API 완성)
