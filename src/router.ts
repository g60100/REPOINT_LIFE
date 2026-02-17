// 메인 라우터 통합
// Main router integration

import { Hono } from 'hono';
import approval from './routes/approval';
import stats from './routes/stats';
import revenue from './routes/revenue';
import coupons from './routes/coupons';
import merchants from './routes/merchants';
import regions from './routes/regions';
import products from './routes/products';
import cart from './routes/cart';
import orders from './routes/orders';
import shopping from './routes/shopping';
import viral from './routes/viral';
import automation from './routes/ai-automation';
import trends from './routes/trends';
import influencer from './routes/influencer';
import reviews from './routes/reviews';
import points from './routes/points';
import settlement from './routes/settlement';
import subscription from './routes/subscription';

const app = new Hono();

// API 라우트 등록
app.route('/api/approval', approval);
app.route('/api/stats', stats);
app.route('/api/revenue', revenue);
app.route('/api/coupons', coupons);
app.route('/api/merchants', merchants);
app.route('/api/regions', regions);
app.route('/api/products', products);
app.route('/api/cart', cart);
app.route('/api/orders', orders);
app.route('/api/shopping', shopping);
app.route('/api/viral', viral);
app.route('/api/automation', automation);
app.route('/api/trends', trends);
app.route('/api/influencer', influencer);
app.route('/api/reviews', reviews);
app.route('/api/points', points);
app.route('/api/settlement', settlement);
app.route('/api/subscription', subscription);

// 헬스 체크
app.get('/api/health', (c) => {
    return c.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '5.0.0',
    });
});

export default app;
