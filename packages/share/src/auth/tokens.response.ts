import { IsJWT, IsOptional, IsNumber } from 'class-validator'

export class AccessTokenResponse {
  @IsJWT()
  accessToken!: string

  @IsNumber()
  accessTokenExp?: number
}

export class RefreshTokenResponse {
  @IsJWT()
  refreshToken!: string

  @IsNumber()
  refreshTokenExp?: number
}

export class TokenResponse {
  @IsJWT()
  accessToken!: string

  @IsJWT()
  refreshToken!: string

  @IsNumber()
  refreshTokenExp?: number

  @IsNumber()
  accessTokenExp?: number
}

export type anyTokenResponse = AccessTokenResponse | RefreshTokenResponse | TokenResponse