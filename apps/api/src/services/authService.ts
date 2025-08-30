import PasswordHasher from 'argon2'
import { Injectable, ConflictException, UnauthorizedException, InternalServerErrorException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { PrismaClient } from '@prisma/client'
import { RegisterUser, AccessTokenResponse, LoginDto, JwtPayload } from '@snag/share'
import { BaseService } from '../common/base/base.service'
import { WithAuthErrorHandling } from '../common/decorators/auto-error-handler.decorator'

@Injectable()
export class AuthService extends BaseService {
  constructor(
      private readonly prisma: PrismaClient,
      private readonly jwt: JwtService,
      private readonly cfg: ConfigService
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
    
    const accessToken = await this.jwt.signAsync(payload, {
      secret: jwtSecret,
      expiresIn: this.cfg.get<string>('JWT_REFRESH_TTL', '30m')
    });
    
    const expiresTokenExp = new Date();
    expiresTokenExp.setMinutes(expiresTokenExp.getMinutes() + 30);
    
    this.logger.log(`Token generated successfully for user: ${payload.sub}`);
    
    return {
      accessToken,
      accessTokenExp: expiresTokenExp.getTime()
    };
  }
}