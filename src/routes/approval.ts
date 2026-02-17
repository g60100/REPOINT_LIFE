// 승인 시스템 API
// Approval system APIs for multi-level organization

import { Hono } from 'hono';
import { requireHQ, requireBranch, requireAgency, checkRegionPermission, hasRole } from '../middleware/auth';

const approval = new Hono();

// 본사: 지사 승인
approval.post('/hq/approve-branch', requireHQ, async (c) => {
    const { user_id, region_code } = await c.req.json();
    const currentUser = c.get('user');
    const db = c.env.DB;

    try {
        // 대상 사용자 조회
        const targetUser = await db
            .prepare('SELECT * FROM users WHERE id = ?')
            .bind(user_id)
            .first();

        if (!targetUser) {
            return c.json({ error: '사용자를 찾을 수 없습니다' }, 404);
        }

        // 이미 승인된 경우
        if (targetUser.status === 'active' && targetUser.role === 'branch') {
            return c.json({ error: '이미 승인된 지사입니다' }, 400);
        }

        // 지역 확인
        const region = await db
            .prepare('SELECT * FROM regions WHERE code = ?')
            .bind(region_code)
            .first();

        if (!region || region.level !== 1) {
            return c.json({ error: '유효한 시/도 지역이 아닙니다' }, 400);
        }

        // 지사로 승인
        await db
            .prepare(`
        UPDATE users 
        SET role = 'branch',
            region_code = ?,
            status = 'active',
            approved_by = ?,
            approved_at = CURRENT_TIMESTAMP,
            parent_id = ?
        WHERE id = ?
      `)
            .bind(region_code, currentUser.id, currentUser.id, user_id)
            .run();

        // 지역 담당자 업데이트
        await db
            .prepare('UPDATE regions SET manager_id = ? WHERE code = ?')
            .bind(user_id, region_code)
            .run();

        return c.json({
            success: true,
            message: '지사 승인 완료',
            branch: {
                id: user_id,
                region: region.name,
                region_code: region_code,
            },
        });
    } catch (error: any) {
        return c.json({ error: '승인 처리 중 오류 발생: ' + error.message }, 500);
    }
});

// 지사: 대리점 승인
approval.post('/branch/approve-agency', requireBranch, async (c) => {
    const { user_id, region_code } = await c.req.json();
    const currentUser = c.get('user');
    const db = c.env.DB;

    try {
        // 지역 권한 확인
        const hasPermission = await checkRegionPermission(c, region_code);
        if (!hasPermission) {
            return c.json({ error: '해당 지역에 대한 권한이 없습니다' }, 403);
        }

        // 대상 사용자 조회
        const targetUser = await db
            .prepare('SELECT * FROM users WHERE id = ?')
            .bind(user_id)
            .first();

        if (!targetUser) {
            return c.json({ error: '사용자를 찾을 수 없습니다' }, 404);
        }

        // 지역 확인 (구 단위)
        const region = await db
            .prepare('SELECT * FROM regions WHERE code = ?')
            .bind(region_code)
            .first();

        if (!region || region.level !== 2) {
            return c.json({ error: '유효한 구 지역이 아닙니다' }, 400);
        }

        // 대리점으로 승인
        await db
            .prepare(`
        UPDATE users 
        SET role = 'agency',
            region_code = ?,
            status = 'active',
            approved_by = ?,
            approved_at = CURRENT_TIMESTAMP,
            parent_id = ?
        WHERE id = ?
      `)
            .bind(region_code, currentUser.id, currentUser.id, user_id)
            .run();

        // 지역 담당자 업데이트
        await db
            .prepare('UPDATE regions SET manager_id = ? WHERE code = ?')
            .bind(user_id, region_code)
            .run();

        return c.json({
            success: true,
            message: '대리점 승인 완료',
            agency: {
                id: user_id,
                region: region.name,
                region_code: region_code,
            },
        });
    } catch (error: any) {
        return c.json({ error: '승인 처리 중 오류 발생: ' + error.message }, 500);
    }
});

