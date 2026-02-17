// 정산 자동화 시스템
// Settlement Automation System

import { Hono } from 'hono';

const settlement = new Hono();

// 정산 요청
settlement.post('/request', async (c) => {
    const user = c.get('user');
    const db = c.env.DB;

    const { period_start, period_end, settlement_type } = await c.req.json();

    try {
        // 정산 금액 계산
        let amount = 0;

        if (settlement_type === 'revenue') {
            // 수익 배분 정산
            const revenue = await db
                .prepare(`
          SELECT SUM(amount) as total
          FROM revenue_records
          WHERE user_id = ?
            AND created_at >= ?
            AND created_at <= ?
            AND status = 'pending'
        `)
                .bind(user.id, period_start, period_end)
                .first();

            amount = revenue?.total || 0;
        } else if (settlement_type === 'influencer') {
            // 인플루언서 정산
            const influencerInfo = await db
                .prepare('SELECT * FROM influencers WHERE user_id = ?')
                .bind(user.id)
                .first();

            if (influencerInfo) {
                const commission = await db
                    .prepare(`
            SELECT SUM(commission) as total
            FROM influencer_conversions
            WHERE influencer_id = ?
              AND converted_at >= ?
              AND converted_at <= ?
          `)
                    .bind(influencerInfo.id, period_start, period_end)
                    .first();

                amount = commission?.total || 0;
            }
        }

        if (amount === 0) {
            return c.json({ error: '정산할 금액이 없습니다' }, 400);
        }

        // 정산 생성
        const result = await db
            .prepare(`
        INSERT INTO settlements (
          user_id, settlement_type, period_start, period_end, amount
        ) VALUES (?, ?, ?, ?, ?)
      `)
            .bind(user.id, settlement_type, period_start, period_end, amount)
            .run();

        return c.json({
            success: true,
            message: '정산 요청 완료',
            settlement_id: result.meta.last_row_id,
            amount: amount,
        });
    } catch (error: any) {
        return c.json({ error: '정산 요청 실패: ' + error.message }, 500);
    }
});

// 정산 내역 조회
settlement.get('/list', async (c) => {
    const user = c.get('user');
    const db = c.env.DB;
    const { status } = c.req.query();

    try {
        let query = 'SELECT * FROM settlements WHERE user_id = ?';
        const params: any[] = [user.id];

        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }

        query += ' ORDER BY created_at DESC';

        const settlements = await db.prepare(query).bind(...params).all();

        return c.json({
            settlements: settlements.results || [],
        });
    } catch (error: any) {
        return c.json({ error: '조회 실패: ' + error.message }, 500);
    }
});

// 정산 승인 (관리자)
settlement.post('/:id/approve', async (c) => {
    const user = c.get('user');
    const db = c.env.DB;
    const settlementId = c.req.param('id');

    try {
        // 관리자 권한 확인
        if (user.role !== 'headquarters') {
            return c.json({ error: '권한이 없습니다' }, 403);
        }

        // 정산 조회
        const settlementInfo = await db
            .prepare('SELECT * FROM settlements WHERE id = ?')
            .bind(settlementId)
            .first();

        if (!settlementInfo) {
            return c.json({ error: '정산을 찾을 수 없습니다' }, 404);
        }

        if (settlementInfo.status !== 'pending') {
            return c.json({ error: '이미 처리된 정산입니다' }, 400);
        }

        // 승인 처리
        await db
            .prepare(`
        UPDATE settlements 
        SET status = 'approved', approved_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `)
            .bind(settlementId)
            .run();

        return c.json({
            success: true,
            message: '정산 승인 완료',
        });
    } catch (error: any) {
        return c.json({ error: '승인 실패: ' + error.message }, 500);
    }
});

