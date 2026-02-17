// 인플루언서 보상 시스템 API
// Influencer Reward System

import { Hono } from 'hono';

const influencer = new Hono();

// 인플루언서 등록
influencer.post('/register', async (c) => {
    const user = c.get('user');
    const db = c.env.DB;

    const {
        influencer_name,
        platform,
        channel_url,
        follower_count,
    } = await c.req.json();

    try {
        // 고유 추천 코드 생성
        const referralCode = `INF${user.id}${Date.now().toString(36).toUpperCase()}`;

        // 팔로워 수에 따른 수수료율 결정
        let commissionRate = 0.05; // 기본 5%
        if (follower_count >= 100000) commissionRate = 0.10; // 10만+ → 10%
        else if (follower_count >= 50000) commissionRate = 0.08; // 5만+ → 8%
        else if (follower_count >= 10000) commissionRate = 0.06; // 1만+ → 6%

        // 인플루언서 등록
        const result = await db
            .prepare(`
        INSERT INTO influencers (
          user_id, influencer_name, platform, channel_url,
          follower_count, referral_code, commission_rate, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
      `)
            .bind(
                user.id,
                influencer_name,
                platform,
                channel_url,
                follower_count,
                referralCode,
                commissionRate
            )
            .run();

        return c.json({
            success: true,
            message: '인플루언서 등록 완료',
            influencer_id: result.meta.last_row_id,
            referral_code: referralCode,
            referral_url: `https://repoint.life/signup?inf=${referralCode}`,
            commission_rate: commissionRate,
        });
    } catch (error: any) {
        return c.json({ error: '등록 실패: ' + error.message }, 500);
    }
});

// 클릭 추적
influencer.post('/track/click', async (c) => {
    const db = c.env.DB;
    const { referral_code } = await c.req.json();

    try {
        // 인플루언서 조회
        const influencer = await db
            .prepare('SELECT * FROM influencers WHERE referral_code = ?')
            .bind(referral_code)
            .first();

        if (!influencer) {
            return c.json({ error: '유효하지 않은 추천 코드' }, 404);
        }

        // 클릭 기록
        await db
            .prepare(`
        INSERT INTO influencer_clicks (influencer_id, user_ip, user_agent)
        VALUES (?, ?, ?)
      `)
            .bind(
                influencer.id,
                c.req.header('CF-Connecting-IP') || 'unknown',
                c.req.header('User-Agent') || 'unknown'
            )
            .run();

        // 총 클릭 수 증가
        await db
            .prepare('UPDATE influencers SET total_clicks = total_clicks + 1 WHERE id = ?')
            .bind(influencer.id)
            .run();

        return c.json({
            success: true,
            influencer_name: influencer.influencer_name,
        });
    } catch (error: any) {
        return c.json({ error: '추적 실패: ' + error.message }, 500);
    }
});

// 전환 추적 (가입/구매)
influencer.post('/track/conversion', async (c) => {
    const db = c.env.DB;
    const { referral_code, user_id, conversion_type, amount = 0 } = await c.req.json();

    try {
        // 인플루언서 조회
        const influencer = await db
            .prepare('SELECT * FROM influencers WHERE referral_code = ?')
            .bind(referral_code)
            .first();

        if (!influencer) {
            return c.json({ error: '유효하지 않은 추천 코드' }, 404);
        }

        // 수수료 계산
        const commission = amount * influencer.commission_rate;

        // 전환 기록
        await db
            .prepare(`
        INSERT INTO influencer_conversions (
          influencer_id, user_id, conversion_type, amount, commission
        ) VALUES (?, ?, ?, ?, ?)
      `)
            .bind(influencer.id, user_id, conversion_type, amount, commission)
            .run();

        // 통계 업데이트
        await db
            .prepare(`
        UPDATE influencers 
        SET total_conversions = total_conversions + 1,
            total_revenue = total_revenue + ?,
            total_commission = total_commission + ?
        WHERE id = ?
      `)
            .bind(amount, commission, influencer.id)
            .run();

        return c.json({
            success: true,
            commission: commission,
        });
    } catch (error: any) {
        return c.json({ error: '추적 실패: ' + error.message }, 500);
    }
});

// 인플루언서 대시보드
influencer.get('/dashboard', async (c) => {
    const user = c.get('user');
    const db = c.env.DB;

    try {
        // 인플루언서 정보
        const influencerInfo = await db
            .prepare('SELECT * FROM influencers WHERE user_id = ?')
            .bind(user.id)
            .first();

        if (!influencerInfo) {
            return c.json({ error: '인플루언서 등록이 필요합니다' }, 404);
        }

        // 최근 30일 통계
        const stats = await db
            .prepare(`
        SELECT 
          COUNT(*) as conversions,
          SUM(amount) as revenue,
          SUM(commission) as commission
        FROM influencer_conversions
        WHERE influencer_id = ?
          AND converted_at >= datetime('now', '-30 days')
      `)
            .bind(influencerInfo.id)
            .first();

        // 콘텐츠 목록
        const contents = await db
            .prepare(`
        SELECT * FROM influencer_content
        WHERE influencer_id = ?
        ORDER BY created_at DESC
        LIMIT 10
      `)
            .bind(influencerInfo.id)
            .all();

        return c.json({
            influencer: influencerInfo,
            stats: stats || { conversions: 0, revenue: 0, commission: 0 },
            contents: contents.results || [],
        });
    } catch (error: any) {
        return c.json({ error: '조회 실패: ' + error.message }, 500);
    }
});

