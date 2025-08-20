import { IsString, MinLength } from 'class-validator'

export class ResetPassword {
    @IsString()
    token!: string

    @IsString()
    @MinLength(6)
    newPassword!: string
}