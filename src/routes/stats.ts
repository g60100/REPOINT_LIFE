// 통계 조회 API
// Statistics APIs for multi-level organization

import { Hono } from 'hono';
import { requireHQ, requireBranch, requireAgency, requireDealer, hasRole } from '../middleware/auth';

const stats = new Hono();

// 본사 통계
stats.get('/hq/stats', requireHQ, async (c) => {
    const db = c.env.DB;

    try {
        // 전체 수익
        const revenueResult = await db
            .prepare(`
        SELECT SUM(total_amount) as total_revenue
        FROM revenue_records
        WHERE status = 'paid'
      `)
            .first();

        // 가맹점 수
        const merchantsResult = await db
            .prepare('SELECT COUNT(*) as count FROM merchants WHERE status = \'active\'')
            .first();

        // 지역별 통계
        const regionStats = await db
            .prepare(`
        SELECT 
          r.code,
          r.name,
          COUNT(m.id) as merchant_count,
          COALESCE(SUM(rev.total_amount), 0) as revenue
        FROM regions r
        LEFT JOIN merchants m ON m.region_code LIKE r.code || '%'
        LEFT JOIN revenue_records rev ON rev.merchant_id = m.id AND rev.status = 'paid'
        WHERE r.level = 1
        GROUP BY r.code, r.name
      `)
            .all();

        // 역할별 통계
        const roleStats = await db
            .prepare(`
        SELECT role, COUNT(*) as count
        FROM users
        WHERE status = 'active'
        GROUP BY role
      `)
            .all();

        return c.json({
            total_revenue: revenueResult?.total_revenue || 0,
            total_merchants: merchantsResult?.count || 0,
            by_region: regionStats.results || [],
            by_role: roleStats.results || [],
        });
    } catch (error: any) {
        return c.json({ error: '통계 조회 중 오류 발생: ' + error.message }, 500);
    }
});

// 지사 통계
stats.get('/branch/stats', requireBranch, async (c) => {
    const user = c.get('user');
    const db = c.env.DB;

    try {
        // 지역 수익
        const revenueResult = await db
            .prepare(`
        SELECT 
          SUM(total_amount) as total_revenue,
          SUM(branch_amount) as my_commission
        FROM revenue_records
        WHERE branch_id = ? AND status = 'paid'
      `)
            .bind(user.id)
            .first();

        // 대리점 수
        const agenciesResult = await db
            .prepare('SELECT COUNT(*) as count FROM users WHERE parent_id = ? AND role = \'agency\'')
            .bind(user.id)
            .first();

        // 딜러 수
        const dealersResult = await db
            .prepare(`
        SELECT COUNT(*) as count
        FROM users
        WHERE parent_id IN (SELECT id FROM users WHERE parent_id = ? AND role = 'agency')
        AND role = 'dealer'
      `)
            .bind(user.id)
            .first();

        // 가맹점 수
        const merchantsResult = await db
            .prepare('SELECT COUNT(*) as count FROM merchants WHERE branch_id = ? AND status = \'active\'')
            .bind(user.id)
            .first();

        return c.json({
            region: user.region_code,
            total_revenue: revenueResult?.total_revenue || 0,
            my_commission: revenueResult?.my_commission || 0,
            agencies: agenciesResult?.count || 0,
            dealers: dealersResult?.count || 0,
            merchants: merchantsResult?.count || 0,
        });
    } catch (error: any) {
        return c.json({ error: '통계 조회 중 오류 발생: ' + error.message }, 500);
    }
});

