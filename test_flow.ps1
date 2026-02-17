# REPOINT 쇼핑몰 전체 플로우 자동 테스트 스크립트
# PowerShell 스크립트

$baseUrl = "http://localhost:3000"
$testResults = @()

Write-Host "=== REPOINT 쇼핑몰 전체 플로우 테스트 시작 ===" -ForegroundColor Cyan
Write-Host ""

# 1단계: 회원가입
Write-Host "1. 회원가입 테스트..." -ForegroundColor Yellow
try {
    $signupBody = @{
        email = "flowtest@repoint.life"
        password = "test1234"
        name = "플로우테스트"
        phone = "010-9999-8888"
    } | ConvertTo-Json

    $signupResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/signup" -Method Post -ContentType "application/json" -Body $signupBody
    $token = $signupResponse.token
    Write-Host "   ✅ 회원가입 성공!" -ForegroundColor Green
    Write-Host "   - 토큰: $($token.Substring(0, 20))..." -ForegroundColor Gray
    Write-Host "   - 사용자: $($signupResponse.user.name)" -ForegroundColor Gray
    Write-Host "   - 포인트: $($signupResponse.user.points)P" -ForegroundColor Gray
    $testResults += "✅ 회원가입"
} catch {
    Write-Host "   ❌ 회원가입 실패: $($_.Exception.Message)" -ForegroundColor Red
    $testResults += "❌ 회원가입"
}
Write-Host ""

