import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { sign, verify } from 'hono/jwt'

type Bindings = {
  DB: D1Database;
}

type User = {
  id: number;
  email: string;
  name: string;
  points: number;
}

const app = new Hono<{ Bindings: Bindings }>()

// JWT Secret (?�경 변?�에??가?�오�?
const getJWTSecret = (c: any) => c.env.getJWTSecret(c) || 'dev-secret-only-change-in-production'

// PBKDF2 비�?번호 ?�싱 ?�수 (salt ?�함)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const passwordData = encoder.encode(password)

  const key = await crypto.subtle.importKey(
    'raw', passwordData, 'PBKDF2', false, ['deriveBits']
  )

  const hash = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    key, 256
  )

  const hashArray = Array.from(new Uint8Array(hash))
  const saltArray = Array.from(salt)
  const combined = saltArray.concat(hashArray)
  return combined.map(b => b.toString(16).padStart(2, '0')).join('')
}

// 비�?번호 검�??�수
async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  const encoder = new TextEncoder()
  const combined = hashedPassword.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
  const salt = new Uint8Array(combined.slice(0, 16))
  const storedHash = combined.slice(16)

  const passwordData = encoder.encode(password)
  const key = await crypto.subtle.importKey(
    'raw', passwordData, 'PBKDF2', false, ['deriveBits']
  )

  const hash = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    key, 256
  )

  const hashArray = Array.from(new Uint8Array(hash))
  return hashArray.every((byte, i) => byte === storedHash[i])
}

// Haversine 공식?�로 거리 계산 (km)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // 지�?반�?�?(km)
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// 관리자 권한 체크 미들?�어
async function requireAdmin(c: any, next: any) {
  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: "인증이 필요합니다" }, 401)
  }

  const token = authHeader.substring(7)
  try {
    const payload = await verify(token, getJWTSecret(c)) as any as any

    const { DB } = c.env
    const user = await DB.prepare('SELECT role FROM users WHERE id = ?')
      .bind(payload.id).first() as any
      return c.json({ error: "관리자 권한이 필요합니다" }, 403)
    if (!user || user.role !== 'admin') {
      return c.json({ error: '관리자 권한???�요?�니?? }, 403)
    }

    return c.json({ error: "인증 실패" }, 401)
  } catch (error) {
    return c.json({ error: '?�증 ?�패' }, 401)
  }
}

// CORS ?�정 (?�정 ?�메?�만 ?�용)
app.use('/api/*', cors({
  origin: ['https://repoint.life', 'https://repoint-life.pages.dev', 'http://localhost:3000'],
  credentials: true
}))


// ==================== Authentication APIs ====================

// ?�원가??app.post('/api/auth/signup', async (c) => {
  try {
    const { DB } = c.env
    const { email, password, name, phone } = await c.req.json()

    // 중복 체크
    const existing = await DB.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).bind(email).first()

    if (existing) {
      return c.json({ error: '?��? 존재?�는 ?�메?�입?�다' }, 400)
    }

    // 비�?번호 ?�싱
    const hashedPassword = await hashPassword(password)

    // ?�용???�성
    const result = await DB.prepare(
      'INSERT INTO users (email, password, name, phone, points) VALUES (?, ?, ?, ?, ?)'
    ).bind(email, hashedPassword, name, phone, 1000).run()

    // 가???�인??지�?기록
    await DB.prepare(
      'INSERT INTO points_history (user_id, amount, type, description) VALUES (?, ?, ?, ?)'
    ).bind(result.meta.last_row_id, 1000, 'signup', '?�원가??축하 ?�인??).run()

    // JWT ?�성
    const token = await sign(
      { id: result.meta.last_row_id, email, name },
      getJWTSecret(c)
    )

    return c.json({
      token,
      user: {
        id: result.meta.last_row_id,
        email,
        name,
        points: 1000
      }
    })
  } catch (error) {
    return c.json({ error: '?�원가???�패' }, 500)
  }
})

// 로그??app.post('/api/auth/login', async (c) => {
  try {
    const { DB } = c.env
    const { email, password } = await c.req.json()

    const user = await DB.prepare(
      'SELECT id, email, name, points, password FROM users WHERE email = ?'
    ).bind(email).first() as any

    if (!user) {
      return c.json({ error: '?�메???�는 비�?번호가 ?�바르�? ?�습?�다' }, 401)
    }

    // 비�?번호 검�?    const isValid = await verifyPassword(password, user.password)
    if (!isValid) {
      return c.json({ error: '?�메???�는 비�?번호가 ?�바르�? ?�습?�다' }, 401)
    }

    // JWT ?�성 (1???�효)
    const token = await sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24?�간
      },
      getJWTSecret(c)
    )

    return c.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        points: user.points
      }
    })
  } catch (error) {
    return c.json({ error: '로그???�패' }, 500)
  }
})

