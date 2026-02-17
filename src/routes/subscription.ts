// AI 구독 시스템 API
// AI Subscription System

import { Hono } from 'hono';

const subscription = new Hono();

// 구독 플랜 목록
subscription.get('/plans', async (c) => {
    const db = c.env.DB;
    const { plan_type } = c.req.query();

    try {
        let query = 'SELECT * FROM subscription_plans WHERE status = ?';
        const params: any[] = ['active'];

        if (plan_type) {
            query += ' AND plan_type = ?';
            params.push(plan_type);
        }

        const plans = await db.prepare(query).bind(...params).all();

        return c.json({
            plans: plans.results || [],
        });
    } catch (error: any) {
        return c.json({ error: '조회 실패: ' + error.message }, 500);
    }
});

// 구독 신청
subscription.post('/subscribe', async (c) => {
    const user = c.get('user');
    const db = c.env.DB;

    const { plan_id, payment_method = 'points' } = await c.req.json();

    try {
        // 플랜 조회
        const plan = await db
            .prepare('SELECT * FROM subscription_plans WHERE id = ?')
            .bind(plan_id)
            .first();

        if (!plan) {
            return c.json({ error: '플랜을 찾을 수 없습니다' }, 404);
        }

        // 결제 처리
        if (payment_method === 'points') {
            // 포인트 결제
            const userInfo = await db
                .prepare('SELECT points FROM users WHERE id = ?')
                .bind(user.id)
                .first();

            if (!userInfo || userInfo.points < plan.price) {
                return c.json({ error: '포인트가 부족합니다' }, 400);
            }

            // 포인트 차감
            await db
                .prepare('UPDATE users SET points = points - ? WHERE id = ?')
                .bind(plan.price, user.id)
                .run();
        }

        // 구독 생성
        const startDate = new Date();
        const endDate = new Date();

        if (plan.billing_cycle === 'monthly') {
            endDate.setMonth(endDate.getMonth() + 1);
        } else if (plan.billing_cycle === 'yearly') {
            endDate.setFullYear(endDate.getFullYear() + 1);
        }

        const subResult = await db
            .prepare(`
        INSERT INTO user_subscriptions (
          user_id, plan_id, start_date, end_date, remaining_credits
        ) VALUES (?, ?, ?, ?, ?)
      `)
            .bind(
                user.id,
                plan_id,
                startDate.toISOString().split('T')[0],
                endDate.toISOString().split('T')[0],
                plan.ai_credits
            )
            .run();

        // 결제 내역 기록
        await db
            .prepare(`
        INSERT INTO subscription_payments (
          subscription_id, user_id, amount, payment_method, status, paid_at
        ) VALUES (?, ?, ?, ?, 'completed', CURRENT_TIMESTAMP)
      `)
            .bind(subResult.meta.last_row_id, user.id, plan.price, payment_method)
            .run();

        return c.json({
            success: true,
            message: '구독 신청 완료',
            subscription_id: subResult.meta.last_row_id,
            credits: plan.ai_credits,
        });
    } catch (error: any) {
        return c.json({ error: '구독 실패: ' + error.message }, 500);
    }
});

// 내 구독 조회
subscription.get('/my', async (c) => {
    const user = c.get('user');
    const db = c.env.DB;

    try {
        const subscriptions = await db
            .prepare(`
        SELECT 
          s.*,
          p.plan_name,
          p.plan_type,
          p.features
        FROM user_subscriptions s
        JOIN subscription_plans p ON s.plan_id = p.id
        WHERE s.user_id = ?
        ORDER BY s.created_at DESC
      `)
            .bind(user.id)
            .all();

        return c.json({
            subscriptions: subscriptions.results || [],
        });
    } catch (error: any) {
        return c.json({ error: '조회 실패: ' + error.message }, 500);
    }
});

// AI 콘텐츠 생성 요청
subscription.post('/ai/generate', async (c) => {
    const user = c.get('user');
    const db = c.env.DB;

    const { content_type, prompt, ai_model = 'dall-e-3' } = await c.req.json();

    try {
        // 활성 구독 확인
        const activeSub = await db
            .prepare(`
        SELECT * FROM user_subscriptions
        WHERE user_id = ? AND status = 'active' AND end_date >= date('now')
        ORDER BY created_at DESC
        LIMIT 1
      `)
            .bind(user.id)
            .first();

        if (!activeSub) {
            return c.json({ error: '활성 구독이 없습니다' }, 400);
        }

        if (activeSub.remaining_credits < 1) {
            return c.json({ error: '크레딧이 부족합니다' }, 400);
        }

        // AI 생성 요청 생성
        const result = await db
            .prepare(`
        INSERT INTO ai_generated_content (
          user_id, subscription_id, content_type, prompt, ai_model, status
        ) VALUES (?, ?, ?, ?, ?, 'pending')
      `)
            .bind(user.id, activeSub.id, content_type, prompt, ai_model)
            .run();

        // 크레딧 차감
        await db
            .prepare('UPDATE user_subscriptions SET remaining_credits = remaining_credits - 1 WHERE id = ?')
            .bind(activeSub.id)
            .run();

        // 실제로는 여기서 AI API 호출
        // const generatedUrl = await generateWithAI(content_type, prompt, ai_model);

        // 시뮬레이션: 즉시 완료 처리
        const generatedUrl = `https://cdn.repoint.life/ai/${result.meta.last_row_id}.mp4`;

        await db
            .prepare('UPDATE ai_generated_content SET status = ?, generated_url = ? WHERE id = ?')
            .bind('completed', generatedUrl, result.meta.last_row_id)
            .run();

        return c.json({
            success: true,
            message: 'AI 콘텐츠 생성 완료',
            content_id: result.meta.last_row_id,
            url: generatedUrl,
            remaining_credits: activeSub.remaining_credits - 1,
        });
    } catch (error: any) {
        return c.json({ error: '생성 실패: ' + error.message }, 500);
    }
});

