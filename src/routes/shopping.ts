// AI 쇼핑 큐레이션 API
// AI Shopping Curation System

import { Hono } from 'hono';

const shopping = new Hono();

// 메인 대시보드 - 통합 상품 목록
shopping.get('/dashboard', async (c) => {
    const db = c.env.DB;
    const { category, type } = c.req.query();

    try {
        // 1. 제휴 상품 (해외/국내 인기 상품)
        let affiliateQuery = `
      SELECT 
        'affiliate' as product_type,
        id,
        title,
        description,
        price,
        currency,
        image_url,
        affiliate_url,
        source_platform,
        source_country,
        ai_score,
        popularity_score
      FROM affiliate_products
      WHERE status = 'active'
    `;
        const affiliateParams: any[] = [];

        if (category) {
            affiliateQuery += ' AND category = ?';
            affiliateParams.push(category);
        }

        if (type === 'overseas') {
            affiliateQuery += ` AND source_platform IN (
        SELECT platform_name FROM affiliate_platforms WHERE platform_type = 'overseas'
      )`;
        } else if (type === 'domestic') {
            affiliateQuery += ` AND source_platform IN (
        SELECT platform_name FROM affiliate_platforms WHERE platform_type = 'domestic'
      )`;
        }

        affiliateQuery += ' ORDER BY ai_score DESC, popularity_score DESC LIMIT 20';

        const affiliateProducts = await db.prepare(affiliateQuery).bind(...affiliateParams).all();

        // 2. 자사 제품
        let internalQuery = `
      SELECT 
        'internal' as product_type,
        id,
        name as title,
        description,
        price,
        'KRW' as currency,
        image_url,
        NULL as affiliate_url,
        'REPOINT' as source_platform,
        'KR' as source_country,
        0 as ai_score,
        0 as popularity_score
      FROM products
      WHERE product_type = 'internal'
    `;
        const internalParams: any[] = [];

        if (category) {
            internalQuery += ' AND category = ?';
            internalParams.push(category);
        }

        internalQuery += ' ORDER BY created_at DESC LIMIT 10';

        const internalProducts = await db.prepare(internalQuery).bind(...internalParams).all();

        // 3. 가맹점 제품
        let merchantQuery = `
      SELECT 
        'merchant' as product_type,
        p.id,
        p.name as title,
        p.description,
        p.price,
        'KRW' as currency,
        p.image_url,
        NULL as affiliate_url,
        m.business_name as source_platform,
        'KR' as source_country,
        m.ai_score,
        0 as popularity_score
      FROM products p
      JOIN merchants m ON m.id = p.supplier
      WHERE p.product_type = 'merchant'
    `;
        const merchantParams: any[] = [];

        if (category) {
            merchantQuery += ' AND p.category = ?';
            merchantParams.push(category);
        }

        merchantQuery += ' ORDER BY m.ai_score DESC LIMIT 10';

        const merchantProducts = await db.prepare(merchantQuery).bind(...merchantParams).all();

        // 통합 결과
        const allProducts = [
            ...(affiliateProducts.results || []),
            ...(internalProducts.results || []),
            ...(merchantProducts.results || []),
        ];

        return c.json({
            products: allProducts,
            counts: {
                affiliate: affiliateProducts.results?.length || 0,
                internal: internalProducts.results?.length || 0,
                merchant: merchantProducts.results?.length || 0,
                total: allProducts.length,
            },
        });
    } catch (error: any) {
        return c.json({ error: '조회 중 오류 발생: ' + error.message }, 500);
    }
});

// 제휴 상품 목록 (해외/국내 인기 상품)
shopping.get('/affiliate', async (c) => {
    const db = c.env.DB;
    const { platform, country, category, type } = c.req.query();

    try {
        let query = 'SELECT * FROM affiliate_products WHERE status = \'active\'';
        const params: any[] = [];

        if (platform) {
            query += ' AND source_platform = ?';
            params.push(platform);
        }

        if (country) {
            query += ' AND source_country = ?';
            params.push(country);
        }

        if (category) {
            query += ' AND category = ?';
            params.push(category);
        }

        if (type === 'overseas') {
            query += ` AND source_platform IN (
        SELECT platform_name FROM affiliate_platforms WHERE platform_type = 'overseas'
      )`;
        } else if (type === 'domestic') {
            query += ` AND source_platform IN (
        SELECT platform_name FROM affiliate_platforms WHERE platform_type = 'domestic'
      )`;
        }

        query += ' ORDER BY ai_score DESC, popularity_score DESC LIMIT 50';

        const result = await db.prepare(query).bind(...params).all();

        return c.json({
            products: result.results || [],
        });
    } catch (error: any) {
        return c.json({ error: '조회 중 오류 발생: ' + error.message }, 500);
    }
});