// 정산 지급 (관리자)
settlement.post('/:id/pay', async (c) => {
    const user = c.get('user');
    const db = c.env.DB;
    const settlementId = c.req.param('id');

    try {
        // 관리자 권한 확인
        if (user.role !== 'headquarters') {
            return c.json({ error: '권한이 없습니다' }, 403);
        }

        // 정산 조회
        const settlementInfo = await db
            .prepare('SELECT * FROM settlements WHERE id = ?')
            .bind(settlementId)
            .first();

        if (!settlementInfo) {
            return c.json({ error: '정산을 찾을 수 없습니다' }, 404);
        }

        if (settlementInfo.status !== 'approved') {
            return c.json({ error: '승인된 정산만 지급 가능합니다' }, 400);
        }

        // 지급 처리
        await db
            .prepare(`
        UPDATE settlements 
        SET status = 'paid', paid_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `)
            .bind(settlementId)
            .run();

        // 실제로는 여기서 은행 API 호출하여 송금
        // await bankAPI.transfer(settlementInfo.user_id, settlementInfo.amount);

        return c.json({
            success: true,
            message: '정산 지급 완료',
        });
    } catch (error: any) {
        return c.json({ error: '지급 실패: ' + error.message }, 500);
    }
});

// 자동 정산 실행 (크론잡용)
settlement.post('/auto-run', async (c) => {
    const db = c.env.DB;
    const { schedule_type } = await c.req.json();

    try {
        // 스케줄 조회
        const schedule = await db
            .prepare(`
        SELECT * FROM settlement_schedules
        WHERE schedule_type = ? AND status = 'active'
      `)
            .bind(schedule_type)
            .first();

        if (!schedule) {
            return c.json({ error: '스케줄을 찾을 수 없습니다' }, 404);
        }

        // 기간 계산
        const now = new Date();
        let periodStart: Date;
        let periodEnd = now;

        if (schedule_type === 'daily') {
            periodStart = new Date(now.getTime() - 86400000); // 1일 전
        } else if (schedule_type === 'weekly') {
            periodStart = new Date(now.getTime() - 604800000); // 7일 전
        } else if (schedule_type === 'monthly') {
            periodStart = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        } else {
            return c.json({ error: '잘못된 스케줄 타입' }, 400);
        }

        // 대상 사용자 조회
        const users = await db
            .prepare('SELECT * FROM users WHERE role = ?')
            .bind(schedule.target_role)
            .all();

        let createdCount = 0;

        for (const targetUser of users.results || []) {
            // 수익 계산
            const revenue = await db
                .prepare(`
          SELECT SUM(amount) as total
          FROM revenue_records
          WHERE user_id = ?
            AND created_at >= ?
            AND created_at <= ?
            AND status = 'pending'
        `)
                .bind(targetUser.id, periodStart.toISOString(), periodEnd.toISOString())
                .first();

            const amount = revenue?.total || 0;

            if (amount > 0) {
                // 정산 생성
                await db
                    .prepare(`
            INSERT INTO settlements (
              user_id, settlement_type, period_start, period_end, amount
            ) VALUES (?, 'revenue', ?, ?, ?)
          `)
                    .bind(
                        targetUser.id,
                        periodStart.toISOString().split('T')[0],
                        periodEnd.toISOString().split('T')[0],
                        amount
                    )
                    .run();

                createdCount++;
            }
        }

        // 스케줄 업데이트
        const nextRun = new Date(now);
        if (schedule_type === 'daily') {
            nextRun.setDate(nextRun.getDate() + 1);
        } else if (schedule_type === 'weekly') {
            nextRun.setDate(nextRun.getDate() + 7);
        } else if (schedule_type === 'monthly') {
            nextRun.setMonth(nextRun.getMonth() + 1);
        }

        await db
            .prepare(`
        UPDATE settlement_schedules
        SET last_run_at = CURRENT_TIMESTAMP, next_run_at = ?
        WHERE id = ?
      `)
            .bind(nextRun.toISOString(), schedule.id)
            .run();

        return c.json({
            success: true,
            message: `자동 정산 완료: ${createdCount}건 생성`,
            created_count: createdCount,
        });
    } catch (error: any) {
        return c.json({ error: '자동 정산 실패: ' + error.message }, 500);
    }
});

export default settlement;
