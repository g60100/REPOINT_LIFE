// 쿠폰 및 할인 시스템 API
// Coupon and discount system

import { Hono } from 'hono';
import { requireMerchant } from '../middleware/auth';

const coupons = new Hono();

// 가맹점: 쿠폰 생성
coupons.post('/merchant/create', requireMerchant, async (c) => {
    const user = c.get('user');
    const db = c.env.DB;

    const {
        title,
        description,
        discount_type, // 'percentage' or 'fixed_amount'
        discount_value,
        min_purchase,
        max_discount,
        valid_from,
        valid_until,
        usage_limit,
    } = await c.req.json();

    try {
        // 가맹점 정보 조회
        const merchant = await db
            .prepare('SELECT * FROM merchants WHERE user_id = ?')
            .bind(user.id)
            .first();

        if (!merchant) {
            return c.json({ error: '가맹점 정보를 찾을 수 없습니다' }, 404);
        }

        // 쿠폰 생성
        const result = await db
            .prepare(`
        INSERT INTO merchant_coupons (
          merchant_id, title, description,
          discount_type, discount_value,
          min_purchase, max_discount,
          valid_from, valid_until, usage_limit
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
            .bind(
                merchant.id,
                title,
                description,
                discount_type,
                discount_value,
                min_purchase || 0,
                max_discount || null,
                valid_from || null,
                valid_until,
                usage_limit || null
            )
            .run();

        return c.json({
            success: true,
            message: '쿠폰 생성 완료',
            coupon_id: result.meta.last_row_id,
            coupon: {
                title,
                discount_type,
                discount_value,
                valid_until,
            },
        });
    } catch (error: any) {
        return c.json({ error: '쿠폰 생성 중 오류 발생: ' + error.message }, 500);
    }
});

// 가맹점: 내 쿠폰 목록 조회
coupons.get('/merchant/my-coupons', requireMerchant, async (c) => {
    const user = c.get('user');
    const db = c.env.DB;

    try {
        // 가맹점 정보 조회
        const merchant = await db
            .prepare('SELECT * FROM merchants WHERE user_id = ?')
            .bind(user.id)
            .first();

        if (!merchant) {
            return c.json({ error: '가맹점 정보를 찾을 수 없습니다' }, 404);
        }

        // 쿠폰 목록 조회
        const result = await db
            .prepare(`
        SELECT 
          c.*,
          (SELECT COUNT(*) FROM coupon_usage WHERE coupon_id = c.id) as used_count
        FROM merchant_coupons c
        WHERE c.merchant_id = ?
        ORDER BY c.created_at DESC
      `)
            .bind(merchant.id)
            .all();

        return c.json({
            coupons: result.results || [],
            total: result.results?.length || 0,
        });
    } catch (error: any) {
        return c.json({ error: '조회 중 오류 발생: ' + error.message }, 500);
    }
});

// 가맹점: 쿠폰 수정
coupons.put('/merchant/update/:coupon_id', requireMerchant, async (c) => {
    const user = c.get('user');
    const db = c.env.DB;
    const couponId = c.req.param('coupon_id');

    const {
        title,
        description,
        discount_value,
        min_purchase,
        max_discount,
        valid_until,
        usage_limit,
        status,
    } = await c.req.json();

    try {
        // 가맹점 정보 조회
        const merchant = await db
            .prepare('SELECT * FROM merchants WHERE user_id = ?')
            .bind(user.id)
            .first();

        if (!merchant) {
            return c.json({ error: '가맹점 정보를 찾을 수 없습니다' }, 404);
        }

        // 쿠폰 소유권 확인
        const coupon = await db
            .prepare('SELECT * FROM merchant_coupons WHERE id = ? AND merchant_id = ?')
            .bind(couponId, merchant.id)
            .first();

        if (!coupon) {
            return c.json({ error: '쿠폰을 찾을 수 없거나 권한이 없습니다' }, 404);
        }

        // 쿠폰 수정
        await db
            .prepare(`
        UPDATE merchant_coupons
        SET title = ?,
            description = ?,
            discount_value = ?,
            min_purchase = ?,
            max_discount = ?,
            valid_until = ?,
            usage_limit = ?,
            status = ?
        WHERE id = ?
      `)
            .bind(
                title || coupon.title,
                description || coupon.description,
                discount_value || coupon.discount_value,
                min_purchase !== undefined ? min_purchase : coupon.min_purchase,
                max_discount !== undefined ? max_discount : coupon.max_discount,
                valid_until || coupon.valid_until,
                usage_limit !== undefined ? usage_limit : coupon.usage_limit,
                status || coupon.status,
                couponId
            )
            .run();

        return c.json({
            success: true,
            message: '쿠폰 수정 완료',
        });
    } catch (error: any) {
        return c.json({ error: '쿠폰 수정 중 오류 발생: ' + error.message }, 500);
    }
});

// 가맹점: 쿠폰 삭제
coupons.delete('/merchant/delete/:coupon_id', requireMerchant, async (c) => {
    const user = c.get('user');
    const db = c.env.DB;
    const couponId = c.req.param('coupon_id');

    try {
        // 가맹점 정보 조회
        const merchant = await db
            .prepare('SELECT * FROM merchants WHERE user_id = ?')
            .bind(user.id)
            .first();

        if (!merchant) {
            return c.json({ error: '가맹점 정보를 찾을 수 없습니다' }, 404);
        }

        // 쿠폰 소유권 확인
        const coupon = await db
            .prepare('SELECT * FROM merchant_coupons WHERE id = ? AND merchant_id = ?')
            .bind(couponId, merchant.id)
            .first();

        if (!coupon) {
            return c.json({ error: '쿠폰을 찾을 수 없거나 권한이 없습니다' }, 404);
        }

        // 쿠폰 삭제
        await db
            .prepare('DELETE FROM merchant_coupons WHERE id = ?')
            .bind(couponId)
            .run();

        return c.json({
            success: true,
            message: '쿠폰 삭제 완료',
        });
    } catch (error: any) {
        return c.json({ error: '쿠폰 삭제 중 오류 발생: ' + error.message }, 500);
    }
});

// 회원: 가맹점 쿠폰 목록 조회
coupons.get('/merchant/:merchant_id/coupons', async (c) => {
    const db = c.env.DB;
    const merchantId = c.req.param('merchant_id');

    try {
        const result = await db
            .prepare(`
        SELECT *
        FROM merchant_coupons
        WHERE merchant_id = ?
        AND status = 'active'
        AND (valid_from IS NULL OR valid_from <= DATE('now'))
        AND (valid_until IS NULL OR valid_until >= DATE('now'))
        AND (usage_limit IS NULL OR used_count < usage_limit)
        ORDER BY created_at DESC
      `)
            .bind(merchantId)
            .all();

        return c.json({
            coupons: result.results || [],
        });
    } catch (error: any) {
        return c.json({ error: '조회 중 오류 발생: ' + error.message }, 500);
    }
});

// 회원: 쿠폰 사용
coupons.post('/use/:coupon_id', async (c) => {
    const user = c.get('user');
    const db = c.env.DB;
    const couponId = c.req.param('coupon_id');

    const { purchase_amount } = await c.req.json();

    try {
        // 쿠폰 조회
        const coupon = await db
            .prepare('SELECT * FROM merchant_coupons WHERE id = ?')
            .bind(couponId)
            .first();

        if (!coupon) {
            return c.json({ error: '쿠폰을 찾을 수 없습니다' }, 404);
        }

        // 쿠폰 유효성 검증
        if (coupon.status !== 'active') {
            return c.json({ error: '비활성화된 쿠폰입니다' }, 400);
        }

        // 유효 기간 확인
        const now = new Date().toISOString().split('T')[0];
        if (coupon.valid_from && coupon.valid_from > now) {
            return c.json({ error: '아직 사용할 수 없는 쿠폰입니다' }, 400);
        }
        if (coupon.valid_until && coupon.valid_until < now) {
            return c.json({ error: '만료된 쿠폰입니다' }, 400);
        }

        // 최소 구매 금액 확인
        if (purchase_amount < coupon.min_purchase) {
            return c.json({
                error: `최소 구매 금액 ${coupon.min_purchase}원 이상이어야 합니다`
            }, 400);
        }

        // 사용 횟수 확인
        if (coupon.usage_limit) {
            const usageCount = await db
                .prepare('SELECT COUNT(*) as count FROM coupon_usage WHERE coupon_id = ?')
                .bind(couponId)
                .first();

            if (usageCount && usageCount.count >= coupon.usage_limit) {
                return c.json({ error: '쿠폰 사용 한도를 초과했습니다' }, 400);
            }
        }

        // 할인 금액 계산
        let discountAmount = 0;
        if (coupon.discount_type === 'percentage') {
            discountAmount = purchase_amount * (coupon.discount_value / 100);
            if (coupon.max_discount && discountAmount > coupon.max_discount) {
                discountAmount = coupon.max_discount;
            }
        } else {
            discountAmount = coupon.discount_value;
        }

        // 쿠폰 사용 기록
        await db
            .prepare(`
        INSERT INTO coupon_usage (
          coupon_id, user_id, merchant_id, discount_amount
        ) VALUES (?, ?, ?, ?)
      `)
            .bind(couponId, user.id, coupon.merchant_id, discountAmount)
            .run();

        // 사용 횟수 업데이트
        await db
            .prepare('UPDATE merchant_coupons SET used_count = used_count + 1 WHERE id = ?')
            .bind(couponId)
            .run();

        return c.json({
            success: true,
            message: '쿠폰 사용 완료',
            discount_amount: discountAmount,
            final_amount: purchase_amount - discountAmount,
        });
    } catch (error: any) {
        return c.json({ error: '쿠폰 사용 중 오류 발생: ' + error.message }, 500);
    }
});

// 회원: 내 쿠폰 사용 내역
coupons.get('/my-usage', async (c) => {
    const user = c.get('user');
    const db = c.env.DB;

    try {
        const result = await db
            .prepare(`
        SELECT 
          cu.*,
          mc.title as coupon_title,
          m.business_name as merchant_name
        FROM coupon_usage cu
        JOIN merchant_coupons mc ON mc.id = cu.coupon_id
        JOIN merchants m ON m.id = cu.merchant_id
        WHERE cu.user_id = ?
        ORDER BY cu.used_at DESC
        LIMIT 100
      `)
            .bind(user.id)
            .all();

        return c.json({
            usage_history: result.results || [],
        });
    } catch (error: any) {
        return c.json({ error: '조회 중 오류 발생: ' + error.message }, 500);
    }
});

// 가맹점 할인율 설정
coupons.put('/merchant/discount-rate', requireMerchant, async (c) => {
    const user = c.get('user');
    const db = c.env.DB;

    const { discount_rate } = await c.req.json();

    if (discount_rate < 0 || discount_rate > 100) {
        return c.json({ error: '할인율은 0~100% 사이여야 합니다' }, 400);
    }

    try {
        // 가맹점 정보 조회
        const merchant = await db
            .prepare('SELECT * FROM merchants WHERE user_id = ?')
            .bind(user.id)
            .first();

        if (!merchant) {
            return c.json({ error: '가맹점 정보를 찾을 수 없습니다' }, 404);
        }

        // 할인율 업데이트
        await db
            .prepare('UPDATE merchants SET discount_rate = ? WHERE id = ?')
            .bind(discount_rate, merchant.id)
            .run();

        return c.json({
            success: true,
            message: '할인율 설정 완료',
            discount_rate,
        });
    } catch (error: any) {
        return c.json({ error: '설정 중 오류 발생: ' + error.message }, 500);
    }
});

export default coupons;
