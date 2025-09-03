import { IsString } from "class-validator";

export class RegularResponse {
    @IsString()
    message!: string
}