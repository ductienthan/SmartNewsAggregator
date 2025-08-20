export type JwtPayload = {
    sub: string;
    email: string;
    role?: 'USER' | 'ADMIN';
    orgId?: string
}