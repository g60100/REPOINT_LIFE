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

// JWT Secret (?˜ê²½ ë³€?˜ì—??ê°€?¸ì˜¤ê¸?
const getJWTSecret = (c: any) => c.env.getJWTSecret(c) || 'dev-secret-only-change-in-production'

// PBKDF2 ë¹„ë?ë²ˆí˜¸ ?´ì‹± ?¨ìˆ˜ (salt ?¬í•¨)
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

// ë¹„ë?ë²ˆí˜¸ ê²€ì¦??¨ìˆ˜
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

// Haversine ê³µì‹?¼ë¡œ ê±°ë¦¬ ê³„ì‚° (km)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // ì§€êµ?ë°˜ì?ë¦?(km)
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// ê´€ë¦¬ì ê¶Œí•œ ì²´í¬ ë¯¸ë“¤?¨ì–´
async function requireAdmin(c: any, next: any) {
  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: '?¸ì¦???„ìš”?©ë‹ˆ?? }, 401)
  }

  const token = authHeader.substring(7)
  try {
    const payload = await verify(token, getJWTSecret(c)) as any as any

    const { DB } = c.env
    const user = await DB.prepare('SELECT role FROM users WHERE id = ?')
      .bind(payload.id).first() as any

    if (!user || user.role !== 'admin') {
      return c.json({ error: 'ê´€ë¦¬ì ê¶Œí•œ???„ìš”?©ë‹ˆ?? }, 403)
    }

    await next()
  } catch (error) {
    return c.json({ error: '?¸ì¦ ?¤íŒ¨' }, 401)
  }
}

// CORS ?¤ì • (?¹ì • ?„ë©”?¸ë§Œ ?ˆìš©)
app.use('/api/*', cors({
  origin: ['https://repoint.life', 'https://repoint-life.pages.dev', 'http://localhost:3000'],
  credentials: true
}))


// ==================== Authentication APIs ====================

// ?Œì›ê°€??app.post('/api/auth/signup', async (c) => {
  try {
    const { DB } = c.env
    const { email, password, name, phone } = await c.req.json()

    // ì¤‘ë³µ ì²´í¬
    const existing = await DB.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).bind(email).first()

    if (existing) {
      return c.json({ error: '?´ë? ì¡´ì¬?˜ëŠ” ?´ë©”?¼ì…?ˆë‹¤' }, 400)
    }

    // ë¹„ë?ë²ˆí˜¸ ?´ì‹±
    const hashedPassword = await hashPassword(password)

    // ?¬ìš©???ì„±
    const result = await DB.prepare(
      'INSERT INTO users (email, password, name, phone, points) VALUES (?, ?, ?, ?, ?)'
    ).bind(email, hashedPassword, name, phone, 1000).run()

    // ê°€???¬ì¸??ì§€ê¸?ê¸°ë¡
    await DB.prepare(
      'INSERT INTO points_history (user_id, amount, type, description) VALUES (?, ?, ?, ?)'
    ).bind(result.meta.last_row_id, 1000, 'signup', '?Œì›ê°€??ì¶•í•˜ ?¬ì¸??).run()

    // JWT ?ì„±
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
    return c.json({ error: '?Œì›ê°€???¤íŒ¨' }, 500)
  }
})

// ë¡œê·¸??app.post('/api/auth/login', async (c) => {
  try {
    const { DB } = c.env
    const { email, password } = await c.req.json()

    const user = await DB.prepare(
      'SELECT id, email, name, points, password FROM users WHERE email = ?'
    ).bind(email).first() as any

    if (!user) {
      return c.json({ error: '?´ë©”???ëŠ” ë¹„ë?ë²ˆí˜¸ê°€ ?¬ë°”ë¥´ì? ?ŠìŠµ?ˆë‹¤' }, 401)
    }

    // ë¹„ë?ë²ˆí˜¸ ê²€ì¦?    const isValid = await verifyPassword(password, user.password)
    if (!isValid) {
      return c.json({ error: '?´ë©”???ëŠ” ë¹„ë?ë²ˆí˜¸ê°€ ?¬ë°”ë¥´ì? ?ŠìŠµ?ˆë‹¤' }, 401)
    }

    // JWT ?ì„± (1??? íš¨)
    const token = await sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24?œê°„
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
    return c.json({ error: 'ë¡œê·¸???¤íŒ¨' }, 500)
  }
})

