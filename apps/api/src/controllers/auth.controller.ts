import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Headers,
  HttpException, 
  HttpStatus, 
  UsePipes,
  UseGuards,
  UnauthorizedException
} from '@nestjs/common'
import { 
  RegularSchema, 
  RegisterUser, 
  AccessTokenResponse, 
  LoginDto
} from '@snag/share'
import { ApiBody, ApiResponse, ApiTags, ApiOperation, ApiUnauthorizedResponse } from '@nestjs/swagger'
import { AuthService } from '../services/authService';
import { BaseController } from '../common/base/base.controller';
import { WithAuthValidation } from '../common/decorators/auto-controller.decorator';
import { ApiCreateResponses, ApiAuthResponses } from '../common/decorators/api-responses.decorator';
import { Public } from '../common/decorators/public.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '@snag/share';
@ApiTags('Authentication')
@Controller({
  version: '1',
})
@UseGuards(JwtAuthGuard)
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
  @Public()
  @UsePipes()
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({ type: RegisterUser })
  @ApiCreateResponses(AccessTokenResponse)
  @WithAuthValidation()
  async registerUser(@Body() userPayload: RegisterUser): Promise<AccessTokenResponse> {
    return await this.authService.registerUser(userPayload);
  }

  @Post('/auth/login')
  @Public()
  @UsePipes()
  @ApiOperation({ summary: 'Login user with email and password' })
  @ApiBody({ type: LoginDto })
  @ApiAuthResponses(AccessTokenResponse)
  @WithAuthValidation()
  async loginUser(@Body() userPayload: LoginDto): Promise<AccessTokenResponse> {
    return await this.authService.login(userPayload);
  }

  @Post('/auth/logout')
  @ApiOperation({ summary: 'Logout user and blacklist token' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  @ApiUnauthorizedResponse({ description: 'Invalid token' })
  async logout(
    @CurrentUser() user: JwtPayload,
    @Headers('authorization') authHeader: string
  ): Promise<{ message: string }> {
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      throw new UnauthorizedException('No token provided');
    }
    
    return await this.authService.logout(token, user.sub);
  }

  @Post('/auth/refresh')
  @Public()
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiBody({ schema: { type: 'object', properties: { refreshToken: { type: 'string' } } } })
  @ApiAuthResponses(AccessTokenResponse)
  async refreshToken(@Body('refreshToken') refreshToken: string): Promise<AccessTokenResponse> {
    return await this.authService.refreshToken(refreshToken);
  }
}
