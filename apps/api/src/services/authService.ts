import PasswordHasher from 'argon2'
import { Injectable, ConflictException, UnauthorizedException, InternalServerErrorException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { PrismaClient } from '@prisma/client'
import { RegisterUser, AccessTokenResponse, LoginDto, JwtPayload } from '@snag/share'
import { BaseService } from '../common/base/base.service'
import { WithAuthErrorHandling } from '../common/decorators/auto-error-handler.decorator'
import { TokenBlacklistService } from '../common/services/token-blacklist.service'

@Injectable()
export class AuthService extends BaseService {
  constructor(
      private readonly prisma: PrismaClient,
      private readonly jwt: JwtService,
      private readonly cfg: ConfigService,
      private readonly tokenBlacklistService: TokenBlacklistService
  ) {
    super(AuthService.name);
  }
    @WithAuthErrorHandling()
  async registerUser(registerUser: RegisterUser): Promise<AccessTokenResponse> {
    this.logger.log(`Processing registration for email: ${registerUser.email}`);
    
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({ 
      where: { email: registerUser.email.toLowerCase().trim() }
    });
    
    if (existingUser) {
      this.logger.warn(`Registration attempt with existing email: ${registerUser.email}`);
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const hashSecret = this.cfg.get<string>('HASH_SECRET');
    if (!hashSecret) {
      throw new Error('HASH_SECRET environment variable is not configured');
    }
    
    const passwordHash = await PasswordHasher.hash(registerUser.password, {
      secret: Buffer.from(hashSecret)
    });
    
    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: registerUser.email.toLowerCase().trim(),
        passwordHash,
        createdAt: new Date(),
        role: 'USER',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      select: { id: true, email: true, role: true }
    });
    
    this.logger.log(`User created successfully: ${user.id}`);
    
    const payload = { sub: user.id, email: user.email, role: user.role };
    return await this.generateToken(payload);
  }

  @WithAuthErrorHandling()
  async login(loginPayload: LoginDto): Promise<AccessTokenResponse> {
    this.logger.log(`Processing login for email: ${loginPayload.email}`);
    
    const email = loginPayload.email.trim().toLowerCase();
    
    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, passwordHash: true, role: true }
    });
    
    if (!user) {
      this.logger.warn(`Login attempt with non-existent email: ${loginPayload.email}`);
      throw new UnauthorizedException('Invalid email or password');
    }
    
    // Verify password
    const hashSecret = this.cfg.get<string>('HASH_SECRET');
    if (!hashSecret) {
      throw new Error('HASH_SECRET environment variable is not configured');
    }
    
    const passwordMatched = await PasswordHasher.verify(user.passwordHash, loginPayload.password, {
      secret: Buffer.from(hashSecret)
    });
    
    if (!passwordMatched) {
      this.logger.warn(`Invalid password for user: ${loginPayload.email}`);
      throw new UnauthorizedException('Invalid email or password');
    }
    
    this.logger.log(`User logged in successfully: ${user.id}`);
    
    const payload = { sub: user.id, email: user.email, role: user.role };
    return await this.generateToken(payload);
  }

  @WithAuthErrorHandling()
  async generateToken(payload: JwtPayload): Promise<AccessTokenResponse> {
    this.logger.log(`Generating token for user: ${payload.sub}`);
    
    const jwtSecret = this.cfg.get<string>('JWT_ACCESS_SECRET');
    if (!jwtSecret) {
      throw new Error('JWT_ACCESS_SECRET environment variable is not configured');
    }
    
    // Add iat (issued at) timestamp to payload for maximum expiry calculation
    const payloadWithIat = {
      ...payload,
      iat: Math.floor(Date.now() / 1000) // Current timestamp in seconds
    };
    
    const accessToken = await this.jwt.signAsync(payloadWithIat, {
      secret: jwtSecret,
      expiresIn: this.cfg.get<string>('JWT_ACCESS_TTL', '30m')
    });
    
    // Calculate expiration time based on the actual TTL
    const ttlMinutes = parseInt(this.cfg.get<string>('JWT_ACCESS_TTL', '30m').replace('m', ''));
    const expiresTokenExp = new Date();
    expiresTokenExp.setMinutes(expiresTokenExp.getMinutes() + ttlMinutes);
    
    this.logger.log(`Token generated successfully for user: ${payload.sub}`);
    
    return {
      accessToken,
      accessTokenExp: expiresTokenExp.getTime()
    };
  }

  @WithAuthErrorHandling()
  async logout(token: string, userId: string): Promise<{ message: string }> {
    this.logger.log(`Logging out user: ${userId}`);
    
    // Add token to blacklist
    await this.tokenBlacklistService.blacklistToken(token, userId);
    
    this.logger.log(`User logged out successfully: ${userId}`);
    
    return { message: 'Logged out successfully' };
  }

  @WithAuthErrorHandling()
  async refreshToken(refreshToken: string): Promise<AccessTokenResponse> {
    this.logger.log('Processing token refresh');
    
    try {
      // Verify the refresh token
      const payload = await this.jwt.verifyAsync(refreshToken, {
        secret: this.cfg.get<string>('JWT_REFRESH_SECRET')
      });
      
      // Check if refresh token is blacklisted
      const isBlacklisted = await this.tokenBlacklistService.isTokenBlacklisted(refreshToken);
      if (isBlacklisted) {
        throw new UnauthorizedException('Refresh token has been revoked');
      }
      
      // Generate new access token with current timestamp
      const newPayload = { 
        sub: payload.sub, 
        email: payload.email, 
        role: payload.role,
        iat: Math.floor(Date.now() / 1000) // Current timestamp for new token
      };
      const accessToken = await this.generateToken(newPayload);
      
      this.logger.log(`Token refreshed successfully for user: ${payload.sub}`);
      
      return accessToken;
    } catch (error) {
      this.logger.error('Token refresh failed:', error);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}