// ?„ì¬ ?¬ìš©???•ë³´
app.get('/api/auth/me', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: '?¸ì¦???„ìš”?©ë‹ˆ?? }, 401)
    }

    const token = authHeader.substring(7)
    const payload = await verify(token, getJWTSecret(c)) as any as any

    const { DB } = c.env
    const user = await DB.prepare(
      'SELECT id, email, name, phone, points FROM users WHERE id = ?'
    ).bind(payload.id).first() as any

    if (!user) {
      return c.json({ error: '?¬ìš©?ë? ì°¾ì„ ???†ìŠµ?ˆë‹¤' }, 404)
    }

    return c.json({ user })
  } catch (error) {
    return c.json({ error: '?¸ì¦ ?¤íŒ¨' }, 401)
  }
})

// ?„ë¡œ???…ë°?´íŠ¸
app.patch('/api/auth/me', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: '?¸ì¦???„ìš”?©ë‹ˆ?? }, 401)
    }

    const token = authHeader.substring(7)
    const payload = await verify(token, getJWTSecret(c)) as any as any

    const { DB } = c.env
    const { name, phone, password } = await c.req.json()

    // ?…ë°?´íŠ¸???„ë“œ ì¤€ë¹?    const updates: string[] = []
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
      return c.json({ error: '?…ë°?´íŠ¸???•ë³´ê°€ ?†ìŠµ?ˆë‹¤' }, 400)
    }

    // ?¬ìš©??ID ì¶”ê?
    values.push(payload.id)

    // SQL ì¿¼ë¦¬ ?¤í–‰
    await DB.prepare(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...values).run()

    // ?…ë°?´íŠ¸???¬ìš©???•ë³´ ë°˜í™˜
    const user = await DB.prepare(
      'SELECT id, email, name, phone, points FROM users WHERE id = ?'
    ).bind(payload.id).first() as any

    return c.json({ message: '?„ë¡œ?„ì´ ?…ë°?´íŠ¸?˜ì—ˆ?µë‹ˆ??, user })
  } catch (error) {
    return c.json({ error: '?„ë¡œ???…ë°?´íŠ¸ ?¤íŒ¨' }, 500)
  }
})

// ==================== Product APIs ====================

// ?í’ˆ ëª©ë¡ (ê²€?? ?„í„° ì§€??
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
    return c.json({ error: '?í’ˆ ëª©ë¡ ì¡°íšŒ ?¤íŒ¨' }, 500)
  }
})

// ?í’ˆ ?ì„¸ (?µì…˜, ?´ë?ì§€, ë¦¬ë·° ?¬í•¨)
app.get('/api/products/:id', async (c) => {
  try {
    const { DB } = c.env
    const id = c.req.param('id')

    const product = await DB.prepare(
      'SELECT * FROM products WHERE id = ?'
    ).bind(id).first()

    if (!product) {
      return c.json({ error: '?í’ˆ??ì°¾ì„ ???†ìŠµ?ˆë‹¤' }, 404)
    }

    // ?µì…˜ ì¡°íšŒ
    const { results: options } = await DB.prepare(
      'SELECT * FROM product_options WHERE product_id = ?'
    ).bind(id).all()

    // ?´ë?ì§€ ì¡°íšŒ
    const { results: images } = await DB.prepare(
      'SELECT * FROM product_images WHERE product_id = ? ORDER BY display_order ASC'
    ).bind(id).all()

    // ë¦¬ë·° ?µê³„
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
    return c.json({ error: '?í’ˆ ì¡°íšŒ ?¤íŒ¨' }, 500)
  }
})

// ==================== Store APIs ====================

// ë§¤ì¥ ëª©ë¡
app.get('/api/stores', async (c) => {
  try {
    const { DB } = c.env
    const { results } = await DB.prepare(
      'SELECT * FROM stores ORDER BY rating DESC'
    ).all()

    return c.json({ stores: results })
  } catch (error) {
    return c.json({ error: 'ë§¤ì¥ ëª©ë¡ ì¡°íšŒ ?¤íŒ¨' }, 500)
  }
})

