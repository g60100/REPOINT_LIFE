// 온라인 쇼핑 페이지 스크립트
document.addEventListener('DOMContentLoaded', async () => {
  const productsGrid = document.getElementById('products-grid')
  
  if (productsGrid) {
    // 상품 목록 로드
    const products = await AppState.loadProducts()
    
    productsGrid.innerHTML = products.map(product => `
      <div class="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition group">
        <div class="relative overflow-hidden bg-gray-100" style="height: 200px;">
          <img src="${product.image_url}" alt="${product.name}" 
               class="w-full h-full object-cover group-hover:scale-105 transition duration-300"/>
        </div>
        <div class="p-4">
          <h3 class="font-bold text-lg text-gray-800 mb-2 line-clamp-2">${product.name}</h3>
          <p class="text-sm text-gray-600 mb-3 line-clamp-2">${product.description || ''}</p>
          <div class="flex items-center justify-between mb-3">
            <span class="text-blue-600 font-bold text-xl">${product.price.toLocaleString()}원</span>
            <span class="text-yellow-600 font-semibold text-sm">+${Math.floor(product.price * product.points_rate / 100).toLocaleString()}P</span>
          </div>
          <div class="flex space-x-2">
            <button onclick="viewProduct(${product.id})" 
                    class="flex-1 bg-gray-100 text-gray-800 py-2 rounded-lg hover:bg-gray-200 transition font-semibold">
              상세보기
            </button>
            <button onclick="addToCartAndBuy(${product.id})" 
                    class="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition font-semibold">
              구매하기
            </button>
          </div>
        </div>
      </div>
    `).join('')
  }
})

function viewProduct(productId) {
  // 상품 상세 페이지로 이동 (현재는 알림으로 대체)
  const product = AppState.products.find(p => p.id === productId)
  if (product) {
    alert(`${product.name}\n\n${product.description || ''}\n\n가격: ${product.price.toLocaleString()}원\n적립: ${Math.floor(product.price * product.points_rate / 100).toLocaleString()}P`)
  }
}

async function addToCartAndBuy(productId) {
  if (!AppState.token) {
    alert('로그인이 필요합니다')
    window.location.href = '/login.html'
    return
  }

  const product = AppState.products.find(p => p.id === productId)
  if (!product) return

  const usePoints = confirm(`${product.name}\n가격: ${product.price.toLocaleString()}원\n\n포인트를 사용하시겠습니까?`)
  
  let pointsUsed = 0
  if (usePoints && AppState.user && AppState.user.points > 0) {
    const maxPoints = Math.min(AppState.user.points, Math.floor(product.price * 0.5))
    const input = prompt(`사용할 포인트를 입력하세요 (최대 ${maxPoints.toLocaleString()}P)`)
    if (input) {
      pointsUsed = Math.min(parseInt(input) || 0, maxPoints)
    }
  }

  const success = await AppState.createOrder(productId, null, 'online', pointsUsed)
  if (success) {
    setTimeout(() => {
      window.location.href = '/my.html'
    }, 1500)
  }
}
