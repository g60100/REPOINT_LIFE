// 장바구니 페이지 스크립트
document.addEventListener('DOMContentLoaded', async () => {
  if (!AppState.token) {
    alert('로그인이 필요합니다')
    window.location.href = '/login.html'
    return
  }

  await loadCartItems()
})

async function loadCartItems() {
  const cartItemsContainer = document.getElementById('cart-items')
  const cartSummary = document.getElementById('cart-summary')
  
  if (!cartItemsContainer) return

  const items = await AppState.loadCart()
  
  if (items.length === 0) {
    cartItemsContainer.innerHTML = `
      <div class="text-center py-12">
        <i class="fas fa-shopping-cart text-gray-300 text-6xl mb-4"></i>
        <p class="text-gray-500 text-lg">장바구니가 비어있습니다</p>
        <a href="/shop.html" class="inline-block mt-4 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition">
          쇼핑하러 가기
        </a>
      </div>
    `
    if (cartSummary) {
      cartSummary.innerHTML = ''
    }
    return
  }

  let totalPrice = 0
  let totalPoints = 0

  cartItemsContainer.innerHTML = items.map(item => {
    const itemTotal = item.price * item.quantity
    const itemPoints = Math.floor(item.price * item.points_rate / 100) * item.quantity
    totalPrice += itemTotal
    totalPoints += itemPoints

    return `
      <div class="bg-white rounded-lg p-4 shadow-sm">
        <div class="flex items-start">
          <img src="${item.image_url}" alt="${item.name}" 
               class="w-24 h-24 rounded-lg object-cover mr-4"/>
          <div class="flex-1">
            <h3 class="font-bold text-lg text-gray-800 mb-1">${item.name}</h3>
            <p class="text-sm text-gray-600 mb-2">${item.description || ''}</p>
            <div class="flex items-center space-x-4 mb-2">
              <span class="text-blue-600 font-bold">${item.price.toLocaleString()}원</span>
              <span class="text-yellow-600 text-sm">+${Math.floor(item.price * item.points_rate / 100).toLocaleString()}P</span>
            </div>
            <div class="flex items-center space-x-3">
              <div class="flex items-center border border-gray-300 rounded">
                <button onclick="updateQuantity(${item.id}, ${item.quantity - 1})" 
                        class="px-3 py-1 hover:bg-gray-100">-</button>
                <span class="px-4 py-1">${item.quantity}</span>
                <button onclick="updateQuantity(${item.id}, ${item.quantity + 1})" 
                        class="px-3 py-1 hover:bg-gray-100">+</button>
              </div>
              <button onclick="removeFromCart(${item.id})" 
                      class="text-red-500 hover:text-red-700 text-sm">
                <i class="fas fa-trash mr-1"></i>삭제
              </button>
            </div>
          </div>
          <div class="text-right">
            <p class="font-bold text-lg text-gray-800">${itemTotal.toLocaleString()}원</p>
            <p class="text-yellow-600 text-sm">+${itemPoints.toLocaleString()}P</p>
          </div>
        </div>
      </div>
    `
  }).join('')

  if (cartSummary) {
    cartSummary.innerHTML = `
      <div class="bg-white rounded-lg p-6 shadow-md sticky top-20">
        <h3 class="font-bold text-xl text-gray-800 mb-4">주문 요약</h3>
        <div class="space-y-3 mb-4">
          <div class="flex justify-between">
            <span class="text-gray-600">상품 금액</span>
            <span class="font-semibold">${totalPrice.toLocaleString()}원</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">배송비</span>
            <span class="font-semibold text-green-600">무료</span>
          </div>
          <div class="flex justify-between text-yellow-600">
            <span>적립 예정 포인트</span>
            <span class="font-semibold">+${totalPoints.toLocaleString()}P</span>
          </div>
        </div>
        <div class="border-t pt-4 mb-4">
          <div class="flex justify-between text-lg font-bold">
            <span>총 결제 금액</span>
            <span class="text-blue-600">${totalPrice.toLocaleString()}원</span>
          </div>
        </div>
        <button onclick="checkoutAll()" 
                class="w-full bg-blue-600 text-white py-4 rounded-lg hover:bg-blue-700 transition font-bold text-lg">
          전체 상품 주문하기
        </button>
      </div>
    `
  }
}

async function updateQuantity(cartId, newQuantity) {
  if (newQuantity < 1) {
    removeFromCart(cartId)
    return
  }
  
  const success = await AppState.updateCartQuantity(cartId, newQuantity)
  if (success) {
    await loadCartItems()
  }
}

async function removeFromCart(cartId) {
  if (!confirm('장바구니에서 삭제하시겠습니까?')) return
  
  const success = await AppState.removeFromCart(cartId)
  if (success) {
    await loadCartItems()
  }
}

async function checkoutAll() {
  if (AppState.cart.length === 0) return

  const totalPrice = AppState.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  
  const usePoints = confirm(`전체 상품을 주문하시겠습니까?\n\n총 금액: ${totalPrice.toLocaleString()}원\n\n포인트를 사용하시겠습니까?`)
  
  let pointsUsed = 0
  if (usePoints && AppState.user && AppState.user.points > 0) {
    const maxPoints = Math.min(AppState.user.points, Math.floor(totalPrice * 0.5))
    const input = prompt(`사용할 포인트를 입력하세요 (최대 ${maxPoints.toLocaleString()}P)`)
    if (input) {
      pointsUsed = Math.min(parseInt(input) || 0, maxPoints)
    }
  }

  // 첫 번째 상품으로 주문 생성 (간소화)
  const firstItem = AppState.cart[0]
  const success = await AppState.createOrder(firstItem.id, null, 'online', pointsUsed)
  
  if (success) {
    setTimeout(() => {
      window.location.href = '/my.html'
    }, 1500)
  }
}