// ?�재 ?�용???�보
app.get('/api/auth/me', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: '?�증???�요?�니?? }, 401)
    }

    const token = authHeader.substring(7)
    const payload = await verify(token, getJWTSecret(c)) as any as any

    const { DB } = c.env
    const user = await DB.prepare(
      'SELECT id, email, name, phone, points FROM users WHERE id = ?'
    ).bind(payload.id).first() as any

    if (!user) {
      return c.json({ error: '?�용?��? 찾을 ???�습?�다' }, 404)
    }

    return c.json({ user })
  } catch (error) {
    return c.json({ error: '?�증 ?�패' }, 401)
  }
})

// ?�로???�데?�트
app.patch('/api/auth/me', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: '?�증???�요?�니?? }, 401)
    }

    const token = authHeader.substring(7)
    const payload = await verify(token, getJWTSecret(c)) as any as any

    const { DB } = c.env
    const { name, phone, password } = await c.req.json()

    // ?�데?�트???�드 준�?    const updates: string[] = []
    const values: any[] = []

    if (name) {
      updates.push('name = ?')
      values.push(name)
    }
    if (phone) {
      updates.push('phone = ?')
      values.push(phone)
    }
    if (password) {
      updates.push('password = ?')
      const hashedPassword = await hashPassword(password)
      values.push(hashedPassword)
    }

    if (updates.length === 0) {
      return c.json({ error: '?�데?�트???�보가 ?�습?�다' }, 400)
    }

    // ?�용??ID 추�?
    values.push(payload.id)

    // SQL 쿼리 ?�행
    await DB.prepare(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...values).run()

    // ?�데?�트???�용???�보 반환
    const user = await DB.prepare(
      'SELECT id, email, name, phone, points FROM users WHERE id = ?'
    ).bind(payload.id).first() as any

    return c.json({ message: '?�로?�이 ?�데?�트?�었?�니??, user })
  } catch (error) {
    return c.json({ error: '?�로???�데?�트 ?�패' }, 500)
  }
})

// ==================== Product APIs ====================

// ?�품 목록 (검?? ?�터 지??
app.get('/api/products', async (c) => {
  try {
    const { DB } = c.env
    const category = c.req.query('category')
    const search = c.req.query('search')
    const product_type = c.req.query('product_type')

    let query = 'SELECT * FROM products WHERE 1=1'
    const params: any[] = []

    if (category) {
      query += ' AND category = ?'
      params.push(category)
    }

    if (search) {
      query += ' AND (name LIKE ? OR description LIKE ?)'
      params.push(`%${search}%`, `%${search}%`)
    }

    if (product_type) {
      query += ' AND product_type = ?'
      params.push(product_type)
    }

    query += ' ORDER BY created_at DESC'

    const { results } = await DB.prepare(query).bind(...params).all()

    return c.json({ products: results })
  } catch (error) {
    return c.json({ error: '?�품 목록 조회 ?�패' }, 500)
  }
})

// ?�품 ?�세 (?�션, ?��?지, 리뷰 ?�함)
app.get('/api/products/:id', async (c) => {
  try {
    const { DB } = c.env
    const id = c.req.param('id')

    const product = await DB.prepare(
      'SELECT * FROM products WHERE id = ?'
    ).bind(id).first()

    if (!product) {
      return c.json({ error: '?�품??찾을 ???�습?�다' }, 404)
    }

    // ?�션 조회
    const { results: options } = await DB.prepare(
      'SELECT * FROM product_options WHERE product_id = ?'
    ).bind(id).all()

    // ?��?지 조회
    const { results: images } = await DB.prepare(
      'SELECT * FROM product_images WHERE product_id = ? ORDER BY display_order ASC'
    ).bind(id).all()

    // 리뷰 ?�계
    const reviewStats = await DB.prepare(`
      SELECT 
        COUNT(*) as review_count,
        AVG(rating) as average_rating
      FROM reviews WHERE product_id = ?
    `).bind(id).first() as any

    return c.json({
      product,
      options,
      images,
      review_count: reviewStats?.review_count || 0,
      average_rating: reviewStats?.average_rating || 0
    })
  } catch (error) {
    return c.json({ error: '?�품 조회 ?�패' }, 500)
  }
})