// 대리점: 딜러 승인
approval.post('/agency/approve-dealer', requireAgency, async (c) => {
    const { user_id, region_code } = await c.req.json();
    const currentUser = c.get('user');
    const db = c.env.DB;

    try {
        // 지역 권한 확인
        const hasPermission = await checkRegionPermission(c, region_code);
        if (!hasPermission) {
            return c.json({ error: '해당 지역에 대한 권한이 없습니다' }, 403);
        }

        // 대상 사용자 조회
        const targetUser = await db
            .prepare('SELECT * FROM users WHERE id = ?')
            .bind(user_id)
            .first();

        if (!targetUser) {
            return c.json({ error: '사용자를 찾을 수 없습니다' }, 404);
        }

        // 지역 확인 (동 단위)
        const region = await db
            .prepare('SELECT * FROM regions WHERE code = ?')
            .bind(region_code)
            .first();

        if (!region || region.level !== 3) {
            return c.json({ error: '유효한 동 지역이 아닙니다' }, 400);
        }

        // 딜러로 승인
        await db
            .prepare(`
        UPDATE users 
        SET role = 'dealer',
            region_code = ?,
            status = 'active',
            approved_by = ?,
            approved_at = CURRENT_TIMESTAMP,
            parent_id = ?
        WHERE id = ?
      `)
            .bind(region_code, currentUser.id, currentUser.id, user_id)
            .run();

        // 지역 담당자 업데이트
        await db
            .prepare('UPDATE regions SET manager_id = ? WHERE code = ?')
            .bind(user_id, region_code)
            .run();

        return c.json({
            success: true,
            message: '딜러 승인 완료',
            dealer: {
                id: user_id,
                region: region.name,
                region_code: region_code,
            },
        });
    } catch (error: any) {
        return c.json({ error: '승인 처리 중 오류 발생: ' + error.message }, 500);
    }
});

// 딜러: 가맹점 등록
approval.post('/dealer/register-merchant', async (c) => {
    const user = c.get('user');
    const db = c.env.DB;

    // 딜러 권한 확인
    if (!hasRole(user.role, 'dealer')) {
        return c.json({ error: '딜러 권한이 필요합니다' }, 403);
    }

    const {
        business_name,
        category,
        address,
        latitude,
        longitude,
        phone,
        description,
    } = await c.req.json();

    try {
        // 상위 조직 조회
        const dealer = user;
        const agency = await db
            .prepare('SELECT * FROM users WHERE id = ?')
            .bind(dealer.parent_id)
            .first();

        const branch = agency ? await db
            .prepare('SELECT * FROM users WHERE id = ?')
            .bind(agency.parent_id)
            .first() : null;

        // 가맹점 등록
        const result = await db
            .prepare(`
        INSERT INTO merchants (
          business_name, category, address, latitude, longitude,
          phone, description,
          dealer_id, agency_id, branch_id, region_code,
          status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
      `)
            .bind(
                business_name,
                category,
                address,
                latitude,
                longitude,
                phone,
                description,
                dealer.id,
                agency?.id || null,
                branch?.id || null,
                dealer.region_code
            )
            .run();

        return c.json({
            success: true,
            message: '가맹점 등록 완료. 승인 대기 중입니다.',
            merchant_id: result.meta.last_row_id,
        });
    } catch (error: any) {
        return c.json({ error: '가맹점 등록 중 오류 발생: ' + error.message }, 500);
    }
});

// 승인 대기 목록 조회
approval.get('/pending-approvals', async (c) => {
    const user = c.get('user');
    const db = c.env.DB;

    try {
        let query = '';
        let params: any[] = [];

        // 역할에 따라 다른 쿼리
        if (hasRole(user.role, 'hq')) {
            // 본사: 모든 대기 중인 지사 신청
            query = `
        SELECT id, email, name, phone, created_at
        FROM users
        WHERE status = 'pending' AND role = 'user'
        ORDER BY created_at DESC
      `;
        } else if (hasRole(user.role, 'branch')) {
            // 지사: 해당 지역의 대기 중인 대리점 신청
            query = `
        SELECT id, email, name, phone, created_at
        FROM users
        WHERE status = 'pending' AND parent_id = ?
        ORDER BY created_at DESC
      `;
            params = [user.id];
        } else if (hasRole(user.role, 'agency')) {
            // 대리점: 해당 지역의 대기 중인 딜러 신청
            query = `
        SELECT id, email, name, phone, created_at
        FROM users
        WHERE status = 'pending' AND parent_id = ?
        ORDER BY created_at DESC
      `;
            params = [user.id];
        } else {
            return c.json({ error: '권한이 없습니다' }, 403);
        }

        const result = await db.prepare(query).bind(...params).all();

        return c.json({
            pending_approvals: result.results || [],
            count: result.results?.length || 0,
        });
    } catch (error: any) {
        return c.json({ error: '조회 중 오류 발생: ' + error.message }, 500);
    }
});

export default approval;