# 2단계: 로그인
Write-Host "2. 로그인 테스트..." -ForegroundColor Yellow
try {
    $loginBody = @{
        email = "flowtest@repoint.life"
        password = "test1234"
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -ContentType "application/json" -Body $loginBody
    $token = $loginResponse.token
    Write-Host "   ✅ 로그인 성공!" -ForegroundColor Green
    Write-Host "   - 사용자: $($loginResponse.user.name)" -ForegroundColor Gray
    Write-Host "   - 포인트: $($loginResponse.user.points)P" -ForegroundColor Gray
    $testResults += "✅ 로그인"
} catch {
    Write-Host "   ❌ 로그인 실패: $($_.Exception.Message)" -ForegroundColor Red
    $testResults += "❌ 로그인"
}
Write-Host ""

# 3단계: 상품 목록 조회
Write-Host "3. 상품 목록 조회 테스트..." -ForegroundColor Yellow
try {
    $productsResponse = Invoke-RestMethod -Uri "$baseUrl/api/products" -Method Get
    Write-Host "   ✅ 상품 목록 조회 성공!" -ForegroundColor Green
    Write-Host "   - 상품 개수: $($productsResponse.products.Count)개" -ForegroundColor Gray
    if ($productsResponse.products.Count -gt 0) {
        $firstProduct = $productsResponse.products[0]
        Write-Host "   - 첫 번째 상품: $($firstProduct.name) ($($firstProduct.price)원)" -ForegroundColor Gray
        $productId = $firstProduct.id
    }
    $testResults += "✅ 상품 목록 조회"
} catch {
    Write-Host "   ❌ 상품 목록 조회 실패: $($_.Exception.Message)" -ForegroundColor Red
    $testResults += "❌ 상품 목록 조회"
}
Write-Host ""

# 4단계: 상품 상세 조회
Write-Host "4. 상품 상세 조회 테스트..." -ForegroundColor Yellow
try {
    if ($productId) {
        $productDetailResponse = Invoke-RestMethod -Uri "$baseUrl/api/products/$productId" -Method Get
        Write-Host "   ✅ 상품 상세 조회 성공!" -ForegroundColor Green
        Write-Host "   - 상품명: $($productDetailResponse.name)" -ForegroundColor Gray
        Write-Host "   - 가격: $($productDetailResponse.price)원" -ForegroundColor Gray
        Write-Host "   - 재고: $($productDetailResponse.stock)개" -ForegroundColor Gray
        $testResults += "✅ 상품 상세 조회"
    } else {
        Write-Host "   ⚠️  상품 ID가 없어 건너뜀" -ForegroundColor Yellow
        $testResults += "⚠️  상품 상세 조회"
    }
} catch {
    Write-Host "   ❌ 상품 상세 조회 실패: $($_.Exception.Message)" -ForegroundColor Red
    $testResults += "❌ 상품 상세 조회"
}
Write-Host ""

# 5단계: 장바구니 추가
Write-Host "5. 장바구니 추가 테스트..." -ForegroundColor Yellow
try {
    if ($productId -and $token) {
        $cartBody = @{
            product_id = $productId
            quantity = 2
        } | ConvertTo-Json

        $headers = @{
            "Authorization" = "Bearer $token"
            "Content-Type" = "application/json"
        }

        $cartResponse = Invoke-RestMethod -Uri "$baseUrl/api/cart" -Method Post -Headers $headers -Body $cartBody
        Write-Host "   ✅ 장바구니 추가 성공!" -ForegroundColor Green
        $testResults += "✅ 장바구니 추가"
    } else {
        Write-Host "   ⚠️  상품 ID 또는 토큰이 없어 건너뜀" -ForegroundColor Yellow
        $testResults += "⚠️  장바구니 추가"
    }
} catch {
    Write-Host "   ❌ 장바구니 추가 실패: $($_.Exception.Message)" -ForegroundColor Red
    $testResults += "❌ 장바구니 추가"
}
Write-Host ""

# 6단계: 장바구니 조회
Write-Host "6. 장바구니 조회 테스트..." -ForegroundColor Yellow
try {
    if ($token) {
        $headers = @{
            "Authorization" = "Bearer $token"
        }

        $cartListResponse = Invoke-RestMethod -Uri "$baseUrl/api/cart" -Method Get -Headers $headers
        Write-Host "   ✅ 장바구니 조회 성공!" -ForegroundColor Green
        Write-Host "   - 장바구니 상품 개수: $($cartListResponse.cart.Count)개" -ForegroundColor Gray
        $testResults += "✅ 장바구니 조회"
    } else {
        Write-Host "   ⚠️  토큰이 없어 건너뜀" -ForegroundColor Yellow
        $testResults += "⚠️  장바구니 조회"
    }
} catch {
    Write-Host "   ❌ 장바구니 조회 실패: $($_.Exception.Message)" -ForegroundColor Red
    $testResults += "❌ 장바구니 조회"
}
Write-Host ""

# 7단계: 주문 생성
Write-Host "7. 주문 생성 테스트..." -ForegroundColor Yellow
try {
    if ($productId -and $token) {
        $orderBody = @{
            product_id = $productId
            order_type = "online"
            points_used = 0
        } | ConvertTo-Json

        $headers = @{
            "Authorization" = "Bearer $token"
            "Content-Type" = "application/json"
        }

        $orderResponse = Invoke-RestMethod -Uri "$baseUrl/api/orders" -Method Post -Headers $headers -Body $orderBody
        $orderId = $orderResponse.order_id
        Write-Host "   ✅ 주문 생성 성공!" -ForegroundColor Green
        Write-Host "   - 주문 ID: $orderId" -ForegroundColor Gray
        Write-Host "   - 적립 포인트: $($orderResponse.points_earned)P" -ForegroundColor Gray
        $testResults += "✅ 주문 생성"
    } else {
        Write-Host "   ⚠️  상품 ID 또는 토큰이 없어 건너뜀" -ForegroundColor Yellow
        $testResults += "⚠️  주문 생성"
    }
} catch {
    Write-Host "   ❌ 주문 생성 실패: $($_.Exception.Message)" -ForegroundColor Red
    $testResults += "❌ 주문 생성"
}
Write-Host ""

# 8단계: 주문 내역 조회
Write-Host "8. 주문 내역 조회 테스트..." -ForegroundColor Yellow
try {
    if ($token) {
        $headers = @{
            "Authorization" = "Bearer $token"
        }

        $ordersResponse = Invoke-RestMethod -Uri "$baseUrl/api/orders" -Method Get -Headers $headers
        Write-Host "   ✅ 주문 내역 조회 성공!" -ForegroundColor Green
        Write-Host "   - 주문 개수: $($ordersResponse.orders.Count)개" -ForegroundColor Gray
        $testResults += "✅ 주문 내역 조회"
    } else {
        Write-Host "   ⚠️  토큰이 없어 건너뜀" -ForegroundColor Yellow
        $testResults += "⚠️  주문 내역 조회"
    }
} catch {
    Write-Host "   ❌ 주문 내역 조회 실패: $($_.Exception.Message)" -ForegroundColor Red
    $testResults += "❌ 주문 내역 조회"
}
Write-Host ""

# 9단계: 포인트 내역 조회
Write-Host "9. 포인트 내역 조회 테스트..." -ForegroundColor Yellow
try {
    if ($token) {
        $headers = @{
            "Authorization" = "Bearer $token"
        }

        $pointsResponse = Invoke-RestMethod -Uri "$baseUrl/api/points/history" -Method Get -Headers $headers
        Write-Host "   ✅ 포인트 내역 조회 성공!" -ForegroundColor Green
        Write-Host "   - 포인트 거래 내역: $($pointsResponse.history.Count)건" -ForegroundColor Gray
        $testResults += "✅ 포인트 내역 조회"
    } else {
        Write-Host "   ⚠️  토큰이 없어 건너뜀" -ForegroundColor Yellow
        $testResults += "⚠️  포인트 내역 조회"
    }
} catch {
    Write-Host "   ❌ 포인트 내역 조회 실패: $($_.Exception.Message)" -ForegroundColor Red
    $testResults += "❌ 포인트 내역 조회"
}
Write-Host ""

# 10단계: 리뷰 작성
Write-Host "10. 리뷰 작성 테스트..." -ForegroundColor Yellow
try {
    if ($productId -and $orderId -and $token) {
        $reviewBody = @{
            product_id = $productId
            order_id = $orderId
            rating = 5
            content = "테스트 리뷰입니다. 제품이 정말 좋습니다!"
        } | ConvertTo-Json

        $headers = @{
            "Authorization" = "Bearer $token"
            "Content-Type" = "application/json"
        }

        $reviewResponse = Invoke-RestMethod -Uri "$baseUrl/api/reviews" -Method Post -Headers $headers -Body $reviewBody
        Write-Host "   ✅ 리뷰 작성 성공!" -ForegroundColor Green
        Write-Host "   - 리뷰 ID: $($reviewResponse.review_id)" -ForegroundColor Gray
        $testResults += "✅ 리뷰 작성"
    } else {
        Write-Host "   ⚠️  필요한 정보가 없어 건너뜀" -ForegroundColor Yellow
        $testResults += "⚠️  리뷰 작성"
    }
} catch {
    Write-Host "   ❌ 리뷰 작성 실패: $($_.Exception.Message)" -ForegroundColor Red
    $testResults += "❌ 리뷰 작성"
}
Write-Host ""

# 결과 요약
Write-Host "=== 테스트 결과 요약 ===" -ForegroundColor Cyan
Write-Host ""
foreach ($result in $testResults) {
    Write-Host $result
}
Write-Host ""

$successCount = ($testResults | Where-Object { $_ -like "✅*" }).Count
$totalCount = $testResults.Count
$successRate = [math]::Round(($successCount / $totalCount) * 100, 2)

Write-Host "성공률: $successCount/$totalCount ($successRate%)" -ForegroundColor $(if ($successRate -ge 80) { "Green" } elseif ($successRate -ge 50) { "Yellow" } else { "Red" })
Write-Host ""
Write-Host "=== 테스트 완료 ===" -ForegroundColor Cyan
