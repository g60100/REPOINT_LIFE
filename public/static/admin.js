// 관리자 페이지 스크립트
document.addEventListener('DOMContentLoaded', async () => {
  // 관리자 인증 확인 (간단한 구현 - 실제로는 role 기반 인증 필요)
  if (!AppState.token) {
    alert('로그인이 필요합니다')
    window.location.href = '/login.html'
    return
  }

  await loadDashboard()
  initializeAdmin()
})

function initializeAdmin() {
  // 탭 전환
  const tabButtons = document.querySelectorAll('.tab-btn')
  const tabs = {
    'tab-products': document.getElementById('products-tab'),
    'tab-orders': document.getElementById('orders-tab'),
    'tab-users': document.getElementById('users-tab'),
    'tab-stores': document.getElementById('stores-tab')
  }

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      // 모든 탭 비활성화
      tabButtons.forEach(b => {
        b.classList.remove('border-purple-600', 'text-purple-600')
        b.classList.add('text-gray-600')
      })
      Object.values(tabs).forEach(tab => tab?.classList.add('hidden'))

      // 선택된 탭 활성화
      btn.classList.add('border-purple-600', 'text-purple-600')
      btn.classList.remove('text-gray-600')
      tabs[btn.id]?.classList.remove('hidden')

      // 탭별 데이터 로드
      if (btn.id === 'tab-products') loadProducts()
      else if (btn.id === 'tab-orders') loadOrders()
      else if (btn.id === 'tab-users') loadUsers()
      else if (btn.id === 'tab-stores') loadStores()
    })
  })

  // 상품 추가 버튼
  const addProductBtn = document.getElementById('add-product-btn')
  const productModal = document.getElementById('product-modal')
  const cancelProductBtn = document.getElementById('cancel-product-btn')
  const productForm = document.getElementById('product-form')

  if (addProductBtn) {
    addProductBtn.addEventListener('click', () => {
      document.getElementById('product-modal-title').textContent = '상품 추가'
      productForm.reset()
      document.getElementById('product-id').value = ''
      productModal.classList.remove('hidden')
    })
  }

  if (cancelProductBtn) {
    cancelProductBtn.addEventListener('click', () => {
      productModal.classList.add('hidden')
    })
  }

  if (productForm) {
    productForm.addEventListener('submit', async (e) => {
      e.preventDefault()
      await saveProduct()
      productModal.classList.add('hidden')
      await loadProducts()
    })
  }

  // 로그아웃
  const logoutBtn = document.getElementById('logout-btn')
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (confirm('로그아웃 하시겠습니까?')) {
        AppState.logout()
      }
    })
  }
}

async function loadDashboard() {
  try {
    // 통계 로드
    const [products, orders, users, stores] = await Promise.all([
      AppState.loadProducts(),
      AppState.loadOrders(),
      loadAllUsers(),
      AppState.loadStores()
    ])

    document.getElementById('total-products').textContent = products.length
    document.getElementById('total-orders').textContent = orders.length
    document.getElementById('total-users').textContent = users.length
    document.getElementById('total-stores').textContent = stores.length

    // 초기 탭 로드
    await loadProducts()
  } catch (error) {
    console.error('대시보드 로드 실패:', error)
  }
}

async function loadProducts() {
  const container = document.getElementById('products-container')
  if (!container) return

  try {
    const products = await AppState.loadProducts()

    if (products.length === 0) {
      container.innerHTML = `
        <div class="text-center py-12">
          <i class="fas fa-box text-gray-300 text-6xl mb-4"></i>
          <p class="text-gray-500 text-lg">등록된 상품이 없습니다</p>
        </div>
      `
      return
    }

    container.innerHTML = products.map(product => `
      <div class="bg-white rounded-lg p-4 border hover:shadow-md transition">
        <div class="flex items-start">
          <img src="${product.image_url}" alt="${product.name}" 
               class="w-24 h-24 rounded-lg object-cover mr-4"/>
          <div class="flex-1">
            <div class="flex items-start justify-between">
              <div>
                <h3 class="font-bold text-lg text-gray-800 mb-1">${product.name}</h3>
                <p class="text-sm text-gray-600 mb-2">${product.description || ''}</p>
                <div class="flex items-center space-x-4">
                  <span class="text-blue-600 font-bold">${product.price.toLocaleString()}원</span>
                  <span class="text-yellow-600 text-sm">적립률 ${product.points_rate}%</span>
                  <span class="text-gray-600 text-sm">재고 ${product.stock || 0}개</span>
                </div>
              </div>
              <div class="flex space-x-2">
                <button onclick="editProduct(${product.id})" class="text-blue-600 hover:text-blue-800">
                  <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteProduct(${product.id})" class="text-red-600 hover:text-red-800">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `).join('')
  } catch (error) {
    console.error('상품 목록 로드 실패:', error)
    container.innerHTML = '<p class="text-red-600">상품 목록을 불러오지 못했습니다</p>'
  }
}