// ë§¤ì¥ ?ì„¸
app.get('/api/stores/:id', async (c) => {
  try {
    const { DB } = c.env
    const id = c.req.param('id')

    const store = await DB.prepare(
      'SELECT * FROM stores WHERE id = ?'
    ).bind(id).first()

    if (!store) {
      return c.json({ error: 'ë§¤ì¥??ì°¾ì„ ???†ìŠµ?ˆë‹¤' }, 404)
    }

    return c.json({ store })
  } catch (error) {
    return c.json({ error: 'ë§¤ì¥ ì¡°íšŒ ?¤íŒ¨' }, 500)
  }
})

// ==================== Cart APIs ====================

// ?¥ë°”êµ¬ë‹ˆ ì¡°íšŒ
app.get('/api/cart', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader) {
      return c.json({ error: '?¸ì¦???„ìš”?©ë‹ˆ?? }, 401)
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
    return c.json({ error: '?¥ë°”êµ¬ë‹ˆ ì¡°íšŒ ?¤íŒ¨' }, 500)
  }
})

// ?¥ë°”êµ¬ë‹ˆ ì¶”ê?
app.post('/api/cart', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader) {
      return c.json({ error: '?¸ì¦???„ìš”?©ë‹ˆ?? }, 401)
    }

    const token = authHeader.substring(7)
    const payload = await verify(token, getJWTSecret(c)) as any as any

    const { DB } = c.env
    const { product_id, quantity } = await c.req.json()

    // ?´ë? ?ˆëŠ”ì§€ ?•ì¸
    const existing = await DB.prepare(
      'SELECT id, quantity FROM cart WHERE user_id = ? AND product_id = ?'
    ).bind(payload.id, product_id).first() as any

    if (existing) {
      // ?˜ëŸ‰ ?…ë°?´íŠ¸
      await DB.prepare(
        'UPDATE cart SET quantity = quantity + ? WHERE id = ?'
      ).bind(quantity || 1, existing.id).run()
    } else {
      // ?ˆë¡œ ì¶”ê?
      await DB.prepare(
        'INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)'
      ).bind(payload.id, product_id, quantity || 1).run()
    }

    return c.json({ message: '?¥ë°”êµ¬ë‹ˆ??ì¶”ê??˜ì—ˆ?µë‹ˆ?? })
  } catch (error) {
    return c.json({ error: '?¥ë°”êµ¬ë‹ˆ ì¶”ê? ?¤íŒ¨' }, 500)
  }
})

// ?¥ë°”êµ¬ë‹ˆ ?˜ëŸ‰ ?…ë°?´íŠ¸
app.patch('/api/cart/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader) {
      return c.json({ error: '?¸ì¦???„ìš”?©ë‹ˆ?? }, 401)
    }

    const token = authHeader.substring(7)
    const payload = await verify(token, getJWTSecret(c)) as any as any

    const { DB } = c.env
    const id = c.req.param('id')
    const { quantity } = await c.req.json()

    if (quantity < 1) {
      return c.json({ error: '?˜ëŸ‰?€ 1ê°??´ìƒ?´ì–´???©ë‹ˆ?? }, 400)
    }

    await DB.prepare(
      'UPDATE cart SET quantity = ? WHERE id = ? AND user_id = ?'
    ).bind(quantity, id, payload.id).run()

    return c.json({ message: '?˜ëŸ‰??ë³€ê²½ë˜?ˆìŠµ?ˆë‹¤' })
  } catch (error) {
    return c.json({ error: '?˜ëŸ‰ ë³€ê²??¤íŒ¨' }, 500)
  }
})

// ?¥ë°”êµ¬ë‹ˆ ?? œ
app.delete('/api/cart/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader) {
      return c.json({ error: '?¸ì¦???„ìš”?©ë‹ˆ?? }, 401)
    }

    const token = authHeader.substring(7)
    const payload = await verify(token, getJWTSecret(c)) as any as any

    const { DB } = c.env
    const id = c.req.param('id')

    await DB.prepare(
      'DELETE FROM cart WHERE id = ? AND user_id = ?'
    ).bind(id, payload.id).run()

    return c.json({ message: '?¥ë°”êµ¬ë‹ˆ?ì„œ ?? œ?˜ì—ˆ?µë‹ˆ?? })
  } catch (error) {
    return c.json({ error: '?¥ë°”êµ¬ë‹ˆ ?? œ ?¤íŒ¨' }, 500)
  }
})

// ==================== Order APIs ====================

// ì£¼ë¬¸ ?ì„±
app.post('/api/orders', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader) {
      return c.json({ error: '?¸ì¦???„ìš”?©ë‹ˆ?? }, 401)
    }

    const token = authHeader.substring(7)
    const payload = await verify(token, getJWTSecret(c)) as any as any

    const { DB } = c.env
    const { product_id, store_id, order_type, points_used } = await c.req.json()

    // ?í’ˆ ?•ë³´ ê°€?¸ì˜¤ê¸?    let total_price = 0
    let points_earned = 0

    if (product_id) {
      const product = await DB.prepare(
        'SELECT price, points_rate FROM products WHERE id = ?'
      ).bind(product_id).first() as any

      total_price = product.price
      points_earned = Math.floor(product.price * product.points_rate / 100)
    }

    // ?¬ì¸??ì°¨ê°
    if (points_used > 0) {
      await DB.prepare(
        'UPDATE users SET points = points - ? WHERE id = ?'
      ).bind(points_used, payload.id).run()

      await DB.prepare(
        'INSERT INTO points_history (user_id, amount, type, description) VALUES (?, ?, ?, ?)'
      ).bind(payload.id, -points_used, 'use', 'ì£¼ë¬¸ ???¬ì¸???¬ìš©').run()
    }

    // ì£¼ë¬¸ ?ì„±
    const result = await DB.prepare(`
      INSERT INTO orders (user_id, product_id, store_id, order_type, total_price, points_used, points_earned, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(payload.id, product_id || null, store_id || null, order_type, total_price, points_used || 0, points_earned, 'completed').run()

    // ?¬ì¸???ë¦½
    await DB.prepare(
      'UPDATE users SET points = points + ? WHERE id = ?'
    ).bind(points_earned, payload.id).run()

    await DB.prepare(
      'INSERT INTO points_history (user_id, amount, type, description) VALUES (?, ?, ?, ?)'
    ).bind(payload.id, points_earned, 'purchase', '?í’ˆ êµ¬ë§¤ ?ë¦½').run()

    // ?¥ë°”êµ¬ë‹ˆ ë¹„ìš°ê¸?(product_idê°€ ?ˆëŠ” ê²½ìš°)
    if (product_id) {
      await DB.prepare(
        'DELETE FROM cart WHERE user_id = ? AND product_id = ?'
      ).bind(payload.id, product_id).run()
    }

    return c.json({
      order_id: result.meta.last_row_id,
      message: 'ì£¼ë¬¸???„ë£Œ?˜ì—ˆ?µë‹ˆ??,
      points_earned
    })
  } catch (error) {
    return c.json({ error: 'ì£¼ë¬¸ ì²˜ë¦¬ ?¤íŒ¨' }, 500)
  }
})

// ì£¼ë¬¸ ëª©ë¡
app.get('/api/orders', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader) {
      return c.json({ error: '?¸ì¦???„ìš”?©ë‹ˆ?? }, 401)
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
    return c.json({ error: 'ì£¼ë¬¸ ëª©ë¡ ì¡°íšŒ ?¤íŒ¨' }, 500)
  }
})

// ==================== Points APIs ====================

// ?¬ì¸???´ì—­
app.get('/api/points/history', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader) {
      return c.json({ error: '?¸ì¦???„ìš”?©ë‹ˆ?? }, 401)
    }

    const token = authHeader.substring(7)
    const payload = await verify(token, getJWTSecret(c)) as any as any

    const { DB } = c.env
    const { results } = await DB.prepare(
      'SELECT * FROM points_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 50'
    ).bind(payload.id).all()

    return c.json({ history: results })
  } catch (error) {
    return c.json({ error: '?¬ì¸???´ì—­ ì¡°íšŒ ?¤íŒ¨' }, 500)
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

// ?í’ˆ ë¦¬ë·° ëª©ë¡ ì¡°íšŒ
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
    return c.json({ error: 'ë¦¬ë·° ì¡°íšŒ ?¤íŒ¨' }, 500)
  }
})

// ë¦¬ë·° ?‘ì„±
app.post('/api/reviews', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader) {
      return c.json({ error: '?¸ì¦???„ìš”?©ë‹ˆ?? }, 401)
    }

    const token = authHeader.substring(7)
    const payload = await verify(token, getJWTSecret(c)) as any as any

    const { DB } = c.env
    const { product_id, order_id, rating, title, content, images } = await c.req.json()

    // ë¦¬ë·° ?ì„±
    const result = await DB.prepare(`
      INSERT INTO reviews (user_id, product_id, order_id, rating, title, content)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(payload.id, product_id, order_id || null, rating, title, content).run()

    // ?´ë?ì§€ê°€ ?ˆìœ¼ë©?ì¶”ê?
    if (images && images.length > 0) {
      for (const imageUrl of images) {
        await DB.prepare(`
          INSERT INTO review_images (review_id, image_url) VALUES (?, ?)
        `).bind(result.meta.last_row_id, imageUrl).run()
      }
    }

    return c.json({
      message: 'ë¦¬ë·°ê°€ ?±ë¡?˜ì—ˆ?µë‹ˆ??,
      review_id: result.meta.last_row_id
    })
  } catch (error) {
    return c.json({ error: 'ë¦¬ë·° ?‘ì„± ?¤íŒ¨' }, 500)
  }
})

// ë¦¬ë·° ?˜ì •
app.patch('/api/reviews/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader) {
      return c.json({ error: '?¸ì¦???„ìš”?©ë‹ˆ?? }, 401)
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

    return c.json({ message: 'ë¦¬ë·°ê°€ ?˜ì •?˜ì—ˆ?µë‹ˆ?? })
  } catch (error) {
    return c.json({ error: 'ë¦¬ë·° ?˜ì • ?¤íŒ¨' }, 500)
  }
})

// ë¦¬ë·° ?? œ
app.delete('/api/reviews/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader) {
      return c.json({ error: '?¸ì¦???„ìš”?©ë‹ˆ?? }, 401)
    }

    const token = authHeader.substring(7)
    const payload = await verify(token, getJWTSecret(c)) as any as any

    const { DB } = c.env
    const reviewId = c.req.param('id')

    await DB.prepare('DELETE FROM reviews WHERE id = ? AND user_id = ?')
      .bind(reviewId, payload.id).run()

    return c.json({ message: 'ë¦¬ë·°ê°€ ?? œ?˜ì—ˆ?µë‹ˆ?? })
  } catch (error) {
    return c.json({ error: 'ë¦¬ë·° ?? œ ?¤íŒ¨' }, 500)
  }
})

// ==================== Product Options APIs ====================

// ?í’ˆ ?µì…˜ ì¡°íšŒ
app.get('/api/products/:id/options', async (c) => {
  try {
    const { DB } = c.env
    const productId = c.req.param('id')

    const { results } = await DB.prepare(
      'SELECT * FROM product_options WHERE product_id = ?'
    ).bind(productId).all()

    return c.json({ options: results })
  } catch (error) {
    return c.json({ error: '?µì…˜ ì¡°íšŒ ?¤íŒ¨' }, 500)
  }
})

// ==================== Product Images APIs ====================

// ?í’ˆ ?´ë?ì§€ ì¡°íšŒ
app.get('/api/products/:id/images', async (c) => {
  try {
    const { DB } = c.env
    const productId = c.req.param('id')

    const { results } = await DB.prepare(
      'SELECT * FROM product_images WHERE product_id = ? ORDER BY display_order ASC'
    ).bind(productId).all()

    return c.json({ images: results })
  } catch (error) {
    return c.json({ error: '?´ë?ì§€ ì¡°íšŒ ?¤íŒ¨' }, 500)
  }
})

// ==================== Referral APIs ====================

// ì¶”ì²œ??ì½”ë“œ ?ì„± (?ë™)
async function generateReferralCode(userId: number): Promise<string> {
  return `REF${userId}${Date.now().toString(36).toUpperCase()}`
}

// ??ì¶”ì²œ??ì½”ë“œ ì¡°íšŒ
app.get('/api/referral/code', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader) {
      return c.json({ error: '?¸ì¦???„ìš”?©ë‹ˆ?? }, 401)
    }

    const token = authHeader.substring(7)
    const payload = await verify(token, getJWTSecret(c)) as any as any

    const { DB } = c.env
    const user = await DB.prepare(
      'SELECT referral_code FROM users WHERE id = ?'
    ).bind(payload.id).first() as any

    let referralCode = user.referral_code

    // ì½”ë“œê°€ ?†ìœ¼ë©??ì„±
    if (!referralCode) {
      referralCode = await generateReferralCode(payload.id)
      await DB.prepare(
        'UPDATE users SET referral_code = ? WHERE id = ?'
      ).bind(referralCode, payload.id).run()
    }

    return c.json({ referral_code: referralCode })
  } catch (error) {
    return c.json({ error: 'ì¶”ì²œ??ì½”ë“œ ì¡°íšŒ ?¤íŒ¨' }, 500)
  }
})

// ì¶”ì²œ??ì½”ë“œë¡?ê°€??app.post('/api/referral/apply', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader) {
      return c.json({ error: '?¸ì¦???„ìš”?©ë‹ˆ?? }, 401)
    }

    const token = authHeader.substring(7)
    const payload = await verify(token, getJWTSecret(c)) as any as any

    const { DB } = c.env
    const { referral_code } = await c.req.json()

    // ì¶”ì²œ??ì°¾ê¸°
    const referrer = await DB.prepare(
      'SELECT id FROM users WHERE referral_code = ?'
    ).bind(referral_code).first() as any

    if (!referrer) {
      return c.json({ error: '?¬ë°”ë¥´ì? ?Šì? ì¶”ì²œ??ì½”ë“œ?…ë‹ˆ?? }, 404)
    }

    if (referrer.id === payload.id) {
      return c.json({ error: '?ì‹ ??ì¶”ì²œ??ì½”ë“œ???¬ìš©?????†ìŠµ?ˆë‹¤' }, 400)
    }

    // ?´ë? ì¶”ì²œ?¸ì´ ?ˆëŠ”ì§€ ?•ì¸
    const existing = await DB.prepare(
      'SELECT id FROM users WHERE id = ? AND referred_by IS NOT NULL'
    ).bind(payload.id).first()

    if (existing) {
      return c.json({ error: '?´ë? ì¶”ì²œ?¸ì´ ?±ë¡?˜ì–´ ?ˆìŠµ?ˆë‹¤' }, 400)
    }

    // ì¶”ì²œ???±ë¡
    await DB.prepare(
      'UPDATE users SET referred_by = ? WHERE id = ?'
    ).bind(referrer.id, payload.id).run()

    // ì¶”ì²œ?¸ì—ê²?ë³´ë„ˆ??ì§€ê¸?    const bonusPoints = 1000
    await DB.prepare(
      'UPDATE users SET points = points + ? WHERE id = ?'
    ).bind(bonusPoints, referrer.id).run()

    await DB.prepare(
      'INSERT INTO points_history (user_id, amount, type, description) VALUES (?, ?, ?, ?)'
    ).bind(referrer.id, bonusPoints, 'referral', 'ì¹œêµ¬ ì´ˆë? ë³´ë„ˆ??).run()

    // ?¼ì¶”ì²œì¸?ê²Œ??ë³´ë„ˆ??ì§€ê¸?    await DB.prepare(
      'UPDATE users SET points = points + ? WHERE id = ?'
    ).bind(500, payload.id).run()

    await DB.prepare(
      'INSERT INTO points_history (user_id, amount, type, description) VALUES (?, ?, ?, ?)'
    ).bind(payload.id, 500, 'referral', 'ì¶”ì²œ??ê°€??ë³´ë„ˆ??).run()

    // ì¶”ì²œ ê¸°ë¡
    await DB.prepare(`
      INSERT INTO referrals (referrer_id, referee_id, referral_code, bonus_points, status)
      VALUES (?, ?, ?, ?, ?)
    `).bind(referrer.id, payload.id, referral_code, bonusPoints, 'completed').run()

    return c.json({
      message: 'ì¶”ì²œ?¸ì´ ?±ë¡?˜ì—ˆ?µë‹ˆ??,
      bonus_points: 500
    })
  } catch (error) {
    return c.json({ error: 'ì¶”ì²œ???±ë¡ ?¤íŒ¨' }, 500)
  }
})

// ??ì¶”ì²œ??ëª©ë¡
app.get('/api/referral/list', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader) {
      return c.json({ error: '?¸ì¦???„ìš”?©ë‹ˆ?? }, 401)
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
    return c.json({ error: 'ì¶”ì²œ??ëª©ë¡ ì¡°íšŒ ?¤íŒ¨' }, 500)
  }
})

// ==================== Shipping Info APIs ====================

// ë°°ì†¡ ?•ë³´ ì¶”ê?
app.post('/api/shipping', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader) {
      return c.json({ error: '?¸ì¦???„ìš”?©ë‹ˆ?? }, 401)
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
      message: 'ë°°ì†¡ ?•ë³´ê°€ ?±ë¡?˜ì—ˆ?µë‹ˆ??,
      shipping_id: result.meta.last_row_id
    })
  } catch (error) {
    return c.json({ error: 'ë°°ì†¡ ?•ë³´ ?±ë¡ ?¤íŒ¨' }, 500)
  }
})

// ë°°ì†¡ ?•ë³´ ì¡°íšŒ
app.get('/api/orders/:id/shipping', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader) {
      return c.json({ error: '?¸ì¦???„ìš”?©ë‹ˆ?? }, 401)
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
    return c.json({ error: 'ë°°ì†¡ ?•ë³´ ì¡°íšŒ ?¤íŒ¨' }, 500)
  }
})

// ==================== Admin APIs ====================

// ê´€ë¦¬ì - ?„ì²´ ?¬ìš©??ì¡°íšŒ
app.get('/api/admin/users', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader) {
      return c.json({ error: '?¸ì¦???„ìš”?©ë‹ˆ?? }, 401)
    }

    // ê°„ë‹¨???¸ì¦ (?¤ì œë¡œëŠ” role ê¸°ë°˜ ?¸ì¦ ?„ìš”)
    const token = authHeader.substring(7)
    await verify(token, getJWTSecret(c)) as any

    const { DB } = c.env
    const { results } = await DB.prepare(
      'SELECT id, email, name, phone, points, created_at FROM users ORDER BY created_at DESC'
    ).all()

    return c.json({ users: results })
  } catch (error) {
    return c.json({ error: '?¬ìš©??ëª©ë¡ ì¡°íšŒ ?¤íŒ¨' }, 500)
  }
})

// ê´€ë¦¬ì - ?„ì²´ ì£¼ë¬¸ ì¡°íšŒ
app.get('/api/admin/orders', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader) {
      return c.json({ error: '?¸ì¦???„ìš”?©ë‹ˆ?? }, 401)
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
    return c.json({ error: 'ì£¼ë¬¸ ëª©ë¡ ì¡°íšŒ ?¤íŒ¨' }, 500)
  }
})

// ê´€ë¦¬ì - ?í’ˆ ì¶”ê?
app.post('/api/admin/products', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader) {
      return c.json({ error: '?¸ì¦???„ìš”?©ë‹ˆ?? }, 401)
    }

    const token = authHeader.substring(7)
    await verify(token, getJWTSecret(c)) as any

    const { DB } = c.env
    const {
      name, description, price, points_rate, stock, category, image_url,
      product_type, supplier, external_url, images, options
    } = await c.req.json()

    // ?í’ˆ ì¶”ê?
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

    // ì¶”ê? ?´ë?ì§€ê°€ ?ˆìœ¼ë©??€??    if (images && images.length > 0) {
      for (let i = 0; i < images.length; i++) {
        await DB.prepare(`
          INSERT INTO product_images (product_id, image_url, display_order, is_primary)
          VALUES (?, ?, ?, ?)
        `).bind(productId, images[i], i, i === 0 ? 1 : 0).run()
      }
    }

    // ?µì…˜???ˆìœ¼ë©??€??    if (options && options.length > 0) {
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
      message: '?í’ˆ??ì¶”ê??˜ì—ˆ?µë‹ˆ??,
      id: productId
    })
  } catch (error) {
    return c.json({ error: '?í’ˆ ì¶”ê? ?¤íŒ¨' }, 500)
  }
})