// 콘텐츠 등록
influencer.post('/content', async (c) => {
    const user = c.get('user');
    const db = c.env.DB;

    const {
        content_type,
        content_url,
        platform,
        payment_amount,
    } = await c.req.json();

    try {
        // 인플루언서 확인
        const influencerInfo = await db
            .prepare('SELECT * FROM influencers WHERE user_id = ?')
            .bind(user.id)
            .first();

        if (!influencerInfo) {
            return c.json({ error: '인플루언서 등록이 필요합니다' }, 404);
        }

        // 콘텐츠 등록
        const result = await db
            .prepare(`
        INSERT INTO influencer_content (
          influencer_id, content_type, content_url, platform, payment_amount
        ) VALUES (?, ?, ?, ?, ?)
      `)
            .bind(
                influencerInfo.id,
                content_type,
                content_url,
                platform,
                payment_amount
            )
            .run();

        return c.json({
            success: true,
            message: '콘텐츠 등록 완료',
            content_id: result.meta.last_row_id,
        });
    } catch (error: any) {
        return c.json({ error: '등록 실패: ' + error.message }, 500);
    }
});

// 정산 요청
influencer.post('/settlement/request', async (c) => {
    const user = c.get('user');
    const db = c.env.DB;

    const { period_start, period_end } = await c.req.json();

    try {
        // 인플루언서 확인
        const influencerInfo = await db
            .prepare('SELECT * FROM influencers WHERE user_id = ?')
            .bind(user.id)
            .first();

        if (!influencerInfo) {
            return c.json({ error: '인플루언서 등록이 필요합니다' }, 404);
        }

        // 기간 내 통계
        const stats = await db
            .prepare(`
        SELECT 
          COUNT(*) as total_conversions,
          SUM(amount) as total_revenue,
          SUM(commission) as total_commission
        FROM influencer_conversions
        WHERE influencer_id = ?
          AND converted_at >= ?
          AND converted_at <= ?
      `)
            .bind(influencerInfo.id, period_start, period_end)
            .first();

        // 클릭 수
        const clicks = await db
            .prepare(`
        SELECT COUNT(*) as total_clicks
        FROM influencer_clicks
        WHERE influencer_id = ?
          AND clicked_at >= ?
          AND clicked_at <= ?
      `)
            .bind(influencerInfo.id, period_start, period_end)
            .first();

        // 정산 생성
        const result = await db
            .prepare(`
        INSERT INTO influencer_settlements (
          influencer_id, period_start, period_end,
          total_clicks, total_conversions, total_revenue, total_commission
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
            .bind(
                influencerInfo.id,
                period_start,
                period_end,
                clicks?.total_clicks || 0,
                stats?.total_conversions || 0,
                stats?.total_revenue || 0,
                stats?.total_commission || 0
            )
            .run();

        return c.json({
            success: true,
            message: '정산 요청 완료',
            settlement_id: result.meta.last_row_id,
            total_commission: stats?.total_commission || 0,
        });
    } catch (error: any) {
        return c.json({ error: '정산 요청 실패: ' + error.message }, 500);
    }
});

// 정산 내역 조회
influencer.get('/settlements', async (c) => {
    const user = c.get('user');
    const db = c.env.DB;

    try {
        // 인플루언서 확인
        const influencerInfo = await db
            .prepare('SELECT * FROM influencers WHERE user_id = ?')
            .bind(user.id)
            .first();

        if (!influencerInfo) {
            return c.json({ error: '인플루언서 등록이 필요합니다' }, 404);
        }

        // 정산 내역
        const settlements = await db
            .prepare(`
        SELECT * FROM influencer_settlements
        WHERE influencer_id = ?
        ORDER BY created_at DESC
      `)
            .bind(influencerInfo.id)
            .all();

        return c.json({
            settlements: settlements.results || [],
        });
    } catch (error: any) {
        return c.json({ error: '조회 실패: ' + error.message }, 500);
    }
});

// 인플루언서 순위 (리더보드)
influencer.get('/leaderboard', async (c) => {
    const db = c.env.DB;
    const { period = 'month' } = c.req.query();

    try {
        let dateFilter = '';
        if (period === 'week') {
            dateFilter = "AND converted_at >= datetime('now', '-7 days')";
        } else if (period === 'month') {
            dateFilter = "AND converted_at >= datetime('now', '-30 days')";
        }

        const leaderboard = await db
            .prepare(`
        SELECT 
          i.influencer_name,
          i.platform,
          i.follower_count,
          COUNT(ic.id) as conversions,
          SUM(ic.commission) as total_commission
        FROM influencers i
        LEFT JOIN influencer_conversions ic ON i.id = ic.influencer_id ${dateFilter}
        WHERE i.status = 'active'
        GROUP BY i.id
        ORDER BY total_commission DESC
        LIMIT 100
      `)
            .all();

        return c.json({
            leaderboard: leaderboard.results || [],
            period: period,
        });
    } catch (error: any) {
        return c.json({ error: '조회 실패: ' + error.message }, 500);
    }
});

export default influencer;
