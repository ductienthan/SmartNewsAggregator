import { IsString } from 'class-validator'

export class RegularSchema {
    @IsString()
    message!: string
}