// 제휴 상품 클릭 추적
shopping.post('/affiliate/:product_id/click', async (c) => {
    const user = c.get('user');
    const db = c.env.DB;
    const productId = c.req.param('product_id');

    try {
        // 클릭 기록
        await db
            .prepare(`
        INSERT INTO affiliate_clicks (user_id, affiliate_product_id)
        VALUES (?, ?)
      `)
            .bind(user?.id || null, productId)
            .run();

        // 클릭 수 증가
        await db
            .prepare('UPDATE affiliate_products SET click_count = click_count + 1 WHERE id = ?')
            .bind(productId)
            .run();

        // 제휴 URL 반환
        const product = await db
            .prepare('SELECT affiliate_url FROM affiliate_products WHERE id = ?')
            .bind(productId)
            .first();

        return c.json({
            success: true,
            affiliate_url: product?.affiliate_url,
        });
    } catch (error: any) {
        return c.json({ error: '처리 중 오류 발생: ' + error.message }, 500);
    }
});

// 제휴 플랫폼 목록
shopping.get('/platforms', async (c) => {
    const db = c.env.DB;
    const { type } = c.req.query();

    try {
        let query = 'SELECT * FROM affiliate_platforms WHERE is_active = 1';
        const params: any[] = [];

        if (type) {
            query += ' AND platform_type = ?';
            params.push(type);
        }

        query += ' ORDER BY platform_name';

        const result = await db.prepare(query).bind(...params).all();

        return c.json({
            platforms: result.results || [],
        });
    } catch (error: any) {
        return c.json({ error: '조회 중 오류 발생: ' + error.message }, 500);
    }
});

// AI 상품 추천 (트렌드 기반)
shopping.get('/trending', async (c) => {
    const db = c.env.DB;
    const { limit = '20' } = c.req.query();

    try {
        const result = await db
            .prepare(`
        SELECT * FROM affiliate_products
        WHERE status = 'active'
        ORDER BY trend_score DESC, ai_score DESC
        LIMIT ?
      `)
            .bind(parseInt(limit))
            .all();

        return c.json({
            trending_products: result.results || [],
        });
    } catch (error: any) {
        return c.json({ error: '조회 중 오류 발생: ' + error.message }, 500);
    }
});

// 가맹점 상품 등록
shopping.post('/merchant/products', async (c) => {
    const user = c.get('user');
    const db = c.env.DB;

    const {
        name,
        description,
        price,
        category,
        image_url,
        stock,
    } = await c.req.json();

    try {
        // 가맹점 확인
        const merchant = await db
            .prepare('SELECT * FROM merchants WHERE user_id = ?')
            .bind(user.id)
            .first();

        if (!merchant) {
            return c.json({ error: '가맹점 권한이 필요합니다' }, 403);
        }

        // 상품 등록
        const result = await db
            .prepare(`
        INSERT INTO products (
          name, description, price, category,
          image_url, stock, product_type, supplier
        ) VALUES (?, ?, ?, ?, ?, ?, 'merchant', ?)
      `)
            .bind(name, description, price, category, image_url, stock, merchant.id)
            .run();

        return c.json({
            success: true,
            message: '상품이 등록되었습니다',
            product_id: result.meta.last_row_id,
        });
    } catch (error: any) {
        return c.json({ error: '등록 중 오류 발생: ' + error.message }, 500);
    }
});

// 가맹점 상품 목록
shopping.get('/merchant/products', async (c) => {
    const user = c.get('user');
    const db = c.env.DB;

    try {
        // 가맹점 확인
        const merchant = await db
            .prepare('SELECT * FROM merchants WHERE user_id = ?')
            .bind(user.id)
            .first();

        if (!merchant) {
            return c.json({ error: '가맹점 권한이 필요합니다' }, 403);
        }

        // 상품 목록
        const result = await db
            .prepare(`
        SELECT * FROM products
        WHERE product_type = 'merchant' AND supplier = ?
        ORDER BY created_at DESC
      `)
            .bind(merchant.id)
            .all();

        return c.json({
            products: result.results || [],
        });
    } catch (error: any) {
        return c.json({ error: '조회 중 오류 발생: ' + error.message }, 500);
    }
});

export default shopping;