// 대리점 통계
stats.get('/agency/stats', requireAgency, async (c) => {
    const user = c.get('user');
    const db = c.env.DB;

    try {
        // 지역 수익
        const revenueResult = await db
            .prepare(`
        SELECT 
          SUM(total_amount) as total_revenue,
          SUM(agency_amount) as my_commission
        FROM revenue_records
        WHERE agency_id = ? AND status = 'paid'
      `)
            .bind(user.id)
            .first();

        // 딜러 수
        const dealersResult = await db
            .prepare('SELECT COUNT(*) as count FROM users WHERE parent_id = ? AND role = \'dealer\'')
            .bind(user.id)
            .first();

        // 가맹점 수
        const merchantsResult = await db
            .prepare('SELECT COUNT(*) as count FROM merchants WHERE agency_id = ? AND status = \'active\'')
            .bind(user.id)
            .first();

        return c.json({
            region: user.region_code,
            total_revenue: revenueResult?.total_revenue || 0,
            my_commission: revenueResult?.my_commission || 0,
            dealers: dealersResult?.count || 0,
            merchants: merchantsResult?.count || 0,
        });
    } catch (error: any) {
        return c.json({ error: '통계 조회 중 오류 발생: ' + error.message }, 500);
    }
});

// 딜러 통계
stats.get('/dealer/stats', requireDealer, async (c) => {
    const user = c.get('user');
    const db = c.env.DB;

    try {
        // 지역 수익
        const revenueResult = await db
            .prepare(`
        SELECT 
          SUM(total_amount) as total_revenue,
          SUM(dealer_amount) as my_commission
        FROM revenue_records
        WHERE dealer_id = ? AND status = 'paid'
      `)
            .bind(user.id)
            .first();

        // 가맹점 수
        const merchantsResult = await db
            .prepare('SELECT COUNT(*) as count FROM merchants WHERE dealer_id = ? AND status = \'active\'')
            .bind(user.id)
            .first();

        // 승인 대기 가맹점 수
        const pendingResult = await db
            .prepare('SELECT COUNT(*) as count FROM merchants WHERE dealer_id = ? AND status = \'pending\'')
            .bind(user.id)
            .first();

        return c.json({
            region: user.region_code,
            total_revenue: revenueResult?.total_revenue || 0,
            my_commission: revenueResult?.my_commission || 0,
            merchants: merchantsResult?.count || 0,
            pending_merchants: pendingResult?.count || 0,
        });
    } catch (error: any) {
        return c.json({ error: '통계 조회 중 오류 발생: ' + error.message }, 500);
    }
});

// 수익 내역 조회
stats.get('/revenue-history', async (c) => {
    const user = c.get('user');
    const db = c.env.DB;

    try {
        let query = '';
        let params: any[] = [];

        if (hasRole(user.role, 'hq')) {
            // 본사: 전체 수익 내역
            query = `
        SELECT 
          r.*,
          m.business_name,
          m.category
        FROM revenue_records r
        JOIN merchants m ON m.id = r.merchant_id
        ORDER BY r.created_at DESC
        LIMIT 100
      `;
        } else if (hasRole(user.role, 'branch')) {
            // 지사: 본인 수익 내역
            query = `
        SELECT 
          r.*,
          m.business_name,
          m.category
        FROM revenue_records r
        JOIN merchants m ON m.id = r.merchant_id
        WHERE r.branch_id = ?
        ORDER BY r.created_at DESC
        LIMIT 100
      `;
            params = [user.id];
        } else if (hasRole(user.role, 'agency')) {
            // 대리점: 본인 수익 내역
            query = `
        SELECT 
          r.*,
          m.business_name,
          m.category
        FROM revenue_records r
        JOIN merchants m ON m.id = r.merchant_id
        WHERE r.agency_id = ?
        ORDER BY r.created_at DESC
        LIMIT 100
      `;
            params = [user.id];
        } else if (hasRole(user.role, 'dealer')) {
            // 딜러: 본인 수익 내역
            query = `
        SELECT 
          r.*,
          m.business_name,
          m.category
        FROM revenue_records r
        JOIN merchants m ON m.id = r.merchant_id
        WHERE r.dealer_id = ?
        ORDER BY r.created_at DESC
        LIMIT 100
      `;
            params = [user.id];
        } else {
            return c.json({ error: '권한이 없습니다' }, 403);
        }

        const result = await db.prepare(query).bind(...params).all();

        return c.json({
            revenue_history: result.results || [],
        });
    } catch (error: any) {
        return c.json({ error: '조회 중 오류 발생: ' + error.message }, 500);
    }
});

export default stats;
