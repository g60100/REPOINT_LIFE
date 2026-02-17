// 역할별 권한 미들웨어
// Role-based authorization middleware

import { Context, Next } from 'hono';

// 사용자 역할 타입
export type UserRole = 'user' | 'merchant' | 'dealer' | 'agency' | 'branch' | 'hq' | 'admin';

// 역할 계층 구조 (숫자가 클수록 높은 권한)
const ROLE_HIERARCHY: Record<UserRole, number> = {
    user: 0,
    merchant: 1,
    dealer: 2,
    agency: 3,
    branch: 4,
    hq: 5,
    admin: 6, // 최고 권한
};

// 역할 체크 헬퍼 함수
export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
    return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

// 본사(HQ) 권한 필요
export function requireHQ(c: Context, next: Next) {
    const user = c.get('user');

    if (!user) {
        return c.json({ error: '인증이 필요합니다' }, 401);
    }

    if (!hasRole(user.role, 'hq')) {
        return c.json({ error: '본사 권한이 필요합니다' }, 403);
    }

    return next();
}

// 지사(Branch) 이상 권한 필요
export function requireBranch(c: Context, next: Next) {
    const user = c.get('user');

    if (!user) {
        return c.json({ error: '인증이 필요합니다' }, 401);
    }

    if (!hasRole(user.role, 'branch')) {
        return c.json({ error: '지사 이상 권한이 필요합니다' }, 403);
    }

    return next();
}

// 대리점(Agency) 이상 권한 필요
export function requireAgency(c: Context, next: Next) {
    const user = c.get('user');

    if (!user) {
        return c.json({ error: '인증이 필요합니다' }, 401);
    }

    if (!hasRole(user.role, 'agency')) {
        return c.json({ error: '대리점 이상 권한이 필요합니다' }, 403);
    }

    return next();
}

// 딜러(Dealer) 이상 권한 필요
export function requireDealer(c: Context, next: Next) {
    const user = c.get('user');

    if (!user) {
        return c.json({ error: '인증이 필요합니다' }, 401);
    }

    if (!hasRole(user.role, 'dealer')) {
        return c.json({ error: '딜러 이상 권한이 필요합니다' }, 403);
    }

    return next();
}

// 가맹점(Merchant) 이상 권한 필요
export function requireMerchant(c: Context, next: Next) {
    const user = c.get('user');

    if (!user) {
        return c.json({ error: '인증이 필요합니다' }, 401);
    }

    if (!hasRole(user.role, 'merchant')) {
        return c.json({ error: '가맹점 이상 권한이 필요합니다' }, 403);
    }

    return next();
}

// 지역 권한 체크
export async function checkRegionPermission(
    c: Context,
    targetRegionCode: string
): Promise<boolean> {
    const user = c.get('user');
    const db = c.env.DB;

    // 본사와 관리자는 모든 지역 접근 가능
    if (hasRole(user.role, 'hq')) {
        return true;
    }

    // 사용자의 지역 코드가 없으면 권한 없음
    if (!user.region_code) {
        return false;
    }

    // 타겟 지역이 사용자 지역의 하위인지 확인
    // 예: user.region_code = 'seoul', targetRegionCode = 'seoul-gangnam' → OK
    // 예: user.region_code = 'seoul-gangnam', targetRegionCode = 'seoul' → NO
    return targetRegionCode.startsWith(user.region_code);
}

// 상위 조직 확인
export async function getParentOrganization(
    c: Context,
    userId: number
): Promise<any> {
    const db = c.env.DB;

    const result = await db
        .prepare('SELECT * FROM users WHERE id = ?')
        .bind(userId)
        .first();

    if (!result || !result.parent_id) {
        return null;
    }

    return await db
        .prepare('SELECT * FROM users WHERE id = ?')
        .bind(result.parent_id)
        .first();
}

// 하위 조직 목록 조회
export async function getSubOrganizations(
    c: Context,
    userId: number,
    role?: UserRole
): Promise<any[]> {
    const db = c.env.DB;

    let query = 'SELECT * FROM users WHERE parent_id = ?';
    const params: any[] = [userId];

    if (role) {
        query += ' AND role = ?';
        params.push(role);
    }

    const result = await db.prepare(query).bind(...params).all();
    return result.results || [];
}