// ==================== Store APIs ====================

// 매장 목록
app.get('/api/stores', async (c) => {
  try {
    const { DB } = c.env
    const { results } = await DB.prepare(
      'SELECT * FROM stores ORDER BY rating DESC'
    ).all()

    return c.json({ stores: results })
  } catch (error) {
    return c.json({ error: '매장 목록 조회 ?�패' }, 500)
  }
})

// 매장 ?�세
app.get('/api/stores/:id', async (c) => {
  try {
    const { DB } = c.env
    const id = c.req.param('id')

    const store = await DB.prepare(
      'SELECT * FROM stores WHERE id = ?'
    ).bind(id).first()

    if (!store) {
      return c.json({ error: '매장??찾을 ???�습?�다' }, 404)
    }

    return c.json({ store })
  } catch (error) {
    return c.json({ error: '매장 조회 ?�패' }, 500)
  }
})

// ==================== Cart APIs ====================

// ?�바구니 조회
app.get('/api/cart', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader) {
      return c.json({ error: '?�증???�요?�니?? }, 401)
    }

    const token = authHeader.substring(7)
    const payload = await verify(token, getJWTSecret(c)) as any as any

    const { DB } = c.env
    const { results } = await DB.prepare(`
      SELECT c.id, c.quantity, p.* 
      FROM cart c 
      JOIN products p ON c.product_id = p.id 
      WHERE c.user_id = ?
    `).bind(payload.id).all()

    return c.json({ items: results })
  } catch (error) {
    return c.json({ error: '?�바구니 조회 ?�패' }, 500)
  }
})

