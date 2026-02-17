// 포인트 관리 API
// Point Management System

import { Hono } from 'hono';

const points = new Hono();

// 포인트 내역 조회
points.get('/history', async (c) => {
    const user = c.get('user');
    const db = c.env.DB;
    const { page = '1', limit = '20' } = c.req.query();

    try {
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const history = await db
            .prepare(`
        SELECT * FROM points_history
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `)
            .bind(user.id, parseInt(limit), offset)
            .all();

        return c.json({
            history: history.results || [],
            page: parseInt(page),
            limit: parseInt(limit),
        });
    } catch (error: any) {
        return c.json({ error: '조회 실패: ' + error.message }, 500);
    }
});

// 포인트 잔액 조회
points.get('/balance', async (c) => {
    const user = c.get('user');
    const db = c.env.DB;

    try {
        const userInfo = await db
            .prepare('SELECT points FROM users WHERE id = ?')
            .bind(user.id)
            .first();

        // 곧 만료될 포인트 (30일 이내)
        const expiringSoon = await db
            .prepare(`
        SELECT SUM(points) as expiring_points
        FROM point_expirations
        WHERE user_id = ? 
          AND status = 'active'
          AND expires_at <= datetime('now', '+30 days')
          AND expires_at > datetime('now')
      `)
            .bind(user.id)
            .first();

        return c.json({
            balance: userInfo?.points || 0,
            expiring_soon: expiringSoon?.expiring_points || 0,
        });
    } catch (error: any) {
        return c.json({ error: '조회 실패: ' + error.message }, 500);
    }
});

// 만료 예정 포인트 조회
points.get('/expiring', async (c) => {
    const user = c.get('user');
    const db = c.env.DB;

    try {
        const expiringPoints = await db
            .prepare(`
        SELECT * FROM point_expirations
        WHERE user_id = ? 
          AND status = 'active'
          AND expires_at > datetime('now')
        ORDER BY expires_at ASC
      `)
            .bind(user.id)
            .all();

        return c.json({
            expiring_points: expiringPoints.results || [],
        });
    } catch (error: any) {
        return c.json({ error: '조회 실패: ' + error.message }, 500);
    }
});

// 포인트 만료 처리 (크론잡용)
points.post('/expire', async (c) => {
    const db = c.env.DB;

    try {
        // 만료된 포인트 조회
        const expired = await db
            .prepare(`
        SELECT * FROM point_expirations
        WHERE status = 'active'
          AND expires_at <= datetime('now')
      `)
            .all();

        let totalExpired = 0;

        for (const exp of expired.results || []) {
            // 사용자 포인트 차감
            await db
                .prepare('UPDATE users SET points = points - ? WHERE id = ?')
                .bind(exp.points, exp.user_id)
                .run();

            // 만료 상태 업데이트
            await db
                .prepare('UPDATE point_expirations SET status = ? WHERE id = ?')
                .bind('expired', exp.id)
                .run();

            // 포인트 내역 기록
            await db
                .prepare(`
          INSERT INTO points_history (user_id, points, type, description)
          VALUES (?, ?, 'deduct', '포인트 만료')
        `)
                .bind(exp.user_id, -exp.points)
                .run();

            totalExpired += exp.points;
        }

        return c.json({
            success: true,
            message: `${expired.results?.length || 0}건 만료 처리`,
            total_expired: totalExpired,
        });
    } catch (error: any) {
        return c.json({ error: '만료 처리 실패: ' + error.message }, 500);
    }
});

// 포인트 선물하기
points.post('/gift', async (c) => {
    const user = c.get('user');
    const db = c.env.DB;
    const { recipient_id, amount } = await c.req.json();

    try {
        // 잔액 확인
        const userInfo = await db
            .prepare('SELECT points FROM users WHERE id = ?')
            .bind(user.id)
            .first();

        if (!userInfo || userInfo.points < amount) {
            return c.json({ error: '포인트가 부족합니다' }, 400);
        }

        // 받는 사람 확인
        const recipient = await db
            .prepare('SELECT * FROM users WHERE id = ?')
            .bind(recipient_id)
            .first();

        if (!recipient) {
            return c.json({ error: '받는 사람을 찾을 수 없습니다' }, 404);
        }

        // 포인트 이동
        await db
            .prepare('UPDATE users SET points = points - ? WHERE id = ?')
            .bind(amount, user.id)
            .run();

        await db
            .prepare('UPDATE users SET points = points + ? WHERE id = ?')
            .bind(amount, recipient_id)
            .run();

        // 내역 기록
        await db
            .prepare(`
        INSERT INTO points_history (user_id, points, type, description)
        VALUES (?, ?, 'deduct', ?)
      `)
            .bind(user.id, -amount, `${recipient.name}님께 선물`)
            .run();

        await db
            .prepare(`
        INSERT INTO points_history (user_id, points, type, description)
        VALUES (?, ?, 'earn', ?)
      `)
            .bind(recipient_id, amount, `${user.name}님으로부터 선물`)
            .run();

        return c.json({
            success: true,
            message: '포인트 선물 완료',
        });
    } catch (error: any) {
        return c.json({ error: '선물 실패: ' + error.message }, 500);
    }
});

export default points;