// ê´€ë¦¬ì - ?í’ˆ ?˜ì •
app.patch('/api/admin/products/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader) {
      return c.json({ error: '?¸ì¦???„ìš”?©ë‹ˆ?? }, 401)
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

    return c.json({ message: '?í’ˆ???˜ì •?˜ì—ˆ?µë‹ˆ?? })
  } catch (error) {
    return c.json({ error: '?í’ˆ ?˜ì • ?¤íŒ¨' }, 500)
  }
})

// ê´€ë¦¬ì - ?í’ˆ ?? œ
app.delete('/api/admin/products/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader) {
      return c.json({ error: '?¸ì¦???„ìš”?©ë‹ˆ?? }, 401)
    }

    const token = authHeader.substring(7)
    await verify(token, getJWTSecret(c)) as any

    const { DB } = c.env
    const id = c.req.param('id')

    await DB.prepare('DELETE FROM products WHERE id = ?').bind(id).run()

    return c.json({ message: '?í’ˆ???? œ?˜ì—ˆ?µë‹ˆ?? })
  } catch (error) {
    return c.json({ error: '?í’ˆ ?? œ ?¤íŒ¨' }, 500)
  }
})

// ê´€ë¦¬ì - ì£¼ë¬¸ ?íƒœ ë³€ê²?app.patch('/api/admin/orders/:id/status', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader) {
      return c.json({ error: '?¸ì¦???„ìš”?©ë‹ˆ?? }, 401)
    }

    const token = authHeader.substring(7)
    await verify(token, getJWTSecret(c)) as any

    const { DB } = c.env
    const orderId = c.req.param('id')
    const { status, tracking_number, carrier } = await c.req.json()

    // ì£¼ë¬¸ ?íƒœ ?…ë°?´íŠ¸
    await DB.prepare(
      'UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(status, orderId).run()

    // ë°°ì†¡ ?•ë³´ê°€ ?ˆìœ¼ë©??…ë°?´íŠ¸
    if (tracking_number || carrier) {
      await DB.prepare(`
        UPDATE shipping_info 
        SET tracking_number = ?, carrier = ?, shipping_status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE order_id = ?
      `).bind(tracking_number || '', carrier || '', status, orderId).run()
    }

    return c.json({ message: 'ì£¼ë¬¸ ?íƒœê°€ ë³€ê²½ë˜?ˆìŠµ?ˆë‹¤' })
  } catch (error) {
    return c.json({ error: 'ì£¼ë¬¸ ?íƒœ ë³€ê²??¤íŒ¨' }, 500)
  }
})

// ê´€ë¦¬ì - ë§¤ì¥ ì¶”ê?
app.post('/api/admin/stores', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader) {
      return c.json({ error: '?¸ì¦???„ìš”?©ë‹ˆ?? }, 401)
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
      message: 'ë§¤ì¥??ì¶”ê??˜ì—ˆ?µë‹ˆ??,
      id: result.meta.last_row_id
    })
  } catch (error) {
    return c.json({ error: 'ë§¤ì¥ ì¶”ê? ?¤íŒ¨' }, 500)
  }
})