async function saveProduct() {
  const id = document.getElementById('product-id').value
  const data = {
    name: document.getElementById('product-name').value,
    description: document.getElementById('product-description').value,
    price: parseInt(document.getElementById('product-price').value),
    points_rate: parseFloat(document.getElementById('product-points-rate').value),
    stock: parseInt(document.getElementById('product-stock').value),
    category: document.getElementById('product-category').value,
    image_url: document.getElementById('product-image').value || 'https://via.placeholder.com/300x300'
  }

  try {
    if (id) {
      // 수정
      await axios.patch(`/api/admin/products/${id}`, data, {
        headers: { 'Authorization': `Bearer ${AppState.token}` }
      })
      alert('상품이 수정되었습니다')
    } else {
      // 추가
      await axios.post('/api/admin/products', data, {
        headers: { 'Authorization': `Bearer ${AppState.token}` }
      })
      alert('상품이 추가되었습니다')
    }
  } catch (error) {
    console.error('상품 저장 실패:', error)
    alert('상품 저장에 실패했습니다')
  }
}

async function editProduct(id) {
  try {
    const response = await axios.get(`/api/products/${id}`)
    const product = response.data.product

    document.getElementById('product-modal-title').textContent = '상품 수정'
    document.getElementById('product-id').value = product.id
    document.getElementById('product-name').value = product.name
    document.getElementById('product-description').value = product.description || ''
    document.getElementById('product-price').value = product.price
    document.getElementById('product-points-rate').value = product.points_rate
    document.getElementById('product-stock').value = product.stock || 0
    document.getElementById('product-category').value = product.category || ''
    document.getElementById('product-image').value = product.image_url

    document.getElementById('product-modal').classList.remove('hidden')
  } catch (error) {
    console.error('상품 정보 로드 실패:', error)
    alert('상품 정보를 불러오지 못했습니다')
  }
}

async function deleteProduct(id) {
  if (!confirm('정말 이 상품을 삭제하시겠습니까?')) return

  try {
    await axios.delete(`/api/admin/products/${id}`, {
      headers: { 'Authorization': `Bearer ${AppState.token}` }
    })
    alert('상품이 삭제되었습니다')
    await loadProducts()
    await loadDashboard()
  } catch (error) {
    console.error('상품 삭제 실패:', error)
    alert('상품 삭제에 실패했습니다')
  }
}