// ?�바구니 추�?
app.post('/api/cart', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader) {
      return c.json({ error: '?�증???�요?�니?? }, 401)
    }

    const token = authHeader.substring(7)
    const payload = await verify(token, getJWTSecret(c)) as any as any

    const { DB } = c.env
    const { product_id, quantity } = await c.req.json()

    // ?��? ?�는지 ?�인
    const existing = await DB.prepare(
      'SELECT id, quantity FROM cart WHERE user_id = ? AND product_id = ?'
    ).bind(payload.id, product_id).first() as any

    if (existing) {
      // ?�량 ?�데?�트
      await DB.prepare(
        'UPDATE cart SET quantity = quantity + ? WHERE id = ?'
      ).bind(quantity || 1, existing.id).run()
    } else {
      // ?�로 추�?
      await DB.prepare(
        'INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)'
      ).bind(payload.id, product_id, quantity || 1).run()
    }

    return c.json({ message: '?�바구니??추�??�었?�니?? })
  } catch (error) {
    return c.json({ error: '?�바구니 추�? ?�패' }, 500)
  }
})

// ?�바구니 ?�량 ?�데?�트
app.patch('/api/cart/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader) {
      return c.json({ error: '?�증???�요?�니?? }, 401)
    }

    const token = authHeader.substring(7)
    const payload = await verify(token, getJWTSecret(c)) as any as any

    const { DB } = c.env
    const id = c.req.param('id')
    const { quantity } = await c.req.json()

    if (quantity < 1) {
      return c.json({ error: '?�량?� 1�??�상?�어???�니?? }, 400)
    }

    await DB.prepare(
      'UPDATE cart SET quantity = ? WHERE id = ? AND user_id = ?'
    ).bind(quantity, id, payload.id).run()

    return c.json({ message: '?�량??변경되?�습?�다' })
  } catch (error) {
    return c.json({ error: '?�량 변�??�패' }, 500)
  }
})

// ?�바구니 ??��
app.delete('/api/cart/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader) {
      return c.json({ error: '?�증???�요?�니?? }, 401)
    }

    const token = authHeader.substring(7)
    const payload = await verify(token, getJWTSecret(c)) as any as any

    const { DB } = c.env
    const id = c.req.param('id')

    await DB.prepare(
      'DELETE FROM cart WHERE id = ? AND user_id = ?'
    ).bind(id, payload.id).run()

    return c.json({ message: '?�바구니?�서 ??��?�었?�니?? })
  } catch (error) {
    return c.json({ error: '?�바구니 ??�� ?�패' }, 500)
  }
})

// ==================== Order APIs ====================

// 주문 ?�성
app.post('/api/orders', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader) {
      return c.json({ error: '?�증???�요?�니?? }, 401)
    }

    const token = authHeader.substring(7)
    const payload = await verify(token, getJWTSecret(c)) as any as any

    const { DB } = c.env
    const { product_id, store_id, order_type, points_used } = await c.req.json()

    // ?�품 ?�보 가?�오�?    let total_price = 0
    let points_earned = 0

    if (product_id) {
      const product = await DB.prepare(
        'SELECT price, points_rate FROM products WHERE id = ?'
      ).bind(product_id).first() as any

      total_price = product.price
      points_earned = Math.floor(product.price * product.points_rate / 100)
    }

    // ?�인??차감
    if (points_used > 0) {
      await DB.prepare(
        'UPDATE users SET points = points - ? WHERE id = ?'
      ).bind(points_used, payload.id).run()

      await DB.prepare(
        'INSERT INTO points_history (user_id, amount, type, description) VALUES (?, ?, ?, ?)'
      ).bind(payload.id, -points_used, 'use', '주문 ???�인???�용').run()
    }

    // 주문 ?�성
    const result = await DB.prepare(`
      INSERT INTO orders (user_id, product_id, store_id, order_type, total_price, points_used, points_earned, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(payload.id, product_id || null, store_id || null, order_type, total_price, points_used || 0, points_earned, 'completed').run()

    // ?�인???�립
    await DB.prepare(
      'UPDATE users SET points = points + ? WHERE id = ?'
    ).bind(points_earned, payload.id).run()

    await DB.prepare(
      'INSERT INTO points_history (user_id, amount, type, description) VALUES (?, ?, ?, ?)'
    ).bind(payload.id, points_earned, 'purchase', '?�품 구매 ?�립').run()

    // ?�바구니 비우�?(product_id가 ?�는 경우)
    if (product_id) {
      await DB.prepare(
        'DELETE FROM cart WHERE user_id = ? AND product_id = ?'
      ).bind(payload.id, product_id).run()
    }

    return c.json({
      order_id: result.meta.last_row_id,
      message: '주문???�료?�었?�니??,
      points_earned
    })
  } catch (error) {
    return c.json({ error: '주문 처리 ?�패' }, 500)
  }
})

// 주문 목록
app.get('/api/orders', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader) {
      return c.json({ error: '?�증???�요?�니?? }, 401)
    }

    const token = authHeader.substring(7)
    const payload = await verify(token, getJWTSecret(c)) as any as any

    const { DB } = c.env
    const { results } = await DB.prepare(`
      SELECT o.*, p.name as product_name, p.image_url as product_image
      FROM orders o
      LEFT JOIN products p ON o.product_id = p.id
      WHERE o.user_id = ?
      ORDER BY o.created_at DESC
    `).bind(payload.id).all()

    return c.json({ orders: results })
  } catch (error) {
    return c.json({ error: '주문 목록 조회 ?�패' }, 500)
  }
})

// ==================== Points APIs ====================

// ?�인???�역
app.get('/api/points/history', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader) {
      return c.json({ error: '?�증???�요?�니?? }, 401)
    }

    const token = authHeader.substring(7)
    const payload = await verify(token, getJWTSecret(c)) as any as any

    const { DB } = c.env
    const { results } = await DB.prepare(
      'SELECT * FROM points_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 50'
    ).bind(payload.id).all()

    return c.json({ history: results })
  } catch (error) {
    return c.json({ error: '?�인???�역 조회 ?�패' }, 500)
  }
})

// ==================== Stats API ====================

app.get('/api/stats', (c) => {
  return c.json({
    users: '1M+',
    stores: '5,000+',
    products: '10K+',
    points: '$50M'
  })
})

// ==================== Reviews APIs ====================

// ?�품 리뷰 목록 조회
app.get('/api/products/:id/reviews', async (c) => {
  try {
    const { DB } = c.env
    const productId = c.req.param('id')

    const { results } = await DB.prepare(`
      SELECT r.*, u.name as user_name, u.email as user_email,
        (SELECT GROUP_CONCAT(image_url) FROM review_images WHERE review_id = r.id) as images
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.product_id = ?
      ORDER BY r.created_at DESC
    `).bind(productId).all()

    return c.json({ reviews: results })
  } catch (error) {
    return c.json({ error: '리뷰 조회 ?�패' }, 500)
  }
})

// 리뷰 ?�성
app.post('/api/reviews', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader) {
      return c.json({ error: '?�증???�요?�니?? }, 401)
    }

    const token = authHeader.substring(7)
    const payload = await verify(token, getJWTSecret(c)) as any as any

    const { DB } = c.env
    const { product_id, order_id, rating, title, content, images } = await c.req.json()

    // 리뷰 ?�성
    const result = await DB.prepare(`
      INSERT INTO reviews (user_id, product_id, order_id, rating, title, content)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(payload.id, product_id, order_id || null, rating, title, content).run()

    // ?��?지가 ?�으�?추�?
    if (images && images.length > 0) {
      for (const imageUrl of images) {
        await DB.prepare(`
          INSERT INTO review_images (review_id, image_url) VALUES (?, ?)
        `).bind(result.meta.last_row_id, imageUrl).run()
      }
    }

    return c.json({
      message: '리뷰가 ?�록?�었?�니??,
      review_id: result.meta.last_row_id
    })
  } catch (error) {
    return c.json({ error: '리뷰 ?�성 ?�패' }, 500)
  }
})

// 리뷰 ?�정
app.patch('/api/reviews/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader) {
      return c.json({ error: '?�증???�요?�니?? }, 401)
    }

    const token = authHeader.substring(7)
    const payload = await verify(token, getJWTSecret(c)) as any as any

    const { DB } = c.env
    const reviewId = c.req.param('id')
    const { rating, title, content } = await c.req.json()

    await DB.prepare(`
      UPDATE reviews SET rating = ?, title = ?, content = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `).bind(rating, title, content, reviewId, payload.id).run()

    return c.json({ message: '리뷰가 ?�정?�었?�니?? })
  } catch (error) {
    return c.json({ error: '리뷰 ?�정 ?�패' }, 500)
  }
})

// 리뷰 ??��
app.delete('/api/reviews/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader) {
      return c.json({ error: '?�증???�요?�니?? }, 401)
    }

    const token = authHeader.substring(7)
    const payload = await verify(token, getJWTSecret(c)) as any as any

    const { DB } = c.env
    const reviewId = c.req.param('id')

    await DB.prepare('DELETE FROM reviews WHERE id = ? AND user_id = ?')
      .bind(reviewId, payload.id).run()

    return c.json({ message: '리뷰가 ??��?�었?�니?? })
  } catch (error) {
    return c.json({ error: '리뷰 ??�� ?�패' }, 500)
  }
})

// ==================== Product Options APIs ====================

// ?�품 ?�션 조회
app.get('/api/products/:id/options', async (c) => {
  try {
    const { DB } = c.env
    const productId = c.req.param('id')

    const { results } = await DB.prepare(
      'SELECT * FROM product_options WHERE product_id = ?'
    ).bind(productId).all()

    return c.json({ options: results })
  } catch (error) {
    return c.json({ error: '?�션 조회 ?�패' }, 500)
  }
})

// ==================== Product Images APIs ====================

// ?�품 ?��?지 조회
app.get('/api/products/:id/images', async (c) => {
  try {
    const { DB } = c.env
    const productId = c.req.param('id')

    const { results } = await DB.prepare(
      'SELECT * FROM product_images WHERE product_id = ? ORDER BY display_order ASC'
    ).bind(productId).all()

    return c.json({ images: results })
  } catch (error) {
    return c.json({ error: '?��?지 조회 ?�패' }, 500)
  }
})

// ==================== Referral APIs ====================

// 추천??코드 ?�성 (?�동)
async function generateReferralCode(userId: number): Promise<string> {
  return `REF${userId}${Date.now().toString(36).toUpperCase()}`
}

// ??추천??코드 조회
app.get('/api/referral/code', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader) {
      return c.json({ error: '?�증???�요?�니?? }, 401)
    }

    const token = authHeader.substring(7)
    const payload = await verify(token, getJWTSecret(c)) as any as any

    const { DB } = c.env
    const user = await DB.prepare(
      'SELECT referral_code FROM users WHERE id = ?'
    ).bind(payload.id).first() as any

    let referralCode = user.referral_code

    // 코드가 ?�으�??�성
    if (!referralCode) {
      referralCode = await generateReferralCode(payload.id)
      await DB.prepare(
        'UPDATE users SET referral_code = ? WHERE id = ?'
      ).bind(referralCode, payload.id).run()
    }

    return c.json({ referral_code: referralCode })
  } catch (error) {
    return c.json({ error: '추천??코드 조회 ?�패' }, 500)
  }
})

// 추천??코드�?가??app.post('/api/referral/apply', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader) {
      return c.json({ error: '?�증???�요?�니?? }, 401)
    }

    const token = authHeader.substring(7)
    const payload = await verify(token, getJWTSecret(c)) as any as any

    const { DB } = c.env
    const { referral_code } = await c.req.json()

    // 추천??찾기
    const referrer = await DB.prepare(
      'SELECT id FROM users WHERE referral_code = ?'
    ).bind(referral_code).first() as any

    if (!referrer) {
      return c.json({ error: '?�바르�? ?��? 추천??코드?�니?? }, 404)
    }

    if (referrer.id === payload.id) {
      return c.json({ error: '?�신??추천??코드???�용?????�습?�다' }, 400)
    }

    // ?��? 추천?�이 ?�는지 ?�인
    const existing = await DB.prepare(
      'SELECT id FROM users WHERE id = ? AND referred_by IS NOT NULL'
    ).bind(payload.id).first()

    if (existing) {
      return c.json({ error: '?��? 추천?�이 ?�록?�어 ?�습?�다' }, 400)
    }

    // 추천???�록
    await DB.prepare(
      'UPDATE users SET referred_by = ? WHERE id = ?'
    ).bind(referrer.id, payload.id).run()

    // 추천?�에�?보너??지�?    const bonusPoints = 1000
    await DB.prepare(
      'UPDATE users SET points = points + ? WHERE id = ?'
    ).bind(bonusPoints, referrer.id).run()

    await DB.prepare(
      'INSERT INTO points_history (user_id, amount, type, description) VALUES (?, ?, ?, ?)'
    ).bind(referrer.id, bonusPoints, 'referral', '친구 초�? 보너??).run()

    // ?�추천인?�게??보너??지�?    await DB.prepare(
      'UPDATE users SET points = points + ? WHERE id = ?'
    ).bind(500, payload.id).run()

    await DB.prepare(
      'INSERT INTO points_history (user_id, amount, type, description) VALUES (?, ?, ?, ?)'
    ).bind(payload.id, 500, 'referral', '추천??가??보너??).run()

    // 추천 기록
    await DB.prepare(`
      INSERT INTO referrals (referrer_id, referee_id, referral_code, bonus_points, status)
      VALUES (?, ?, ?, ?, ?)
    `).bind(referrer.id, payload.id, referral_code, bonusPoints, 'completed').run()

    return c.json({
      message: '추천?�이 ?�록?�었?�니??,
      bonus_points: 500
    })
  } catch (error) {
    return c.json({ error: '추천???�록 ?�패' }, 500)
  }
})

// ??추천??목록
app.get('/api/referral/list', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader) {
      return c.json({ error: '?�증???�요?�니?? }, 401)
    }

    const token = authHeader.substring(7)
    const payload = await verify(token, getJWTSecret(c)) as any as any

    const { DB } = c.env
    const { results } = await DB.prepare(`
      SELECT r.*, u.name as referee_name, u.email as referee_email
      FROM referrals r
      JOIN users u ON r.referee_id = u.id
      WHERE r.referrer_id = ?
      ORDER BY r.created_at DESC
    `).bind(payload.id).all()

    return c.json({ referrals: results })
  } catch (error) {
    return c.json({ error: '추천??목록 조회 ?�패' }, 500)
  }
})

// ==================== Shipping Info APIs ====================

// 배송 ?�보 추�?
app.post('/api/shipping', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader) {
      return c.json({ error: '?�증???�요?�니?? }, 401)
    }

    const token = authHeader.substring(7)
    await verify(token, getJWTSecret(c)) as any

    const { DB } = c.env
    const {
      order_id, recipient_name, recipient_phone, postal_code,
      address, address_detail, delivery_request
    } = await c.req.json()

    const result = await DB.prepare(`
      INSERT INTO shipping_info (
        order_id, recipient_name, recipient_phone, postal_code,
        address, address_detail, delivery_request, shipping_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      order_id, recipient_name, recipient_phone, postal_code || '',
      address, address_detail || '', delivery_request || '', 'pending'
    ).run()

    return c.json({
      message: '배송 ?�보가 ?�록?�었?�니??,
      shipping_id: result.meta.last_row_id
    })
  } catch (error) {
    return c.json({ error: '배송 ?�보 ?�록 ?�패' }, 500)
  }
})

// 배송 ?�보 조회
app.get('/api/orders/:id/shipping', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader) {
      return c.json({ error: '?�증???�요?�니?? }, 401)
    }

    const token = authHeader.substring(7)
    await verify(token, getJWTSecret(c)) as any

    const { DB } = c.env
    const orderId = c.req.param('id')

    const shipping = await DB.prepare(
      'SELECT * FROM shipping_info WHERE order_id = ?'
    ).bind(orderId).first()

    return c.json({ shipping })
  } catch (error) {
    return c.json({ error: '배송 ?�보 조회 ?�패' }, 500)
  }
})

// ==================== Admin APIs ====================

// 관리자 - ?�체 ?�용??조회
app.get('/api/admin/users', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader) {
      return c.json({ error: '?�증???�요?�니?? }, 401)
    }

    // 간단???�증 (?�제로는 role 기반 ?�증 ?�요)
    const token = authHeader.substring(7)
    await verify(token, getJWTSecret(c)) as any

    const { DB } = c.env
    const { results } = await DB.prepare(
      'SELECT id, email, name, phone, points, created_at FROM users ORDER BY created_at DESC'
    ).all()

    return c.json({ users: results })
  } catch (error) {
    return c.json({ error: '?�용??목록 조회 ?�패' }, 500)
  }
})

// 관리자 - ?�체 주문 조회
app.get('/api/admin/orders', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader) {
      return c.json({ error: '?�증???�요?�니?? }, 401)
    }

    const token = authHeader.substring(7)
    await verify(token, getJWTSecret(c)) as any

    const { DB } = c.env
    const { results } = await DB.prepare(`
      SELECT o.*, u.email as user_email, p.name as product_name, p.image_url as product_image
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN products p ON o.product_id = p.id
      ORDER BY o.created_at DESC
    `).all()

    return c.json({ orders: results })
  } catch (error) {
    return c.json({ error: '주문 목록 조회 ?�패' }, 500)
  }
})

// 관리자 - ?�품 추�?
app.post('/api/admin/products', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader) {
      return c.json({ error: '?�증???�요?�니?? }, 401)
    }

    const token = authHeader.substring(7)
    await verify(token, getJWTSecret(c)) as any

    const { DB } = c.env
    const {
      name, description, price, points_rate, stock, category, image_url,
      product_type, supplier, external_url, images, options
    } = await c.req.json()

    // ?�품 추�?
    const result = await DB.prepare(`
      INSERT INTO products (
        name, description, price, points_rate, stock, category, image_url,
        product_type, supplier, external_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      name, description, price, points_rate, stock || 100, category, image_url,
      product_type || 'internal', supplier || 'REPOINT', external_url || null
    ).run()

    const productId = result.meta.last_row_id

    // 추�? ?��?지가 ?�으�??�??    if (images && images.length > 0) {
      for (let i = 0; i < images.length; i++) {
        await DB.prepare(`
          INSERT INTO product_images (product_id, image_url, display_order, is_primary)
          VALUES (?, ?, ?, ?)
        `).bind(productId, images[i], i, i === 0 ? 1 : 0).run()
      }
    }

    // ?�션???�으�??�??    if (options && options.length > 0) {
      for (const option of options) {
        await DB.prepare(`
          INSERT INTO product_options (product_id, option_name, option_value, price_adjustment, stock)
          VALUES (?, ?, ?, ?, ?)
        `).bind(
          productId, option.name, option.value,
          option.price_adjustment || 0, option.stock || 0
        ).run()
      }
    }

    return c.json({
      message: '?�품??추�??�었?�니??,
      id: productId
    })
  } catch (error) {
    return c.json({ error: '?�품 추�? ?�패' }, 500)
  }
})

// 관리자 - ?�품 ?�정
app.patch('/api/admin/products/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader) {
      return c.json({ error: '?�증???�요?�니?? }, 401)
    }

    const token = authHeader.substring(7)
    await verify(token, getJWTSecret(c)) as any

    const { DB } = c.env
    const id = c.req.param('id')
    const { name, description, price, points_rate, stock, category, image_url } = await c.req.json()

    await DB.prepare(`
      UPDATE products 
      SET name = ?, description = ?, price = ?, points_rate = ?, stock = ?, category = ?, image_url = ?
      WHERE id = ?
    `).bind(name, description, price, points_rate, stock, category, image_url, id).run()

    return c.json({ message: '?�품???�정?�었?�니?? })
  } catch (error) {
    return c.json({ error: '?�품 ?�정 ?�패' }, 500)
  }
})

// 관리자 - ?�품 ??��
app.delete('/api/admin/products/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader) {
      return c.json({ error: '?�증???�요?�니?? }, 401)
    }

    const token = authHeader.substring(7)
    await verify(token, getJWTSecret(c)) as any

    const { DB } = c.env
    const id = c.req.param('id')

    await DB.prepare('DELETE FROM products WHERE id = ?').bind(id).run()

    return c.json({ message: '?�품????��?�었?�니?? })
  } catch (error) {
    return c.json({ error: '?�품 ??�� ?�패' }, 500)
  }
})

// 관리자 - 주문 ?�태 변�?app.patch('/api/admin/orders/:id/status', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader) {
      return c.json({ error: '?�증???�요?�니?? }, 401)
    }

    const token = authHeader.substring(7)
    await verify(token, getJWTSecret(c)) as any

    const { DB } = c.env
    const orderId = c.req.param('id')
    const { status, tracking_number, carrier } = await c.req.json()

    // 주문 ?�태 ?�데?�트
    await DB.prepare(
      'UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(status, orderId).run()

    // 배송 ?�보가 ?�으�??�데?�트
    if (tracking_number || carrier) {
      await DB.prepare(`
        UPDATE shipping_info 
        SET tracking_number = ?, carrier = ?, shipping_status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE order_id = ?
      `).bind(tracking_number || '', carrier || '', status, orderId).run()
    }

    return c.json({ message: '주문 ?�태가 변경되?�습?�다' })
  } catch (error) {
    return c.json({ error: '주문 ?�태 변�??�패' }, 500)
  }
})

// 관리자 - 매장 추�?
app.post('/api/admin/stores', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader) {
      return c.json({ error: '?�증???�요?�니?? }, 401)
    }

    const token = authHeader.substring(7)
    await verify(token, getJWTSecret(c)) as any

    const { DB } = c.env
    const {
      name, tier, rating, reviews_count, address, latitude, longitude,
      distance, discount_rate, points_rate, image_url
    } = await c.req.json()

    const result = await DB.prepare(`
      INSERT INTO stores (
        name, tier, rating, reviews_count, address, latitude, longitude,
        distance, discount_rate, points_rate, image_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      name, tier || 'Bronze', rating || 0, reviews_count || 0,
      address, latitude || 0, longitude || 0, distance || '',
      discount_rate || 0, points_rate || 0, image_url || ''
    ).run()

    return c.json({
      message: '매장??추�??�었?�니??,
      id: result.meta.last_row_id
    })
  } catch (error) {
    return c.json({ error: '매장 추�? ?�패' }, 500)
  }
})

// 관리자 - 매장 ?�정
app.patch('/api/admin/stores/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader) {
      return c.json({ error: '?�증???�요?�니?? }, 401)
    }

    const token = authHeader.substring(7)
    await verify(token, getJWTSecret(c)) as any

    const { DB } = c.env
    const id = c.req.param('id')
    const {
      name, tier, rating, reviews_count, address, latitude, longitude,
      distance, discount_rate, points_rate, image_url
    } = await c.req.json()

    await DB.prepare(`
      UPDATE stores SET
        name = ?, tier = ?, rating = ?, reviews_count = ?, address = ?,
        latitude = ?, longitude = ?, distance = ?, discount_rate = ?,
        points_rate = ?, image_url = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      name, tier, rating, reviews_count, address, latitude, longitude,
      distance, discount_rate, points_rate, image_url, id
    ).run()

    return c.json({ message: '매장???�정?�었?�니?? })
  } catch (error) {
    return c.json({ error: '매장 ?�정 ?�패' }, 500)
  }
})

// 관리자 - 매장 ??��
app.delete('/api/admin/stores/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader) {
      return c.json({ error: '?�증???�요?�니?? }, 401)
    }

    const token = authHeader.substring(7)
    await verify(token, getJWTSecret(c)) as any

    const { DB } = c.env
    const id = c.req.param('id')

    await DB.prepare('DELETE FROM stores WHERE id = ?').bind(id).run()

    return c.json({ message: '매장????��?�었?�니?? })
  } catch (error) {
    return c.json({ error: '매장 ??�� ?�패' }, 500)
  }
})

// Catch-all: ?�머지 경로??Pages?�서 처리?�도�??�과
app.all('*', () => {
  // 404�?반환?�면 Pages가 static ?�일??찾음
  return new Response(null, { status: 404 })
})

export default app
