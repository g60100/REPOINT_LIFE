// 지역 관리 API
// Region management APIs

import { Hono } from 'hono';
import { requireHQ } from '../middleware/auth';

const regions = new Hono();

// 지역 목록 조회
regions.get('/', async (c) => {
    const db = c.env.DB;
    const { level, parent_code } = c.req.query();

    try {
        let query = 'SELECT * FROM regions WHERE 1=1';
        const params: any[] = [];

        if (level) {
            query += ' AND level = ?';
            params.push(parseInt(level));
        }

        if (parent_code) {
            query += ' AND parent_code = ?';
            params.push(parent_code);
        }

        query += ' ORDER BY level, name';

        const result = await db.prepare(query).bind(...params).all();

        return c.json({
            regions: result.results || [],
        });
    } catch (error: any) {
        return c.json({ error: '조회 중 오류 발생: ' + error.message }, 500);
    }
});

// 지역 생성 (본사만)
regions.post('/', requireHQ, async (c) => {
    const db = c.env.DB;
    const { code, name, level, parent_code } = await c.req.json();

    try {
        await db
            .prepare(`
        INSERT INTO regions (code, name, level, parent_code)
        VALUES (?, ?, ?, ?)
      `)
            .bind(code, name, level, parent_code)
            .run();

        return c.json({
            success: true,
            message: '지역 생성 완료',
        });
    } catch (error: any) {
        return c.json({ error: '생성 중 오류 발생: ' + error.message }, 500);
    }
});

// 지역 담당자 조회
regions.get('/:code/manager', async (c) => {
    const db = c.env.DB;
    const code = c.req.param('code');

    try {
        const result = await db
            .prepare(`
        SELECT 
          r.code,
          r.name,
          u.id as manager_id,
          u.name as manager_name,
          u.email as manager_email,
          u.role as manager_role
        FROM regions r
        LEFT JOIN users u ON u.id = r.manager_id
        WHERE r.code = ?
      `)
            .bind(code)
            .first();

        return c.json({ region: result });
    } catch (error: any) {
        return c.json({ error: '조회 중 오류 발생: ' + error.message }, 500);
    }
});

export default regions;
