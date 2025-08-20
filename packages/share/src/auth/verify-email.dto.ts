import { IsString } from 'class-validator'

export class VerifyEmail {
    @IsString()
    token!: string
}