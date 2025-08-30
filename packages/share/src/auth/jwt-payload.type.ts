export type JwtPayload = {
    sub: string;
    email: string;
    role?: 'USER' | 'ADMIN';
    orgId?: string;
    iat?: number; // Issued at timestamp
    exp?: number; // Expiration timestamp
}