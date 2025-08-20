import { IsString, MinLength } from 'class-validator'

export class RefreshToken {
    @IsString()
    @MinLength(10)
    refreshToken!: string
}