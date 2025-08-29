import { Controller, Get, Post, Body } from '@nestjs/common'
import { RegularSchema, RegisterUser, AccessTokenResponse } from '@snag/share'
import { ApiBody, ApiResponse } from '@nestjs/swagger'
import { AuthService } from '../services/authService';
@Controller({
  version: '1',
})
export class AuthController {
  constructor(
    private readonly authService: AuthService
  ) {
  }

  @Get('/auth/ping') 
  async pingAuth(){
    console.log("ping auth")
    return "ok"
  }

  
  @Post('/auth/register')
  @ApiBody({ type: RegisterUser})
  @ApiResponse({status: 200, type: AccessTokenResponse})
  async registerUser(@Body() userPayload: RegisterUser): Promise<AccessTokenResponse> {
    console.log("register user controller")
    let response = await this.authService.registerUser(userPayload)
    return response
  }
}
