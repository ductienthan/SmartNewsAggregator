import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  HttpException, 
  HttpStatus, 
  UsePipes
} from '@nestjs/common'
import { 
  RegularSchema, 
  RegisterUser, 
  AccessTokenResponse, 
  LoginDto
} from '@snag/share'
import { ApiBody, ApiResponse, ApiTags, ApiOperation } from '@nestjs/swagger'
import { AuthService } from '../services/authService';
import { BaseController } from '../common/base/base.controller';
import { WithAuthValidation } from '../common/decorators/auto-controller.decorator';
import { ApiCreateResponses, ApiAuthResponses } from '../common/decorators/api-responses.decorator';
@ApiTags('Authentication')
@Controller({
  version: '1',
})
export class AuthController extends BaseController {
  constructor(
    private readonly authService: AuthService
  ) {
    super(AuthController.name);
  }

  @Get('/auth/ping') 
  @ApiOperation({ summary: 'Health check endpoint for authentication service' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  async pingAuth() {
    this.logger.log('Health check requested');
    return { 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      service: 'auth'
    };
  }

  
  @Post('/auth/register')
  @UsePipes()
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({ type: RegisterUser })
  @ApiCreateResponses(AccessTokenResponse)
  @WithAuthValidation()
  async registerUser(@Body() userPayload: RegisterUser): Promise<AccessTokenResponse> {
    return await this.authService.registerUser(userPayload);
  }

  @Post('/auth/login')
  @UsePipes()
  @ApiOperation({ summary: 'Login user with email and password' })
  @ApiBody({ type: LoginDto })
  @ApiAuthResponses(AccessTokenResponse)
  @WithAuthValidation()
  async loginUser(@Body() userPayload: LoginDto): Promise<AccessTokenResponse> {
    return await this.authService.login(userPayload);
  }
}
