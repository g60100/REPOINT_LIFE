// 주변 매장 페이지 스크립트
document.addEventListener('DOMContentLoaded', async () => {
  const storesGrid = document.getElementById('stores-grid')
  
  if (storesGrid) {
    // 매장 목록 로드
    const stores = await AppState.loadStores()
    
    storesGrid.innerHTML = stores.map(store => {
      const tierColors = {
        'Diamond': 'bg-yellow-500',
        'Platinum': 'bg-purple-500',
        'Gold': 'bg-orange-500',
        'Silver': 'bg-gray-400',
        'Bronze': 'bg-amber-700'
      }
      
      return `
        <div class="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition">
          <div class="flex p-4">
            <img src="${store.image_url}" alt="${store.name}" 
                 class="w-24 h-24 rounded-lg object-cover mr-4"/>
            <div class="flex-1">
              <div class="flex items-center space-x-2 mb-2">
                <h3 class="font-bold text-lg text-gray-800">${store.name}</h3>
                <span class="text-white text-xs px-2 py-0.5 rounded ${tierColors[store.tier] || 'bg-gray-400'}">
                  ${store.tier}
                </span>
              </div>
              <div class="flex items-center text-yellow-500 text-sm mb-2">
                <i class="fas fa-star"></i>
                <span class="ml-1 font-semibold">${store.rating}</span>
                <span class="text-gray-500 ml-1">(${store.reviews_count.toLocaleString()} 리뷰)</span>
              </div>
              <p class="text-sm text-gray-600 mb-2">
                <i class="fas fa-map-marker-alt text-red-500 mr-1"></i>
                ${store.distance} · ${store.discount_rate}% 할인 + ${store.points_rate}% 포인트
              </p>
              <p class="text-xs text-gray-500">${store.address}</p>
            </div>
          </div>
          <div class="bg-gray-50 px-4 py-3 flex space-x-2">
            <button onclick="viewStore(${store.id})" 
                    class="flex-1 bg-white border border-gray-300 text-gray-800 py-2 rounded-lg hover:bg-gray-50 transition font-semibold text-sm">
              상세보기
            </button>
            <button onclick="useStoreService(${store.id})" 
                    class="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition font-semibold text-sm">
              이용하기
            </button>
          </div>
        </div>
      `
    }).join('')
  }
})

function viewStore(storeId) {
  const store = AppState.stores.find(s => s.id === storeId)
  if (store) {
    alert(`${store.name}\n\n${store.address}\n평점: ${store.rating}★ (${store.reviews_count.toLocaleString()} 리뷰)\n\n혜택:\n- ${store.discount_rate}% 할인\n- ${store.points_rate}% 포인트 적립`)
  }
}

async function useStoreService(storeId) {
  if (!AppState.token) {
    alert('로그인이 필요합니다')
    window.location.href = '/login.html'
    return
  }

  const store = AppState.stores.find(s => s.id === storeId)
  if (!store) return

  const amount = prompt(`${store.name}에서 사용한 금액을 입력하세요 (원):`)
  if (!amount || isNaN(amount)) return

  const totalAmount = parseInt(amount)
  const discount = Math.floor(totalAmount * store.discount_rate / 100)
  const finalAmount = totalAmount - discount
  
  const usePoints = confirm(
    `${store.name}\n\n` +
    `원가: ${totalAmount.toLocaleString()}원\n` +
    `할인: -${discount.toLocaleString()}원 (${store.discount_rate}%)\n` +
    `결제: ${finalAmount.toLocaleString()}원\n\n` +
    `포인트를 사용하시겠습니까?`
  )
  
  let pointsUsed = 0
  if (usePoints && AppState.user && AppState.user.points > 0) {
    const maxPoints = Math.min(AppState.user.points, Math.floor(finalAmount * 0.5))
    const input = prompt(`사용할 포인트를 입력하세요 (최대 ${maxPoints.toLocaleString()}P)`)
    if (input) {
      pointsUsed = Math.min(parseInt(input) || 0, maxPoints)
    }
  }

  // 매장 이용 주문 생성 (간소화)
  alert(`결제가 완료되었습니다!\n\n최종 금액: ${(finalAmount - pointsUsed).toLocaleString()}원\n적립 예정: ${Math.floor(finalAmount * store.points_rate / 100).toLocaleString()}P`)
}
