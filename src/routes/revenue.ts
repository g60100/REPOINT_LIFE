// 수익 배분 시스템 API
// Revenue distribution system

import { Hono } from 'hono';
import { requireHQ } from '../middleware/auth';

const revenue = new Hono();

// 수익 배분율 설정 (본사만 가능)
revenue.put('/commission-settings', requireHQ, async (c) => {
    const {
        category,
        region_code,
        hq_rate,
        branch_rate,
        agency_rate,
        dealer_rate,
        member_benefit_rate,
    } = await c.req.json();

    const db = c.env.DB;

    // 합계 100% 검증
    const total = hq_rate + branch_rate + agency_rate + dealer_rate + member_benefit_rate;
    if (total !== 100) {
        return c.json({ error: '배분율 합계는 100%여야 합니다' }, 400);
    }

    try {
        // 기존 설정 확인
        const existing = await db
            .prepare(`
        SELECT * FROM commission_settings
        WHERE (category = ? OR (category IS NULL AND ? IS NULL))
        AND (region_code = ? OR (region_code IS NULL AND ? IS NULL))
      `)
            .bind(category, category, region_code, region_code)
            .first();

        if (existing) {
            // 업데이트
            await db
                .prepare(`
          UPDATE commission_settings
          SET hq_rate = ?,
              branch_rate = ?,
              agency_rate = ?,
              dealer_rate = ?,
              member_benefit_rate = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `)
                .bind(hq_rate, branch_rate, agency_rate, dealer_rate, member_benefit_rate, existing.id)
                .run();
        } else {
            // 신규 생성
            await db
                .prepare(`
          INSERT INTO commission_settings (
            category, region_code,
            hq_rate, branch_rate, agency_rate, dealer_rate, member_benefit_rate
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `)
                .bind(category, region_code, hq_rate, branch_rate, agency_rate, dealer_rate, member_benefit_rate)
                .run();
        }

        return c.json({
            success: true,
            message: '수익 배분율 설정 완료',
            settings: {
                category: category || '전체',
                region_code: region_code || '전국',
                hq_rate,
                branch_rate,
                agency_rate,
                dealer_rate,
                member_benefit_rate,
            },
        });
    } catch (error: any) {
        return c.json({ error: '설정 중 오류 발생: ' + error.message }, 500);
    }
});

// 수익 배분율 조회
revenue.get('/commission-settings', async (c) => {
    const db = c.env.DB;
    const { category, region_code } = c.req.query();

    try {
        let query = 'SELECT * FROM commission_settings';
        const params: any[] = [];
        const conditions: string[] = [];

        if (category) {
            conditions.push('category = ?');
            params.push(category);
        }

        if (region_code) {
            conditions.push('region_code = ?');
            params.push(region_code);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY created_at DESC';

        const result = await db.prepare(query).bind(...params).all();

        return c.json({
            settings: result.results || [],
        });
    } catch (error: any) {
        return c.json({ error: '조회 중 오류 발생: ' + error.message }, 500);
    }
});

// 수익 배분 실행 (가맹점 광고비 발생 시 자동 호출)
export async function distributeRevenue(
    db: any,
    merchantId: number,
    amount: number
): Promise<any> {
    try {
        // 가맹점 정보 조회
        const merchant = await db
            .prepare('SELECT * FROM merchants WHERE id = ?')
            .bind(merchantId)
            .first();

        if (!merchant) {
            throw new Error('가맹점을 찾을 수 없습니다');
        }

        // 수익 배분 설정 조회 (우선순위: 업종+지역 > 업종 > 지역 > 전체)
        let settings = await db
            .prepare('SELECT * FROM commission_settings WHERE category = ? AND region_code = ?')
            .bind(merchant.category, merchant.region_code)
            .first();

        if (!settings) {
            settings = await db
                .prepare('SELECT * FROM commission_settings WHERE category = ? AND region_code IS NULL')
                .bind(merchant.category)
                .first();
        }

        if (!settings) {
            settings = await db
                .prepare('SELECT * FROM commission_settings WHERE category IS NULL AND region_code = ?')
                .bind(merchant.region_code)
                .first();
        }

        if (!settings) {
            settings = await db
                .prepare('SELECT * FROM commission_settings WHERE category IS NULL AND region_code IS NULL')
                .first();
        }

        if (!settings) {
            throw new Error('수익 배분 설정을 찾을 수 없습니다');
        }

        // 배분 계산
        const distribution = {
            total: amount,
            hq: amount * (settings.hq_rate / 100),
            branch: amount * (settings.branch_rate / 100),
            agency: amount * (settings.agency_rate / 100),
            dealer: amount * (settings.dealer_rate / 100),
            member_benefit: amount * (settings.member_benefit_rate / 100),
        };

        // 수익 기록 저장
        const result = await db
            .prepare(`
        INSERT INTO revenue_records (
          merchant_id, total_amount,
          hq_amount, branch_id, branch_amount,
          agency_id, agency_amount, dealer_id, dealer_amount,
          member_benefit_amount,
          period_start, period_end, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATE('now'), DATE('now'), 'pending')
      `)
            .bind(
                merchantId,
                distribution.total,
                distribution.hq,
                merchant.branch_id,
                distribution.branch,
                merchant.agency_id,
                distribution.agency,
                merchant.dealer_id,
                distribution.dealer,
                distribution.member_benefit
            )
            .run();

        return {
            success: true,
            revenue_record_id: result.meta.last_row_id,
            distribution,
        };
    } catch (error: any) {
        throw new Error('수익 배분 중 오류 발생: ' + error.message);
    }
}

// 수익 정산 (pending → paid)
revenue.post('/settle', requireHQ, async (c) => {
    const { revenue_record_ids } = await c.req.json();
    const db = c.env.DB;

    if (!Array.isArray(revenue_record_ids) || revenue_record_ids.length === 0) {
        return c.json({ error: '정산할 수익 내역을 선택하세요' }, 400);
    }

    try {
        const placeholders = revenue_record_ids.map(() => '?').join(',');

        await db
            .prepare(`
        UPDATE revenue_records
        SET status = 'paid'
        WHERE id IN (${placeholders}) AND status = 'pending'
      `)
            .bind(...revenue_record_ids)
            .run();

        return c.json({
            success: true,
            message: `${revenue_record_ids.length}건의 수익이 정산되었습니다`,
        });
    } catch (error: any) {
        return c.json({ error: '정산 중 오류 발생: ' + error.message }, 500);
    }
});

export default revenue;
