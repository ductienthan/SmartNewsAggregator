import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { PassportModule } from "@nestjs/passport";
import { AuthService } from "../services/authService";
import { AuthController } from "../controllers/auth.controller";
import { PrismaClient } from "@prisma/client";
import { JwtStrategy } from "../common/strategies/jwt.strategy";
import { TokenBlacklistService } from "../common/services/token-blacklist.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.get<string>('JWT_ACCESS_SECRET'),
        signOptions: { expiresIn: cfg.get<string>('JWT_ACCESS_TTL', '30m')}
      })
    })
  ],
  controllers: [AuthController],
  providers: [
    AuthService, 
    PrismaClient, 
    JwtStrategy, 
    TokenBlacklistService,
    JwtAuthGuard
  ],
  exports: [AuthService, TokenBlacklistService]
})
export class AuthModule {}