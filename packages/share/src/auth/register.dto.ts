import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator'

export class RegisterUser {
    @IsEmail()
    email!: string

    @IsString()
    @MinLength(6)
    password!: string

    @IsOptional()
    @IsString()
    timezone?: string
}