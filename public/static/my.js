// 마이페이지 스크립트
document.addEventListener('DOMContentLoaded', async () => {
  if (!AppState.token) {
    alert('로그인이 필요합니다')
    window.location.href = '/login.html'
    return
  }

  await loadMyPage()
  initializeMyPage()
})

function initializeMyPage() {
  // 탭 전환
  const tabButtons = document.querySelectorAll('.tab-btn')
  const ordersTab = document.getElementById('orders-tab')
  const pointsTab = document.getElementById('points-tab')

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => {
        b.classList.remove('border-blue-600', 'text-blue-600')
        b.classList.add('text-gray-600')
      })
      btn.classList.add('border-blue-600', 'text-blue-600')
      btn.classList.remove('text-gray-600')

      if (btn.id === 'tab-orders') {
        ordersTab?.classList.remove('hidden')
        pointsTab?.classList.add('hidden')
      } else if (btn.id === 'tab-points') {
        ordersTab?.classList.add('hidden')
        pointsTab?.classList.remove('hidden')
      }
    })
  })

  // 프로필 수정 모달
  const editProfileBtn = document.getElementById('edit-profile-btn')
  const editModal = document.getElementById('edit-modal')
  const cancelEditBtn = document.getElementById('cancel-edit-btn')
  const editProfileForm = document.getElementById('edit-profile-form')

  if (editProfileBtn && editModal) {
    editProfileBtn.addEventListener('click', () => {
      if (AppState.user) {
        document.getElementById('edit-name').value = AppState.user.name
        document.getElementById('edit-phone').value = AppState.user.phone || ''
        document.getElementById('edit-password').value = ''
      }
      editModal.classList.remove('hidden')
    })
  }

  if (cancelEditBtn && editModal) {
    cancelEditBtn.addEventListener('click', () => {
      editModal.classList.add('hidden')
    })
  }

  if (editProfileForm) {
    editProfileForm.addEventListener('submit', async (e) => {
      e.preventDefault()
      
      const name = document.getElementById('edit-name').value
      const phone = document.getElementById('edit-phone').value
      const password = document.getElementById('edit-password').value

      const success = await AppState.updateProfile(name, phone, password || undefined)
      
      if (success) {
        editModal?.classList.add('hidden')
        await loadMyPage()
      }
    })
  }

  // 로그아웃 버튼
  const logoutBtn = document.getElementById('logout-btn')
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (confirm('로그아웃 하시겠습니까?')) {
        AppState.logout()
      }
    })
  }
}

async function loadMyPage() {
  // 사용자 정보 표시
  if (AppState.user) {
    document.getElementById('user-name').textContent = AppState.user.name
    document.getElementById('user-email').textContent = AppState.user.email
    document.getElementById('user-phone').textContent = AppState.user.phone || '-'
    document.getElementById('user-points-display').textContent = `${AppState.user.points.toLocaleString()}P`
    
    // 헤더 포인트도 업데이트
    const userPointsHeader = document.getElementById('user-points')
    if (userPointsHeader) {
      userPointsHeader.textContent = `${AppState.user.points.toLocaleString()}P`
    }
  }

  // 주문 내역 로드
  const ordersContainer = document.getElementById('orders-container')
  if (ordersContainer) {
    const orders = await AppState.loadOrders()
    
    if (orders.length === 0) {
      ordersContainer.innerHTML = `
        <div class="text-center py-12">
          <i class="fas fa-receipt text-gray-300 text-6xl mb-4"></i>
          <p class="text-gray-500 text-lg">주문 내역이 없습니다</p>
          <a href="/shop.html" class="inline-block mt-4 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition">
            쇼핑하러 가기
          </a>
        </div>
      `
    } else {
      ordersContainer.innerHTML = orders.map(order => {
        const statusColors = {
          'pending': 'bg-yellow-500',
          'completed': 'bg-green-500',
          'cancelled': 'bg-red-500'
        }
        const statusText = {
          'pending': '처리중',
          'completed': '완료',
          'cancelled': '취소'
        }

        return `
          <div class="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition mb-4">
            <div class="flex items-start justify-between mb-3">
              <div class="flex-1">
                <div class="flex items-center space-x-2 mb-2">
                  <span class="text-white text-xs px-3 py-1 rounded-full ${statusColors[order.status] || 'bg-gray-500'}">
                    ${statusText[order.status] || order.status}
                  </span>
                  <span class="text-gray-500 text-sm">${new Date(order.created_at).toLocaleDateString('ko-KR')}</span>
                </div>
                <h3 class="font-bold text-lg text-gray-800 mb-1">
                  ${order.product_name || '매장 이용'}
                </h3>
                <p class="text-sm text-gray-600">주문번호: #${order.id}</p>
              </div>
              ${order.product_image ? `
                <img src="${order.product_image}" alt="${order.product_name}" 
                     class="w-20 h-20 rounded-lg object-cover ml-4"/>
              ` : ''}
            </div>
            <div class="border-t pt-3 flex items-center justify-between">
              <div>
                <p class="text-gray-600 text-sm">결제 금액</p>
                <p class="font-bold text-lg text-gray-800">${(order.total_price - order.points_used).toLocaleString()}원</p>
                ${order.points_used > 0 ? `
                  <p class="text-red-500 text-sm">포인트 사용: -${order.points_used.toLocaleString()}P</p>
                ` : ''}
              </div>
              <div class="text-right">
                <p class="text-yellow-600 font-semibold">
                  +${order.points_earned.toLocaleString()}P 적립
                </p>
              </div>
            </div>
          </div>
        `
      }).join('')
    }
  }

  // 포인트 내역 로드
  const pointsContainer = document.getElementById('points-container')
  if (pointsContainer) {
    const history = await AppState.loadPointsHistory()
    
    if (history.length === 0) {
      pointsContainer.innerHTML = `
        <div class="text-center py-12">
          <i class="fas fa-coins text-gray-300 text-6xl mb-4"></i>
          <p class="text-gray-500 text-lg">포인트 내역이 없습니다</p>
        </div>
      `
    } else {
      pointsContainer.innerHTML = history.map(item => {
        const isPositive = item.amount > 0
        const typeText = {
          'signup': '회원가입 보너스',
          'purchase': '구매 적립',
          'use': '포인트 사용',
          'referral': '친구 초대 보너스',
          'event': '이벤트 보너스'
        }

        return `
          <div class="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition mb-4">
            <div class="flex items-center justify-between">
              <div class="flex-1">
                <h3 class="font-semibold text-gray-800 mb-1">
                  ${typeText[item.type] || item.type}
                </h3>
                <p class="text-sm text-gray-600">${item.description || ''}</p>
                <p class="text-xs text-gray-500 mt-1">
                  ${new Date(item.created_at).toLocaleString('ko-KR')}
                </p>
              </div>
              <div class="text-right">
                <p class="font-bold text-lg ${isPositive ? 'text-green-600' : 'text-red-600'}">
                  ${isPositive ? '+' : ''}${item.amount.toLocaleString()}P
                </p>
              </div>
            </div>
          </div>
        `
      }).join('')
    }
  }
}
