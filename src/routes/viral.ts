// 바이럴 마케팅 API
// Viral Marketing & Referral System

import { Hono } from 'hono';

const viral = new Hono();

// 친구 초대 코드 생성
viral.post('/referral/generate', async (c) => {
    const user = c.get('user');
    const db = c.env.DB;

    try {
        // 고유 초대 코드 생성
        const referralCode = `REF${user.id}${Date.now().toString(36).toUpperCase()}`;

        return c.json({
            success: true,
            referral_code: referralCode,
            referral_url: `https://repoint.life/signup?ref=${referralCode}`,
            reward_per_friend: 5000,
        });
    } catch (error: any) {
        return c.json({ error: '초대 코드 생성 실패: ' + error.message }, 500);
    }
});

// 친구 초대 등록
viral.post('/referral/register', async (c) => {
    const db = c.env.DB;
    const { referral_code, referee_id } = await c.req.json();

    try {
        // 초대 코드에서 초대자 ID 추출
        const referrerId = parseInt(referral_code.substring(3, referral_code.length - 10));

        // 초대 기록 생성
        await db
            .prepare(`
        INSERT INTO referrals (referrer_id, referee_id, referral_code, status)
        VALUES (?, ?, ?, 'completed')
      `)
            .bind(referrerId, referee_id, referral_code)
            .run();

        // 초대자에게 포인트 지급
        await db
            .prepare('UPDATE users SET points = points + 5000 WHERE id = ?')
            .bind(referrerId)
            .run();

        // 피초대자에게 가입 보너스
        await db
            .prepare('UPDATE users SET points = points + 10000 WHERE id = ?')
            .bind(referee_id)
            .run();

        // 이벤트 기록
        await db
            .prepare(`
        INSERT INTO signup_events (user_id, event_type, points_awarded)
        VALUES (?, 'friend_referral', 5000)
      `)
            .bind(referrerId)
            .run();

        await db
            .prepare(`
        INSERT INTO signup_events (user_id, event_type, points_awarded)
        VALUES (?, 'signup_bonus', 10000)
      `)
            .bind(referee_id)
            .run();

        return c.json({
            success: true,
            message: '친구 초대 완료! 5,000P 적립',
            referrer_reward: 5000,
            referee_reward: 10000,
        });
    } catch (error: any) {
        return c.json({ error: '초대 등록 실패: ' + error.message }, 500);
    }
});

// 내 초대 현황
viral.get('/referral/stats', async (c) => {
    const user = c.get('user');
    const db = c.env.DB;

    try {
        const stats = await db
            .prepare(`
        SELECT 
          COUNT(*) as total_referrals,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(reward_points) as total_rewards
        FROM referrals
        WHERE referrer_id = ?
      `)
            .bind(user.id)
            .first();

        return c.json({
            stats: stats || { total_referrals: 0, completed: 0, total_rewards: 0 },
        });
    } catch (error: any) {
        return c.json({ error: '조회 실패: ' + error.message }, 500);
    }
});

// 출석 체크
viral.post('/checkin', async (c) => {
    const user = c.get('user');
    const db = c.env.DB;

    try {
        const today = new Date().toISOString().split('T')[0];

        // 오늘 이미 체크인했는지 확인
        const existing = await db
            .prepare('SELECT * FROM daily_checkins WHERE user_id = ? AND checkin_date = ?')
            .bind(user.id, today)
            .first();

        if (existing) {
            return c.json({ error: '오늘 이미 출석했습니다' }, 400);
        }

        // 연속 출석 일수 계산
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        const yesterdayCheckin = await db
            .prepare('SELECT * FROM daily_checkins WHERE user_id = ? AND checkin_date = ?')
            .bind(user.id, yesterday)
            .first();

        const streakDays = yesterdayCheckin ? (yesterdayCheckin.streak_days || 0) + 1 : 1;
        const bonusPoints = streakDays >= 7 ? 500 : 100; // 7일 연속 시 보너스

        // 출석 기록
        await db
            .prepare(`
        INSERT INTO daily_checkins (user_id, checkin_date, points_awarded, streak_days)
        VALUES (?, ?, ?, ?)
      `)
            .bind(user.id, today, bonusPoints, streakDays)
            .run();

        // 포인트 지급
        await db
            .prepare('UPDATE users SET points = points + ? WHERE id = ?')
            .bind(bonusPoints, user.id)
            .run();

        return c.json({
            success: true,
            message: `출석 완료! ${bonusPoints}P 적립`,
            points_awarded: bonusPoints,
            streak_days: streakDays,
            bonus: streakDays >= 7,
        });
    } catch (error: any) {
        return c.json({ error: '출석 체크 실패: ' + error.message }, 500);
    }
});

// 가입 보너스 지급
viral.post('/signup-bonus', async (c) => {
    const db = c.env.DB;
    const { user_id } = await c.req.json();

    try {
        // 이미 받았는지 확인
        const existing = await db
            .prepare('SELECT * FROM signup_events WHERE user_id = ? AND event_type = ?')
            .bind(user_id, 'signup_bonus')
            .first();

        if (existing) {
            return c.json({ error: '이미 가입 보너스를 받았습니다' }, 400);
        }

        // 10,000P 지급
        await db
            .prepare('UPDATE users SET points = points + 10000 WHERE id = ?')
            .bind(user_id)
            .run();

        // 이벤트 기록
        await db
            .prepare(`
        INSERT INTO signup_events (user_id, event_type, points_awarded)
        VALUES (?, 'signup_bonus', 10000)
      `)
            .bind(user_id)
            .run();

        return c.json({
            success: true,
            message: '가입 축하! 10,000P 지급',
            points: 10000,
        });
    } catch (error: any) {
        return c.json({ error: '보너스 지급 실패: ' + error.message }, 500);
    }
});

// 첫 구매 50% 캐시백
viral.post('/first-purchase-cashback', async (c) => {
    const db = c.env.DB;
    const { user_id, order_id, amount } = await c.req.json();

    try {
        // 첫 구매인지 확인
        const orderCount = await db
            .prepare('SELECT COUNT(*) as count FROM orders WHERE user_id = ?')
            .bind(user_id)
            .first();

        if (orderCount && orderCount.count > 1) {
            return c.json({ error: '첫 구매가 아닙니다' }, 400);
        }

        // 50% 캐시백 (최대 20,000원)
        const cashback = Math.min(amount * 0.5, 20000);

        // 포인트 지급
        await db
            .prepare('UPDATE users SET points = points + ? WHERE id = ?')
            .bind(cashback, user_id)
            .run();

        // 이벤트 기록
        await db
            .prepare(`
        INSERT INTO signup_events (user_id, event_type, cashback_amount)
        VALUES (?, 'first_purchase', ?)
      `)
            .bind(user_id, cashback)
            .run();

        return c.json({
            success: true,
            message: `첫 구매 축하! ${cashback}P 캐시백`,
            cashback: cashback,
        });
    } catch (error: any) {
        return c.json({ error: '캐시백 지급 실패: ' + error.message }, 500);
    }
});

export default viral;
