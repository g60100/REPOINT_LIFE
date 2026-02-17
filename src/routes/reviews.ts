// 리뷰 시스템 API
// Review System

import { Hono } from 'hono';

const reviews = new Hono();

// 리뷰 작성
reviews.post('/create', async (c) => {
    const user = c.get('user');
    const db = c.env.DB;

    const { product_id, rating, comment } = await c.req.json();

    try {
        // 구매 확인
        const purchase = await db
            .prepare(`
        SELECT o.* FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        WHERE o.user_id = ? AND oi.product_id = ? AND o.status = 'completed'
      `)
            .bind(user.id, product_id)
            .first();

        if (!purchase) {
            return c.json({ error: '구매한 상품만 리뷰 작성 가능합니다' }, 400);
        }

        // 중복 리뷰 확인
        const existing = await db
            .prepare('SELECT * FROM reviews WHERE user_id = ? AND product_id = ?')
            .bind(user.id, product_id)
            .first();

        if (existing) {
            return c.json({ error: '이미 리뷰를 작성했습니다' }, 400);
        }

        // 리뷰 생성
        const result = await db
            .prepare(`
        INSERT INTO reviews (user_id, product_id, rating, comment)
        VALUES (?, ?, ?, ?)
      `)
            .bind(user.id, product_id, rating, comment)
            .run();

        // 리뷰 작성 포인트 지급 (50P)
        await db
            .prepare('UPDATE users SET points = points + 50 WHERE id = ?')
            .bind(user.id)
            .run();

        // 포인트 만료 기록 (1년 후 만료)
        const expiresAt = new Date();
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);

        await db
            .prepare(`
        INSERT INTO point_expirations (user_id, points, earned_at, expires_at)
        VALUES (?, 50, CURRENT_TIMESTAMP, ?)
      `)
            .bind(user.id, expiresAt.toISOString())
            .run();

        return c.json({
            success: true,
            message: '리뷰 작성 완료! 50P 적립',
            review_id: result.meta.last_row_id,
        });
    } catch (error: any) {
        return c.json({ error: '리뷰 작성 실패: ' + error.message }, 500);
    }
});

// 리뷰 조회
reviews.get('/product/:product_id', async (c) => {
    const db = c.env.DB;
    const productId = c.req.param('product_id');
    const { page = '1', limit = '10' } = c.req.query();

    try {
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const reviewsList = await db
            .prepare(`
        SELECT 
          r.*,
          u.name as user_name,
          (SELECT COUNT(*) FROM review_likes WHERE review_id = r.id) as likes_count
        FROM reviews r
        JOIN users u ON r.user_id = u.id
        WHERE r.product_id = ?
        ORDER BY r.created_at DESC
        LIMIT ? OFFSET ?
      `)
            .bind(productId, parseInt(limit), offset)
            .all();

        // 총 개수
        const total = await db
            .prepare('SELECT COUNT(*) as count FROM reviews WHERE product_id = ?')
            .bind(productId)
            .first();

        // 평균 평점
        const avgRating = await db
            .prepare('SELECT AVG(rating) as avg FROM reviews WHERE product_id = ?')
            .bind(productId)
            .first();

        return c.json({
            reviews: reviewsList.results || [],
            total: total?.count || 0,
            average_rating: avgRating?.avg || 0,
            page: parseInt(page),
            limit: parseInt(limit),
        });
    } catch (error: any) {
        return c.json({ error: '조회 실패: ' + error.message }, 500);
    }
});

// 리뷰 좋아요
reviews.post('/:review_id/like', async (c) => {
    const user = c.get('user');
    const db = c.env.DB;
    const reviewId = c.req.param('review_id');

    try {
        // 중복 확인
        const existing = await db
            .prepare('SELECT * FROM review_likes WHERE review_id = ? AND user_id = ?')
            .bind(reviewId, user.id)
            .first();

        if (existing) {
            // 좋아요 취소
            await db
                .prepare('DELETE FROM review_likes WHERE review_id = ? AND user_id = ?')
                .bind(reviewId, user.id)
                .run();

            return c.json({
                success: true,
                message: '좋아요 취소',
                action: 'unlike',
            });
        } else {
            // 좋아요 추가
            await db
                .prepare('INSERT INTO review_likes (review_id, user_id) VALUES (?, ?)')
                .bind(reviewId, user.id)
                .run();

            return c.json({
                success: true,
                message: '좋아요',
                action: 'like',
            });
        }
    } catch (error: any) {
        return c.json({ error: '처리 실패: ' + error.message }, 500);
    }
});

// 리뷰 신고
reviews.post('/:review_id/report', async (c) => {
    const user = c.get('user');
    const db = c.env.DB;
    const reviewId = c.req.param('review_id');
    const { reason } = await c.req.json();

    try {
        await db
            .prepare(`
        INSERT INTO review_reports (review_id, reporter_id, reason)
        VALUES (?, ?, ?)
      `)
            .bind(reviewId, user.id, reason)
            .run();

        return c.json({
            success: true,
            message: '신고가 접수되었습니다',
        });
    } catch (error: any) {
        return c.json({ error: '신고 실패: ' + error.message }, 500);
    }
});

// 내 리뷰 목록
reviews.get('/my', async (c) => {
    const user = c.get('user');
    const db = c.env.DB;

    try {
        const myReviews = await db
            .prepare(`
        SELECT 
          r.*,
          p.name as product_name,
          (SELECT COUNT(*) FROM review_likes WHERE review_id = r.id) as likes_count
        FROM reviews r
        JOIN products p ON r.product_id = p.id
        WHERE r.user_id = ?
        ORDER BY r.created_at DESC
      `)
            .bind(user.id)
            .all();

        return c.json({
            reviews: myReviews.results || [],
        });
    } catch (error: any) {
        return c.json({ error: '조회 실패: ' + error.message }, 500);
    }
});

export default reviews;
