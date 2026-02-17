// 주문 관리 API
// Order management

import { Hono } from 'hono';

const orders = new Hono();

// 주문 생성
orders.post('/create', async (c) => {
    const user = c.get('user');
    const db = c.env.DB;

    const {
        items, // [{ product_id, quantity, option_id }]
        shipping_info,
        points_to_use = 0,
    } = await c.req.json();

    try {
        // 장바구니 항목 조회
        let totalPrice = 0;
        const orderItems = [];

        for (const item of items) {
            const product = await db
                .prepare('SELECT * FROM products WHERE id = ?')
                .bind(item.product_id)
                .first();

            if (!product) {
                return c.json({ error: `상품 ID ${item.product_id}를 찾을 수 없습니다` }, 404);
            }

            if (product.stock < item.quantity) {
                return c.json({ error: `${product.name} 재고가 부족합니다` }, 400);
            }

            let itemPrice = product.price;

            // 옵션 가격 추가
            if (item.option_id) {
                const option = await db
                    .prepare('SELECT * FROM product_options WHERE id = ?')
                    .bind(item.option_id)
                    .first();

                if (option) {
                    itemPrice += option.price_adjustment;
                }
            }

            const itemTotal = itemPrice * item.quantity;
            totalPrice += itemTotal;

            orderItems.push({
                product_id: item.product_id,
                option_id: item.option_id || null,
                quantity: item.quantity,
                unit_price: itemPrice,
                total_price: itemTotal,
            });
        }

        // 포인트 사용 검증
        if (points_to_use > user.points) {
            return c.json({ error: '보유 포인트가 부족합니다' }, 400);
        }

        if (points_to_use > totalPrice) {
            return c.json({ error: '포인트 사용 금액이 주문 금액을 초과할 수 없습니다' }, 400);
        }

        const finalPrice = totalPrice - points_to_use;
        const pointsEarned = Math.floor(finalPrice * 0.01); // 1% 적립

        // 주문 생성
        const orderResult = await db
            .prepare(`
        INSERT INTO orders (
          user_id, order_type, total_price,
          points_used, points_earned, status
        ) VALUES (?, 'online', ?, ?, ?, 'pending')
      `)
            .bind(user.id, finalPrice, points_to_use, pointsEarned)
            .run();

        const orderId = orderResult.meta.last_row_id;

        // 주문 항목 추가
        for (const item of orderItems) {
            await db
                .prepare(`
          INSERT INTO order_items (
            order_id, product_id, product_option_id,
            quantity, unit_price, total_price
          ) VALUES (?, ?, ?, ?, ?, ?)
        `)
                .bind(
                    orderId,
                    item.product_id,
                    item.option_id,
                    item.quantity,
                    item.unit_price,
                    item.total_price
                )
                .run();

            // 재고 감소
            await db
                .prepare('UPDATE products SET stock = stock - ? WHERE id = ?')
                .bind(item.quantity, item.product_id)
                .run();
        }

        // 배송 정보 저장
        await db
            .prepare(`
        INSERT INTO shipping_info (
          order_id, recipient_name, recipient_phone,
          postal_code, address, address_detail, delivery_request
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
            .bind(
                orderId,
                shipping_info.recipient_name,
                shipping_info.recipient_phone,
                shipping_info.postal_code,
                shipping_info.address,
                shipping_info.address_detail,
                shipping_info.delivery_request
            )
            .run();

        // 포인트 차감 및 적립
        if (points_to_use > 0) {
            await db
                .prepare('UPDATE users SET points = points - ? WHERE id = ?')
                .bind(points_to_use, user.id)
                .run();

            await db
                .prepare(`
          INSERT INTO points_history (user_id, amount, type, description)
          VALUES (?, ?, 'use', '주문 결제')
        `)
                .bind(user.id, -points_to_use)
                .run();
        }

        await db
            .prepare('UPDATE users SET points = points + ? WHERE id = ?')
            .bind(pointsEarned, user.id)
            .run();

        await db
            .prepare(`
        INSERT INTO points_history (user_id, amount, type, description)
        VALUES (?, ?, 'earn', '주문 적립')
      `)
            .bind(user.id, pointsEarned)
            .run();

        // 장바구니 비우기
        await db
            .prepare('DELETE FROM cart WHERE user_id = ?')
            .bind(user.id)
            .run();

        return c.json({
            success: true,
            message: '주문이 완료되었습니다',
            order_id: orderId,
            total_price: finalPrice,
            points_earned: pointsEarned,
        });
    } catch (error: any) {
        return c.json({ error: '주문 중 오류 발생: ' + error.message }, 500);
    }
});

// 주문 목록 조회
orders.get('/', async (c) => {
    const user = c.get('user');
    const db = c.env.DB;

    try {
        const result = await db
            .prepare(`
        SELECT 
          o.*,
          COUNT(oi.id) as item_count
        FROM orders o
        LEFT JOIN order_items oi ON oi.order_id = o.id
        WHERE o.user_id = ?
        GROUP BY o.id
        ORDER BY o.created_at DESC
        LIMIT 50
      `)
            .bind(user.id)
            .all();

        return c.json({
            orders: result.results || [],
        });
    } catch (error: any) {
        return c.json({ error: '조회 중 오류 발생: ' + error.message }, 500);
    }
});

// 주문 상세 조회
orders.get('/:order_id', async (c) => {
    const user = c.get('user');
    const db = c.env.DB;
    const orderId = c.req.param('order_id');

    try {
        const order = await db
            .prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?')
            .bind(orderId, user.id)
            .first();

        if (!order) {
            return c.json({ error: '주문을 찾을 수 없습니다' }, 404);
        }

        // 주문 항목
        const items = await db
            .prepare(`
        SELECT 
          oi.*,
          p.name as product_name,
          p.image_url
        FROM order_items oi
        JOIN products p ON p.id = oi.product_id
        WHERE oi.order_id = ?
      `)
            .bind(orderId)
            .all();

        // 배송 정보
        const shipping = await db
            .prepare('SELECT * FROM shipping_info WHERE order_id = ?')
            .bind(orderId)
            .first();

        return c.json({
            order: {
                ...order,
                items: items.results || [],
                shipping: shipping || null,
            },
        });
    } catch (error: any) {
        return c.json({ error: '조회 중 오류 발생: ' + error.message }, 500);
    }
});

// 주문 취소
orders.post('/:order_id/cancel', async (c) => {
    const user = c.get('user');
    const db = c.env.DB;
    const orderId = c.req.param('order_id');

    try {
        const order = await db
            .prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?')
            .bind(orderId, user.id)
            .first();

        if (!order) {
            return c.json({ error: '주문을 찾을 수 없습니다' }, 404);
        }

        if (order.status !== 'pending') {
            return c.json({ error: '취소할 수 없는 주문 상태입니다' }, 400);
        }

        // 주문 상태 변경
        await db
            .prepare('UPDATE orders SET status = \'cancelled\' WHERE id = ?')
            .bind(orderId)
            .run();

        // 재고 복구
        const items = await db
            .prepare('SELECT * FROM order_items WHERE order_id = ?')
            .bind(orderId)
            .all();

        for (const item of items.results || []) {
            await db
                .prepare('UPDATE products SET stock = stock + ? WHERE id = ?')
                .bind(item.quantity, item.product_id)
                .run();
        }

        // 포인트 환불
        if (order.points_used > 0) {
            await db
                .prepare('UPDATE users SET points = points + ? WHERE id = ?')
                .bind(order.points_used, user.id)
                .run();

            await db
                .prepare(`
          INSERT INTO points_history (user_id, amount, type, description)
          VALUES (?, ?, 'refund', '주문 취소 환불')
        `)
                .bind(user.id, order.points_used)
                .run();
        }

        // 적립 포인트 회수
        if (order.points_earned > 0) {
            await db
                .prepare('UPDATE users SET points = points - ? WHERE id = ?')
                .bind(order.points_earned, user.id)
                .run();

            await db
                .prepare(`
          INSERT INTO points_history (user_id, amount, type, description)
          VALUES (?, ?, 'use', '주문 취소 적립 회수')
        `)
                .bind(user.id, -order.points_earned)
                .run();
        }

        return c.json({
            success: true,
            message: '주문이 취소되었습니다',
        });
    } catch (error: any) {
        return c.json({ error: '취소 중 오류 발생: ' + error.message }, 500);
    }
});

export default orders;