// 내 AI 콘텐츠 목록
subscription.get('/ai/my-content', async (c) => {
    const user = c.get('user');
    const db = c.env.DB;

    try {
        const content = await db
            .prepare(`
        SELECT * FROM ai_generated_content
        WHERE user_id = ?
        ORDER BY created_at DESC
      `)
            .bind(user.id)
            .all();

        return c.json({
            content: content.results || [],
        });
    } catch (error: any) {
        return c.json({ error: '조회 실패: ' + error.message }, 500);
    }
});

// SNS 자동 발송 예약
subscription.post('/sns/schedule', async (c) => {
    const user = c.get('user');
    const db = c.env.DB;

    const { content_id, platform, post_text, hashtags, scheduled_at } = await c.req.json();

    try {
        // 콘텐츠 확인
        const content = await db
            .prepare('SELECT * FROM ai_generated_content WHERE id = ? AND user_id = ?')
            .bind(content_id, user.id)
            .first();

        if (!content) {
            return c.json({ error: '콘텐츠를 찾을 수 없습니다' }, 404);
        }

        // SNS 발송 예약
        const result = await db
            .prepare(`
        INSERT INTO sns_auto_posts (
          user_id, content_id, platform, post_text, hashtags, scheduled_at, status
        ) VALUES (?, ?, ?, ?, ?, ?, 'scheduled')
      `)
            .bind(user.id, content_id, platform, post_text, hashtags, scheduled_at)
            .run();

        return c.json({
            success: true,
            message: 'SNS 발송 예약 완료',
            post_id: result.meta.last_row_id,
        });
    } catch (error: any) {
        return c.json({ error: '예약 실패: ' + error.message }, 500);
    }
});

// SNS 즉시 발송
subscription.post('/sns/post-now', async (c) => {
    const user = c.get('user');
    const db = c.env.DB;

    const { content_id, platform, post_text, hashtags } = await c.req.json();

    try {
        // 콘텐츠 확인
        const content = await db
            .prepare('SELECT * FROM ai_generated_content WHERE id = ? AND user_id = ?')
            .bind(content_id, user.id)
            .first();

        if (!content) {
            return c.json({ error: '콘텐츠를 찾을 수 없습니다' }, 404);
        }

        // 실제로는 여기서 SNS API 호출
        // const postUrl = await postToSNS(platform, content.generated_url, post_text, hashtags);

        const postUrl = `https://${platform}.com/post/123456`;

        // SNS 발송 기록
        await db
            .prepare(`
        INSERT INTO sns_auto_posts (
          user_id, content_id, platform, post_text, hashtags, 
          status, posted_at, post_url
        ) VALUES (?, ?, ?, ?, ?, 'posted', CURRENT_TIMESTAMP, ?)
      `)
            .bind(user.id, content_id, platform, post_text, hashtags, postUrl)
            .run();

        return c.json({
            success: true,
            message: 'SNS 발송 완료',
            post_url: postUrl,
        });
    } catch (error: any) {
        return c.json({ error: '발송 실패: ' + error.message }, 500);
    }
});

// 내 SNS 발송 내역
subscription.get('/sns/my-posts', async (c) => {
    const user = c.get('user');
    const db = c.env.DB;

    try {
        const posts = await db
            .prepare(`
        SELECT 
          sp.*,
          ac.content_type,
          ac.generated_url
        FROM sns_auto_posts sp
        JOIN ai_generated_content ac ON sp.content_id = ac.id
        WHERE sp.user_id = ?
        ORDER BY sp.created_at DESC
      `)
            .bind(user.id)
            .all();

        return c.json({
            posts: posts.results || [],
        });
    } catch (error: any) {
        return c.json({ error: '조회 실패: ' + error.message }, 500);
    }
});

// 구독 취소
subscription.post('/cancel', async (c) => {
    const user = c.get('user');
    const db = c.env.DB;

    const { subscription_id } = await c.req.json();

    try {
        // 구독 확인
        const sub = await db
            .prepare('SELECT * FROM user_subscriptions WHERE id = ? AND user_id = ?')
            .bind(subscription_id, user.id)
            .first();

        if (!sub) {
            return c.json({ error: '구독을 찾을 수 없습니다' }, 404);
        }

        // 자동 갱신 해제
        await db
            .prepare('UPDATE user_subscriptions SET auto_renew = 0, status = ? WHERE id = ?')
            .bind('cancelled', subscription_id)
            .run();

        return c.json({
            success: true,
            message: '구독이 취소되었습니다. 기간 만료 시까지 사용 가능합니다.',
        });
    } catch (error: any) {
        return c.json({ error: '취소 실패: ' + error.message }, 500);
    }
});

export default subscription;
