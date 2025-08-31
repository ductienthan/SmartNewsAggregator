import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, StrategyOptionsWithRequest } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { JwtPayload } from '@snag/share';
import { TokenBlacklistService } from '../services/token-blacklist.service';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly tokenBlacklistService: TokenBlacklistService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: true, // We'll handle expiration manually
      secretOrKey: configService.get<string>('JWT_ACCESS_SECRET'),
      passReqToCallback: true, // Allow access to request object
    } as StrategyOptionsWithRequest);
  }

  async validate(request: Request): Promise<JwtPayload> {
    try {
      // Extract token from request
      const token = this.extractTokenFromRequest(request);
      if (!token) {
        throw new UnauthorizedException('No token provided');
      }

      // Decode and verify token
      const payload = await this.verifyAndDecodeToken(token);
      
      this.logger.log(`Validating JWT for user: ${payload.sub}`);

      // Check if token is blacklisted
      const isBlacklisted = await this.tokenBlacklistService.isTokenBlacklisted(token);
      if (isBlacklisted) {
        this.logger.warn(`Blacklisted token used for user: ${payload.sub}`);
        throw new UnauthorizedException('Token has been revoked');
      }

      // Validate payload structure
      if (!payload.sub || !payload.email || !payload.role) {
        this.logger.warn(`Invalid token payload for user: ${payload.sub}`);
        throw new UnauthorizedException('Invalid token payload');
      }

      // Check if user still exists (optional - you can add this if needed)
      // const user = await this.userService.findById(payload.sub);
      // if (!user) {
      //   throw new UnauthorizedException('User no longer exists');
      // }

      this.logger.log(`JWT validation successful for user: ${payload.sub}`);

      // Return the payload to be attached to the request
      return {
        sub: payload.sub,
        email: payload.email,
        role: payload.role,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`JWT validation failed: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Verify and decode JWT token with custom expiration checks
   */
  private async verifyAndDecodeToken(token: string): Promise<JwtPayload> {
    try {
      const secret = this.configService.get<string>('JWT_ACCESS_SECRET');
      
      if (!secret) {
        throw new UnauthorizedException('JWT secret not configured');
      }

      // Decode token without verification first to get payload
      const decoded = jwt.decode(token) as any;
      if (!decoded || typeof decoded === 'string') {
        throw new UnauthorizedException('Invalid token format');
      }

      // Check if token has expiration
      if (!decoded.exp) {
        throw new UnauthorizedException('Token has no expiration');
      }

      const currentTime = Math.floor(Date.now() / 1000);
      const tokenExp = decoded.exp as number;
      const tokenIat = (decoded.iat as number) || 0;

      // Check if token is expired
      if (currentTime > tokenExp) {
        this.logger.warn(`Token expired for user: ${decoded.sub}`);
        throw new UnauthorizedException('Token has expired');
      }

      // Check maximum expiry (6 hours = 21600 seconds)
      const maxExpiry = 6 * 60 * 60; // 6 hours in seconds
      const tokenAge = currentTime - tokenIat;
      
      if (tokenAge > maxExpiry) {
        this.logger.warn(`Token exceeded maximum expiry (6h) for user: ${decoded.sub}, age: ${tokenAge}s`);
        throw new UnauthorizedException('Token has exceeded maximum validity period. Please sign in again.');
      }

      // Verify token signature
      const verified = jwt.verify(token, secret) as JwtPayload;
      
      this.logger.log(`Token verified successfully for user: ${decoded.sub}, age: ${tokenAge}s`);
      
      return verified;
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      const errorObj = error as any;
      if (errorObj?.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Invalid token signature');
      }
      
      if (errorObj?.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token has expired');
      }
      
      this.logger.error('Token verification failed:', error);
      throw new UnauthorizedException('Token verification failed');
    }
  }

  private extractTokenFromRequest(request: Request): string | null {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7); // Remove 'Bearer ' prefix
  }
} 