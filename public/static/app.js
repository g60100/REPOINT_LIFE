// REPOINT 프론트엔드 JavaScript

// 토스트 알림 함수
function showToast(message, type = 'info') {
  const toast = document.createElement('div')
  toast.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg text-white transform transition-all duration-300 ${
    type === 'success' ? 'bg-green-500' :
    type === 'error' ? 'bg-red-500' :
    type === 'warning' ? 'bg-yellow-500' :
    'bg-blue-500'
  }`
  toast.innerHTML = `
    <div class="flex items-center space-x-2">
      <i class="fas fa-${
        type === 'success' ? 'check-circle' :
        type === 'error' ? 'times-circle' :
        type === 'warning' ? 'exclamation-triangle' :
        'info-circle'
      }"></i>
      <span>${message}</span>
    </div>
  `
  
  document.body.appendChild(toast)
  
  setTimeout(() => {
    toast.style.opacity = '0'
    toast.style.transform = 'translateY(-20px)'
    setTimeout(() => toast.remove(), 300)
  }, 3000)
}

// 로딩 스피너 표시/숨김
function showLoading(show = true) {
  let loader = document.getElementById('global-loader')
  
  if (show) {
    if (!loader) {
      loader = document.createElement('div')
      loader.id = 'global-loader'
      loader.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
      loader.innerHTML = `
        <div class="bg-white rounded-lg p-6 flex flex-col items-center">
          <i class="fas fa-spinner fa-spin text-4xl text-blue-600 mb-3"></i>
          <p class="text-gray-700 font-semibold">처리 중...</p>
        </div>
      `
      document.body.appendChild(loader)
    }
  } else {
    if (loader) {
      loader.remove()
    }
  }
}

// 전역 상태 관리
const AppState = {
  user: null,
  token: null,
  cart: [],
  products: [],
  stores: [],

  init() {
    // 로컬 스토리지에서 토큰 로드
    this.token = localStorage.getItem('repoint_token')
    if (this.token) {
      this.loadUser()
    }
    this.updateUI()
  },

  async loadUser() {
    try {
      const response = await axios.get('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${this.token}` }
      })
      this.user = response.data.user
      this.updateUI()
    } catch (error) {
      console.error('사용자 정보 로드 실패:', error)
      this.logout()
    }
  },

  async login(email, password) {
    try {
      showLoading(true)
      const response = await axios.post('/api/auth/login', { email, password })
      this.token = response.data.token
      this.user = response.data.user
      localStorage.setItem('repoint_token', this.token)
      this.updateUI()
      showLoading(false)
      showToast('로그인 성공!', 'success')
      return true
    } catch (error) {
      showLoading(false)
      console.error('로그인 실패:', error)
      showToast(error.response?.data?.error || '로그인에 실패했습니다', 'error')
      return false
    }
  },

  async signup(email, password, name, phone) {
    try {
      showLoading(true)
      const response = await axios.post('/api/auth/signup', { email, password, name, phone })
      this.token = response.data.token
      this.user = response.data.user
      localStorage.setItem('repoint_token', this.token)
      this.updateUI()
      showLoading(false)
      showToast('회원가입 성공! 1,000P가 지급되었습니다 🎉', 'success')
      return true
    } catch (error) {
      showLoading(false)
      console.error('회원가입 실패:', error)
      showToast(error.response?.data?.error || '회원가입에 실패했습니다', 'error')
      return false
    }
  },

  logout() {
    this.token = null
    this.user = null
    this.cart = []
    localStorage.removeItem('repoint_token')
    this.updateUI()
    window.location.href = '/'
  },

  async updateProfile(name, phone, password) {
    if (!this.token) {
      showToast('로그인이 필요합니다', 'warning')
      window.location.href = '/login.html'
      return false
    }

    try {
      showLoading(true)
      const data = {}
      if (name) data.name = name
      if (phone) data.phone = phone
      if (password) data.password = password

      const response = await axios.patch('/api/auth/me', data, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      })
      
      this.user = response.data.user
      this.updateUI()
      showLoading(false)
      showToast('프로필이 업데이트되었습니다', 'success')
      return true
    } catch (error) {
      showLoading(false)
      console.error('프로필 업데이트 실패:', error)
      showToast(error.response?.data?.error || '프로필 업데이트에 실패했습니다', 'error')
      return false
    }
  },

  updateUI() {
    // 헤더 포인트 업데이트
    const pointsEl = document.querySelector('.user-points')
    if (pointsEl) {
      if (this.user) {
        pointsEl.innerHTML = `<i class="fas fa-coins text-yellow-300"></i><span class="ml-2 font-bold">${this.user.points.toLocaleString()}P</span>`
      } else {
        pointsEl.innerHTML = `<i class="fas fa-coins text-yellow-300"></i><span class="ml-2 font-bold">0P</span>`
      }
    }

    // 로그인 버튼 업데이트
    const loginBtn = document.querySelector('.login-btn')
    if (loginBtn) {
      if (this.user) {
        loginBtn.textContent = this.user.name
        loginBtn.href = '/my.html'
      } else {
        loginBtn.textContent = '로그인'
        loginBtn.href = '/login.html'
      }
    }

    // 장바구니 카운트 업데이트
    this.updateCartCount()
  },

  async loadProducts() {
    try {
      const response = await axios.get('/api/products')
      this.products = response.data.products
      return this.products
    } catch (error) {
      console.error('상품 목록 로드 실패:', error)
      return []
    }
  },

  async loadStores() {
    try {
      const response = await axios.get('/api/stores')
      this.stores = response.data.stores
      return this.stores
    } catch (error) {
      console.error('매장 목록 로드 실패:', error)
      return []
    }
  },

  async loadCart() {
    if (!this.token) {
      this.cart = []
      return []
    }

    try {
      const response = await axios.get('/api/cart', {
        headers: { 'Authorization': `Bearer ${this.token}` }
      })
      this.cart = response.data.items
      this.updateCartCount()
      return this.cart
    } catch (error) {
      console.error('장바구니 로드 실패:', error)
      return []
    }
  },

  async addToCart(productId, quantity = 1) {
    if (!this.token) {
      showToast('로그인이 필요합니다', 'warning')
      window.location.href = '/login.html'
      return false
    }

    try {
      showLoading(true)
      await axios.post('/api/cart', 
        { product_id: productId, quantity },
        { headers: { 'Authorization': `Bearer ${this.token}` } }
      )
      await this.loadCart()
      showLoading(false)
      showToast('장바구니에 추가되었습니다', 'success')
      return true
    } catch (error) {
      showLoading(false)
      console.error('장바구니 추가 실패:', error)
      showToast('장바구니 추가에 실패했습니다', 'error')
      return false
    }
  },

  async removeFromCart(cartId) {
    if (!this.token) return false

    try {
      await axios.delete(`/api/cart/${cartId}`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      })
      await this.loadCart()
      return true
    } catch (error) {
      console.error('장바구니 삭제 실패:', error)
      return false
    }
  },

  async updateCartQuantity(cartId, quantity) {
    if (!this.token) return false

    try {
      await axios.patch(`/api/cart/${cartId}`, 
        { quantity },
        { headers: { 'Authorization': `Bearer ${this.token}` } }
      )
      await this.loadCart()
      return true
    } catch (error) {
      console.error('장바구니 수량 변경 실패:', error)
      return false
    }
  },

  updateCartCount() {
    const cartCountEls = document.querySelectorAll('.cart-count')
    const count = this.cart.length
    cartCountEls.forEach(el => {
      el.textContent = count
      if (count === 0) {
        el.classList.add('hidden')
      } else {
        el.classList.remove('hidden')
      }
    })
  },

  async createOrder(productId, storeId, orderType, pointsUsed = 0) {
    if (!this.token) {
      showToast('로그인이 필요합니다', 'warning')
      window.location.href = '/login.html'
      return false
    }

    try {
      showLoading(true)
      const response = await axios.post('/api/orders',
        { product_id: productId, store_id: storeId, order_type: orderType, points_used: pointsUsed },
        { headers: { 'Authorization': `Bearer ${this.token}` } }
      )
      
      showLoading(false)
      showToast(`주문이 완료되었습니다! ${response.data.points_earned}P가 적립되었습니다 🎉`, 'success')
      await this.loadUser()
      await this.loadCart()
      return true
    } catch (error) {
      showLoading(false)
      console.error('주문 실패:', error)
      showToast(error.response?.data?.error || '주문에 실패했습니다', 'error')
      return false
    }
  },

  async loadOrders() {
    if (!this.token) return []

    try {
      const response = await axios.get('/api/orders', {
        headers: { 'Authorization': `Bearer ${this.token}` }
      })
      return response.data.orders
    } catch (error) {
      console.error('주문 목록 로드 실패:', error)
      return []
    }
  },

  async loadPointsHistory() {
    if (!this.token) return []

    try {
      const response = await axios.get('/api/points/history', {
        headers: { 'Authorization': `Bearer ${this.token}` }
      })
      return response.data.history
    } catch (error) {
      console.error('포인트 내역 로드 실패:', error)
      return []
    }
  }
}

// DOM 로드 완료 시 초기화
document.addEventListener('DOMContentLoaded', () => {
  AppState.init()

  // 모바일 메뉴 토글
  const mobileMenuBtn = document.getElementById('mobile-menu-btn')
  const mobileMenu = document.getElementById('mobile-menu')
  if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden')
    })
  }
})

// 전역으로 노출
window.AppState = AppState
window.showToast = showToast
window.showLoading = showLoading
