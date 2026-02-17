// 장바구니 API
// Shopping cart management

import { Hono } from 'hono';

const cart = new Hono();

// 장바구니 조회
cart.get('/', async (c) => {
    const user = c.get('user');
    const db = c.env.DB;

    try {
        const result = await db
            .prepare(`
        SELECT 
          c.*,
          p.name as product_name,
          p.price,
          p.image_url,
          p.stock,
          (p.price * c.quantity) as subtotal
        FROM cart c
        JOIN products p ON p.id = c.product_id
        WHERE c.user_id = ?
        ORDER BY c.created_at DESC
      `)
            .bind(user.id)
            .all();

        const items = result.results || [];
        const total = items.reduce((sum: number, item: any) => sum + item.subtotal, 0);

        return c.json({
            cart_items: items,
            total_items: items.length,
            total_price: total,
        });
    } catch (error: any) {
        return c.json({ error: '조회 중 오류 발생: ' + error.message }, 500);
    }
});

// 장바구니에 상품 추가
cart.post('/add', async (c) => {
    const user = c.get('user');
    const db = c.env.DB;
    const { product_id, quantity = 1 } = await c.req.json();

    try {
        // 상품 존재 확인
        const product = await db
            .prepare('SELECT * FROM products WHERE id = ?')
            .bind(product_id)
            .first();

        if (!product) {
            return c.json({ error: '상품을 찾을 수 없습니다' }, 404);
        }

        // 재고 확인
        if (product.stock < quantity) {
            return c.json({ error: '재고가 부족합니다' }, 400);
        }

        // 이미 장바구니에 있는지 확인
        const existing = await db
            .prepare('SELECT * FROM cart WHERE user_id = ? AND product_id = ?')
            .bind(user.id, product_id)
            .first();

        if (existing) {
            // 수량 업데이트
            await db
                .prepare('UPDATE cart SET quantity = quantity + ? WHERE id = ?')
                .bind(quantity, existing.id)
                .run();
        } else {
            // 새로 추가
            await db
                .prepare('INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)')
                .bind(user.id, product_id, quantity)
                .run();
        }

        return c.json({
            success: true,
            message: '장바구니에 추가되었습니다',
        });
    } catch (error: any) {
        return c.json({ error: '추가 중 오류 발생: ' + error.message }, 500);
    }
});

// 장바구니 수량 변경
cart.put('/:cart_id', async (c) => {
    const user = c.get('user');
    const db = c.env.DB;
    const cartId = c.req.param('cart_id');
    const { quantity } = await c.req.json();

    if (quantity < 1) {
        return c.json({ error: '수량은 1개 이상이어야 합니다' }, 400);
    }

    try {
        // 장바구니 항목 확인
        const cartItem = await db
            .prepare('SELECT * FROM cart WHERE id = ? AND user_id = ?')
            .bind(cartId, user.id)
            .first();

        if (!cartItem) {
            return c.json({ error: '장바구니 항목을 찾을 수 없습니다' }, 404);
        }

        // 재고 확인
        const product = await db
            .prepare('SELECT * FROM products WHERE id = ?')
            .bind(cartItem.product_id)
            .first();

        if (product && product.stock < quantity) {
            return c.json({ error: '재고가 부족합니다' }, 400);
        }

        // 수량 업데이트
        await db
            .prepare('UPDATE cart SET quantity = ? WHERE id = ?')
            .bind(quantity, cartId)
            .run();

        return c.json({
            success: true,
            message: '수량이 변경되었습니다',
        });
    } catch (error: any) {
        return c.json({ error: '변경 중 오류 발생: ' + error.message }, 500);
    }
});

// 장바구니 항목 삭제
cart.delete('/:cart_id', async (c) => {
    const user = c.get('user');
    const db = c.env.DB;
    const cartId = c.req.param('cart_id');

    try {
        await db
            .prepare('DELETE FROM cart WHERE id = ? AND user_id = ?')
            .bind(cartId, user.id)
            .run();

        return c.json({
            success: true,
            message: '장바구니에서 삭제되었습니다',
        });
    } catch (error: any) {
        return c.json({ error: '삭제 중 오류 발생: ' + error.message }, 500);
    }
});

// 장바구니 비우기
cart.delete('/', async (c) => {
    const user = c.get('user');
    const db = c.env.DB;

    try {
        await db
            .prepare('DELETE FROM cart WHERE user_id = ?')
            .bind(user.id)
            .run();

        return c.json({
            success: true,
            message: '장바구니가 비워졌습니다',
        });
    } catch (error: any) {
        return c.json({ error: '삭제 중 오류 발생: ' + error.message }, 500);
    }
});

export default cart;