// ê´€ë¦¬ì - ë§¤ì¥ ?˜ì •
app.patch('/api/admin/stores/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader) {
      return c.json({ error: '?¸ì¦???„ìš”?©ë‹ˆ?? }, 401)
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

    return c.json({ message: 'ë§¤ì¥???˜ì •?˜ì—ˆ?µë‹ˆ?? })
  } catch (error) {
    return c.json({ error: 'ë§¤ì¥ ?˜ì • ?¤íŒ¨' }, 500)
  }
})

// ê´€ë¦¬ì - ë§¤ì¥ ?? œ
app.delete('/api/admin/stores/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader) {
      return c.json({ error: '?¸ì¦???„ìš”?©ë‹ˆ?? }, 401)
    }

    const token = authHeader.substring(7)
    await verify(token, getJWTSecret(c)) as any

    const { DB } = c.env
    const id = c.req.param('id')

    await DB.prepare('DELETE FROM stores WHERE id = ?').bind(id).run()

    return c.json({ message: 'ë§¤ì¥???? œ?˜ì—ˆ?µë‹ˆ?? })
  } catch (error) {
    return c.json({ error: 'ë§¤ì¥ ?? œ ?¤íŒ¨' }, 500)
  }
})

// Catch-all: ?˜ë¨¸ì§€ ê²½ë¡œ??Pages?ì„œ ì²˜ë¦¬?˜ë„ë¡??µê³¼
app.all('*', () => {
  // 404ë¥?ë°˜í™˜?˜ë©´ Pagesê°€ static ?Œì¼??ì°¾ìŒ
  return new Response(null, { status: 404 })
})

export default app
