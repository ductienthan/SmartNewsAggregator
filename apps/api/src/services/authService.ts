import PasswordHasher from 'argon2'
import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { PrismaClient } from '@prisma/client'
import { RegisterUser, AccessTokenResponse, LoginDto, JwtPayload } from '@snag/share'
import { id } from 'zod/v4/locales/index.cjs'

@Injectable()
export class AuthService {
  constructor(
      private readonly prisma: PrismaClient,
      private readonly jwt: JwtService,
      private readonly cfg: ConfigService
  ) {}
  async registerUser(registerUser: RegisterUser): Promise<AccessTokenResponse> {
      try {
        console.log(`regitserUser called`)
        const existingUser = await this.prisma.user.findUnique({ where: { email: registerUser.email}})
        if(existingUser) throw new ConflictException('Email already registerd');
        const passwordHash = await PasswordHasher.hash(registerUser.password, {
          secret: Buffer.from(this.cfg.get<string>('HASH_SECRET') as string)
        })
        
        const user = await this.prisma.user.create({
          data: {
            email: registerUser.email,
            passwordHash,
            createdAt: new Date(),
            role: 'USER',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
          },
          select: {id: true, email: true, role: true}
        })
        console.log(`user`, user)
        const payload = {sub: user.id, email: user.email, role: user.role}
        return await this.generateToken(payload)
      } catch(e) {
        console.error(e)
        throw e
      }
  }

  async login(loginPayload: LoginDto): Promise<AccessTokenResponse> {
    try {
      const email = loginPayload.email.trim().toLowerCase()
      const user = await this.prisma.user.findUnique({
        where: { email },
        select: {id: true, email: true, passwordHash: true, role: true}
      })
      if(!user) throw new UnauthorizedException('User not found')
      const passwordMatched = await PasswordHasher.verify(user.passwordHash, loginPayload.password, {
        secret: Buffer.from(this.cfg.get<string>('HASH_SECRET') as string)
      })
      if(!passwordMatched) throw new UnauthorizedException('Invalid password')
      const payload = {sub: user.id, email: user.email, role: user.role}
      return await this.generateToken(payload)
    } catch(e) {
      console.error(e);
      throw e;
    }
  }

  async generateToken(payload: JwtPayload): Promise<AccessTokenResponse> {
    try {
      const accessToken = await this.jwt.signAsync(payload, {
      secret: this.cfg.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.cfg.get<string>('JWT_REFRESH_TTL', '30m')
      })
      let expiresTokenExp = new Date()
      expiresTokenExp.setMinutes(expiresTokenExp.getMinutes() + 30)
      console.log('generate sucessfully', accessToken)
      return {
        accessToken,
        accessTokenExp: expiresTokenExp.getTime()
      }
    }
    catch(e) {
      console.error(e)
      throw e
    }
  }
}