async function loadOrders() {
  const container = document.getElementById('orders-container')
  if (!container) return

  try {
    const response = await axios.get('/api/admin/orders', {
      headers: { 'Authorization': `Bearer ${AppState.token}` }
    })
    const orders = response.data.orders

    if (orders.length === 0) {
      container.innerHTML = `
        <div class="text-center py-12">
          <i class="fas fa-shopping-bag text-gray-300 text-6xl mb-4"></i>
          <p class="text-gray-500 text-lg">주문 내역이 없습니다</p>
        </div>
      `
      return
    }

    container.innerHTML = orders.map(order => `
      <div class="bg-white rounded-lg p-4 border">
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="flex items-center space-x-2 mb-2">
              <span class="text-xs px-2 py-1 rounded ${
                order.status === 'completed' ? 'bg-green-100 text-green-600' :
                order.status === 'pending' ? 'bg-yellow-100 text-yellow-600' :
                'bg-red-100 text-red-600'
              }">
                ${order.status}
              </span>
              <span class="text-gray-500 text-sm">#${order.id}</span>
              <span class="text-gray-500 text-sm">${new Date(order.created_at).toLocaleString('ko-KR')}</span>
            </div>
            <p class="font-semibold text-gray-800 mb-1">
              사용자: ${order.user_email || `User #${order.user_id}`}
            </p>
            <p class="text-sm text-gray-600 mb-2">
              상품: ${order.product_name || '매장 이용'}
            </p>
            <div class="flex items-center space-x-4 text-sm">
              <span class="text-gray-600">결제: ${order.total_price.toLocaleString()}원</span>
              <span class="text-red-600">포인트 사용: ${order.points_used.toLocaleString()}P</span>
              <span class="text-green-600">포인트 적립: ${order.points_earned.toLocaleString()}P</span>
            </div>
          </div>
        </div>
      </div>
    `).join('')
  } catch (error) {
    console.error('주문 목록 로드 실패:', error)
    container.innerHTML = '<p class="text-red-600">주문 목록을 불러오지 못했습니다</p>'
  }
}

async function loadUsers() {
  const container = document.getElementById('users-container')
  if (!container) return

  try {
    const users = await loadAllUsers()

    if (users.length === 0) {
      container.innerHTML = `
        <div class="text-center py-12">
          <i class="fas fa-users text-gray-300 text-6xl mb-4"></i>
          <p class="text-gray-500 text-lg">사용자가 없습니다</p>
        </div>
      `
      return
    }

    container.innerHTML = users.map(user => `
      <div class="bg-white rounded-lg p-4 border">
        <div class="flex items-center justify-between">
          <div class="flex-1">
            <h3 class="font-bold text-lg text-gray-800 mb-1">${user.name}</h3>
            <p class="text-sm text-gray-600 mb-2">
              <i class="fas fa-envelope mr-1"></i>${user.email}
              ${user.phone ? `<i class="fas fa-phone ml-3 mr-1"></i>${user.phone}` : ''}
            </p>
            <div class="flex items-center space-x-4">
              <span class="text-yellow-600 font-semibold">
                <i class="fas fa-coins mr-1"></i>${user.points.toLocaleString()}P
              </span>
              <span class="text-gray-500 text-sm">
                가입일: ${new Date(user.created_at).toLocaleDateString('ko-KR')}
              </span>
            </div>
          </div>
        </div>
      </div>
    `).join('')
  } catch (error) {
    console.error('사용자 목록 로드 실패:', error)
    container.innerHTML = '<p class="text-red-600">사용자 목록을 불러오지 못했습니다</p>'
  }
}

async function loadAllUsers() {
  try {
    const response = await axios.get('/api/admin/users', {
      headers: { 'Authorization': `Bearer ${AppState.token}` }
    })
    return response.data.users
  } catch (error) {
    console.error('사용자 목록 로드 실패:', error)
    return []
  }
}

async function loadStores() {
  const container = document.getElementById('stores-container')
  if (!container) return

  try {
    const stores = await AppState.loadStores()

    if (stores.length === 0) {
      container.innerHTML = `
        <div class="text-center py-12">
          <i class="fas fa-store text-gray-300 text-6xl mb-4"></i>
          <p class="text-gray-500 text-lg">등록된 매장이 없습니다</p>
        </div>
      `
      return
    }

    container.innerHTML = stores.map(store => `
      <div class="bg-white rounded-lg p-4 border">
        <div class="flex items-start">
          <img src="${store.image_url}" alt="${store.name}" 
               class="w-24 h-24 rounded-lg object-cover mr-4"/>
          <div class="flex-1">
            <div class="flex items-start justify-between">
              <div>
                <div class="flex items-center space-x-2 mb-1">
                  <h3 class="font-bold text-lg text-gray-800">${store.name}</h3>
                  <span class="text-xs px-2 py-1 rounded ${
                    store.tier === 'Diamond' ? 'bg-yellow-100 text-yellow-600' :
                    store.tier === 'Platinum' ? 'bg-purple-100 text-purple-600' :
                    store.tier === 'Gold' ? 'bg-orange-100 text-orange-600' :
                    'bg-gray-100 text-gray-600'
                  }">
                    ${store.tier}
                  </span>
                </div>
                <p class="text-sm text-gray-600 mb-2">
                  <i class="fas fa-map-marker-alt text-red-500 mr-1"></i>${store.address}
                </p>
                <div class="flex items-center space-x-4 text-sm">
                  <span class="text-yellow-600">
                    <i class="fas fa-star mr-1"></i>${store.rating} (${store.reviews_count} 리뷰)
                  </span>
                  <span class="text-gray-600">${store.distance}</span>
                  <span class="text-blue-600">할인 ${store.discount_rate}%</span>
                  <span class="text-green-600">적립 ${store.points_rate}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `).join('')
  } catch (error) {
    console.error('매장 목록 로드 실패:', error)
    container.innerHTML = '<p class="text-red-600">매장 목록을 불러오지 못했습니다</p>'
  }
}

// 전역 함수로 노출
window.editProduct = editProduct
window.deleteProduct = deleteProduct
