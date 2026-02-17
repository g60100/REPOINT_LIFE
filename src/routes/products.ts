// 쇼핑몰 상품 관리 API
// E-commerce product management

import { Hono } from 'hono';

const products = new Hono();

// 상품 목록 조회
products.get('/', async (c) => {
    const db = c.env.DB;
    const { category, search, limit = '20', offset = '0' } = c.req.query();

    try {
        let query = 'SELECT * FROM products WHERE 1=1';
        const params: any[] = [];

        if (category) {
            query += ' AND category = ?';
            params.push(category);
        }

        if (search) {
            query += ' AND (name LIKE ? OR description LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const result = await db.prepare(query).bind(...params).all();

        return c.json({
            products: result.results || [],
            total: result.results?.length || 0,
        });
    } catch (error: any) {
        return c.json({ error: '조회 중 오류 발생: ' + error.message }, 500);
    }
});

// 상품 상세 조회
products.get('/:id', async (c) => {
    const db = c.env.DB;
    const productId = c.req.param('id');

    try {
        const product = await db
            .prepare('SELECT * FROM products WHERE id = ?')
            .bind(productId)
            .first();

        if (!product) {
            return c.json({ error: '상품을 찾을 수 없습니다' }, 404);
        }

        // 상품 이미지 조회
        const images = await db
            .prepare('SELECT * FROM product_images WHERE product_id = ? ORDER BY display_order')
            .bind(productId)
            .all();

        // 상품 옵션 조회
        const options = await db
            .prepare('SELECT * FROM product_options WHERE product_id = ?')
            .bind(productId)
            .all();

        // 리뷰 통계
        const reviewStats = await db
            .prepare(`
        SELECT 
          COUNT(*) as review_count,
          AVG(rating) as avg_rating
        FROM reviews
        WHERE product_id = ?
      `)
            .bind(productId)
            .first();

        return c.json({
            product: {
                ...product,
                images: images.results || [],
                options: options.results || [],
                review_count: reviewStats?.review_count || 0,
                avg_rating: reviewStats?.avg_rating || 0,
            },
        });
    } catch (error: any) {
        return c.json({ error: '조회 중 오류 발생: ' + error.message }, 500);
    }
});

// 상품 리뷰 조회
products.get('/:id/reviews', async (c) => {
    const db = c.env.DB;
    const productId = c.req.param('id');

    try {
        const result = await db
            .prepare(`
        SELECT 
          r.*,
          u.name as user_name
        FROM reviews r
        JOIN users u ON u.id = r.user_id
        WHERE r.product_id = ?
        ORDER BY r.created_at DESC
        LIMIT 50
      `)
            .bind(productId)
            .all();

        return c.json({
            reviews: result.results || [],
        });
    } catch (error: any) {
        return c.json({ error: '조회 중 오류 발생: ' + error.message }, 500);
    }
});

export default products;
