// 가맹점 평가 및 체크인 시스템
// Merchant review and check-in system

import { Hono } from 'hono';

const merchants = new Hono();

// 가맹점 체크인
merchants.post('/:merchant_id/checkin', async (c) => {
    const user = c.get('user');
    const db = c.env.DB;
    const merchantId = c.req.param('merchant_id');

    const { latitude, longitude } = await c.req.json();

    try {
        // 가맹점 정보 조회
        const merchant = await db
            .prepare('SELECT * FROM merchants WHERE id = ?')
            .bind(merchantId)
            .first();

        if (!merchant) {
            return c.json({ error: '가맹점을 찾을 수 없습니다' }, 404);
        }

        // 거리 계산 (간단한 버전)
        const distance = Math.sqrt(
            Math.pow(merchant.latitude - latitude, 2) +
            Math.pow(merchant.longitude - longitude, 2)
        ) * 111000; // 대략적인 미터 변환

        // 100m 이내에서만 체크인 가능
        if (distance > 100) {
            return c.json({ error: '가맹점에서 너무 멀리 떨어져 있습니다' }, 400);
        }

        // 체크인 기록
        const result = await db
            .prepare(`
        INSERT INTO merchant_checkins (user_id, merchant_id, points_earned)
        VALUES (?, ?, 100)
      `)
            .bind(user.id, merchantId)
            .run();

        // 포인트 적립
        await db
            .prepare('UPDATE users SET points = points + 100 WHERE id = ?')
            .bind(user.id)
            .run();

        // 포인트 내역 기록
        await db
            .prepare(`
        INSERT INTO points_history (user_id, amount, type, description)
        VALUES (?, 100, 'earn', '가맹점 체크인')
      `)
            .bind(user.id)
            .run();

        // 방문 횟수 증가
        await db
            .prepare('UPDATE merchants SET total_visits = total_visits + 1 WHERE id = ?')
            .bind(merchantId)
            .run();

        return c.json({
            success: true,
            message: '체크인 완료! 100P 적립',
            points_earned: 100,
        });
    } catch (error: any) {
        return c.json({ error: '체크인 중 오류 발생: ' + error.message }, 500);
    }
});

// 가맹점 평가 작성
merchants.post('/:merchant_id/review', async (c) => {
    const user = c.get('user');
    const db = c.env.DB;
    const merchantId = c.req.param('merchant_id');

    const {
        kindness_score,
        price_score,
        taste_score,
        cleanliness_score,
        atmosphere_score,
        comment,
    } = await c.req.json();

    try {
        // 평균 점수 계산
        const scores = [kindness_score, price_score, taste_score, cleanliness_score, atmosphere_score].filter(s => s);
        const overall_rating = scores.reduce((a, b) => a + b, 0) / scores.length;

        // 평가 저장
        await db
            .prepare(`
        INSERT INTO merchant_reviews (
          merchant_id, user_id,
          kindness_score, price_score, taste_score,
          cleanliness_score, atmosphere_score,
          overall_rating, comment, visit_verified
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `)
            .bind(
                merchantId, user.id,
                kindness_score, price_score, taste_score,
                cleanliness_score, atmosphere_score,
                overall_rating, comment
            )
            .run();

        // 가맹점 평균 평점 업데이트
        const avgResult = await db
            .prepare(`
        SELECT 
          AVG(overall_rating) as avg_rating,
          COUNT(*) as review_count
        FROM merchant_reviews
        WHERE merchant_id = ?
      `)
            .bind(merchantId)
            .first();

        await db
            .prepare(`
        UPDATE merchants
        SET avg_rating = ?, total_reviews = ?
        WHERE id = ?
      `)
            .bind(avgResult.avg_rating, avgResult.review_count, merchantId)
            .run();

        // 포인트 적립
        await db
            .prepare('UPDATE users SET points = points + 50 WHERE id = ?')
            .bind(user.id)
            .run();

        await db
            .prepare(`
        INSERT INTO points_history (user_id, amount, type, description)
        VALUES (?, 50, 'earn', '가맹점 평가 작성')
      `)
            .bind(user.id)
            .run();

        return c.json({
            success: true,
            message: '평가 작성 완료! 50P 적립',
            points_earned: 50,
            overall_rating,
        });
    } catch (error: any) {
        return c.json({ error: '평가 작성 중 오류 발생: ' + error.message }, 500);
    }
});

// 가맹점 평가 목록 조회
merchants.get('/:merchant_id/reviews', async (c) => {
    const db = c.env.DB;
    const merchantId = c.req.param('merchant_id');

    try {
        const result = await db
            .prepare(`
        SELECT 
          r.*,
          u.name as user_name
        FROM merchant_reviews r
        JOIN users u ON u.id = r.user_id
        WHERE r.merchant_id = ?
        ORDER BY r.created_at DESC
        LIMIT 50
      `)
            .bind(merchantId)
            .all();

        return c.json({
            reviews: result.results || [],
        });
    } catch (error: any) {
        return c.json({ error: '조회 중 오류 발생: ' + error.message }, 500);
    }
});

// AI 추천 가맹점 조회
merchants.get('/ai-recommend', async (c) => {
    const db = c.env.DB;
    const { lat, lng, category, radius } = c.req.query();

    try {
        let query = `
      SELECT 
        m.*,
        (6371 * acos(cos(radians(?)) * cos(radians(latitude)) * 
        cos(radians(longitude) - radians(?)) + sin(radians(?)) * 
        sin(radians(latitude)))) AS distance
      FROM merchants m
      WHERE m.status = 'active'
    `;

        const params: any[] = [lat, lng, lat];

        if (category) {
            query += ' AND m.category = ?';
            params.push(category);
        }

        query += ' ORDER BY m.ai_score DESC, distance ASC LIMIT 10';

        const result = await db.prepare(query).bind(...params).all();

        return c.json({
            recommendations: result.results || [],
        });
    } catch (error: any) {
        return c.json({ error: '조회 중 오류 발생: ' + error.message }, 500);
    }
});

// 가맹점 상세 정보
merchants.get('/:merchant_id', async (c) => {
    const db = c.env.DB;
    const merchantId = c.req.param('merchant_id');

    try {
        const merchant = await db
            .prepare('SELECT * FROM merchants WHERE id = ?')
            .bind(merchantId)
            .first();

        if (!merchant) {
            return c.json({ error: '가맹점을 찾을 수 없습니다' }, 404);
        }

        return c.json({ merchant });
    } catch (error: any) {
        return c.json({ error: '조회 중 오류 발생: ' + error.message }, 500);
    }
});

// 가맹점 목록 조회
merchants.get('/', async (c) => {
    const db = c.env.DB;
    const { category, region_code, status } = c.req.query();

    try {
        let query = 'SELECT * FROM merchants WHERE 1=1';
        const params: any[] = [];

        if (category) {
            query += ' AND category = ?';
            params.push(category);
        }

        if (region_code) {
            query += ' AND region_code LIKE ?';
            params.push(region_code + '%');
        }

        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }

        query += ' ORDER BY created_at DESC LIMIT 100';

        const result = await db.prepare(query).bind(...params).all();

        return c.json({
            merchants: result.results || [],
        });
    } catch (error: any) {
        return c.json({ error: '조회 중 오류 발생: ' + error.message }, 500);
    }
});

export default merchants;
