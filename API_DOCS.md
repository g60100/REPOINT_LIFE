# REPOINT API 문서

## 기본 정보
- Base URL: `/api`
- 인증: JWT Bearer Token
- Content-Type: `application/json`

---

## 1. 승인 시스템 (/api/approval)

### 본사: 지사 승인
```http
POST /api/approval/hq/approve-branch
Authorization: Bearer {token}

{
  "user_id": 123,
  "region_code": "seoul"
}
```

### 지사: 대리점 승인
```http
POST /api/approval/branch/approve-agency
Authorization: Bearer {token}

{
  "user_id": 456,
  "region_code": "seoul-gangnam"
}
```

### 대리점: 딜러 승인
```http
POST /api/approval/agency/approve-dealer
Authorization: Bearer {token}

{
  "user_id": 789,
  "region_code": "seoul-gangnam-yeoksam"
}
```

### 딜러: 가맹점 등록
```http
POST /api/approval/dealer/register-merchant
Authorization: Bearer {token}

{
  "business_name": "스타벅스 역삼점",
  "category": "카페",
  "address": "서울 강남구 역삼동 123",
  "latitude": 37.5012,
  "longitude": 127.0396,
  "phone": "02-1234-5678",
  "description": "역삼역 근처 스타벅스"
}
```

### 승인 대기 목록
```http
GET /api/approval/pending-approvals
Authorization: Bearer {token}
```

---

## 2. 통계 조회 (/api/stats)

### 본사 통계
```http
GET /api/stats/hq/stats
Authorization: Bearer {token}
```

**응답:**
```json
{
  "total_revenue": 150000000,
  "total_merchants": 5000,
  "by_region": [
    {
      "code": "seoul",
      "name": "서울",
      "merchant_count": 2500,
      "revenue": 80000000
    }
  ],
  "by_role": [
    { "role": "branch", "count": 10 },
    { "role": "agency", "count": 50 }
  ]
}
```

### 지사/대리점/딜러 통계
```http
GET /api/stats/branch/stats
GET /api/stats/agency/stats
GET /api/stats/dealer/stats
Authorization: Bearer {token}
```

### 수익 내역
```http
GET /api/stats/revenue-history
Authorization: Bearer {token}
```

---

## 3. 수익 배분 (/api/revenue)

### 배분율 설정 (본사만)
```http
PUT /api/revenue/commission-settings
Authorization: Bearer {token}

{
  "category": "카페",
  "region_code": "seoul",
  "hq_rate": 40,
  "branch_rate": 20,
  "agency_rate": 15,
  "dealer_rate": 10,
  "member_benefit_rate": 15
}
```

### 배분율 조회
```http
GET /api/revenue/commission-settings?category=카페&region_code=seoul
```

### 수익 정산
```http
POST /api/revenue/settle
Authorization: Bearer {token}

{
  "revenue_record_ids": [1, 2, 3, 4, 5]
}
```

---

## 4. 쿠폰/할인 (/api/coupons)

### 가맹점: 쿠폰 생성
```http
POST /api/coupons/merchant/create
Authorization: Bearer {token}

{
  "title": "신규 오픈 20% 할인",
  "description": "모든 메뉴 20% 할인",
  "discount_type": "percentage",
  "discount_value": 20,
  "min_purchase": 10000,
  "max_discount": 5000,
  "valid_until": "2026-12-31",
  "usage_limit": 100
}
```

### 가맹점: 쿠폰 목록
```http
GET /api/coupons/merchant/my-coupons
Authorization: Bearer {token}
```

### 가맹점: 쿠폰 수정
```http
PUT /api/coupons/merchant/update/:coupon_id
Authorization: Bearer {token}

{
  "title": "신규 오픈 30% 할인",
  "discount_value": 30
}
```

### 가맹점: 쿠폰 삭제
```http
DELETE /api/coupons/merchant/delete/:coupon_id
Authorization: Bearer {token}
```

### 가맹점: 할인율 설정
```http
PUT /api/coupons/merchant/discount-rate
Authorization: Bearer {token}

{
  "discount_rate": 10
}
```

### 회원: 가맹점 쿠폰 조회
```http
GET /api/coupons/merchant/:merchant_id/coupons
```

### 회원: 쿠폰 사용
```http
POST /api/coupons/use/:coupon_id
Authorization: Bearer {token}

{
  "purchase_amount": 15000
}
```

**응답:**
```json
{
  "success": true,
  "message": "쿠폰 사용 완료",
  "discount_amount": 3000,
  "final_amount": 12000
}
```

### 회원: 쿠폰 사용 내역
```http
GET /api/coupons/my-usage
Authorization: Bearer {token}
```

---

## 5. 가맹점 관리 (/api/merchants)

### 체크인
```http
POST /api/merchants/:merchant_id/checkin
Authorization: Bearer {token}

{
  "latitude": 37.5012,
  "longitude": 127.0396
}
```

**응답:**
```json
{
  "success": true,
  "message": "체크인 완료! 100P 적립",
  "points_earned": 100
}
```

### 평가 작성
```http
POST /api/merchants/:merchant_id/review
Authorization: Bearer {token}

{
  "kindness_score": 5,
  "price_score": 4,
  "taste_score": 5,
  "cleanliness_score": 4,
  "atmosphere_score": 5,
  "comment": "정말 좋았어요!"
}
```

### 평가 목록
```http
GET /api/merchants/:merchant_id/reviews
```

### AI 추천
```http
GET /api/merchants/ai-recommend?lat=37.5012&lng=127.0396&category=카페
```

### 가맹점 상세
```http
GET /api/merchants/:merchant_id
```

### 가맹점 목록
```http
GET /api/merchants?category=카페&region_code=seoul&status=active
```

---

## 6. 지역 관리 (/api/regions)

### 지역 목록
```http
GET /api/regions?level=1&parent_code=seoul
```

### 지역 생성 (본사만)
```http
POST /api/regions
Authorization: Bearer {token}

{
  "code": "seoul-gangnam-samseong",
  "name": "삼성동",
  "level": 3,
  "parent_code": "seoul-gangnam"
}
```

### 지역 담당자
```http
GET /api/regions/:code/manager
```

---

## 권한 레벨

| 역할 | 레벨 | 권한 |
|------|------|------|
| admin | 6 | 모든 권한 |
| hq | 5 | 본사 권한 |
| branch | 4 | 지사 권한 |
| agency | 3 | 대리점 권한 |
| dealer | 2 | 딜러 권한 |
| merchant | 1 | 가맹점 권한 |
| user | 0 | 회원 권한 |

---

## 에러 코드

| 코드 | 의미 |
|------|------|
| 400 | 잘못된 요청 |
| 401 | 인증 필요 |
| 403 | 권한 없음 |
| 404 | 리소스 없음 |
| 500 | 서버 오류 |
