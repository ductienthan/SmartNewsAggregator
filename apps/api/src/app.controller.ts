import { Controller, Get, Post, Body } from '@nestjs/common'
import { AppService } from './app.service'
import { AddJobService } from './services/addJobService'
import { RegularSchema } from '@snag/share'
import { ApiBody, ApiResponse } from '@nestjs/swagger'
@Controller({
  version: '1',
})
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly addJobService: AddJobService,
  ) {
  }

  @Get()
  getHello(): string {
    return this.appService.getHello()
  }

  @Get('health')
  healthCheck(): string {
    return 'OK'
  }
  
  @Get('schema')
  @ApiBody({ type: RegularSchema})
  @ApiResponse({status: 200, type: RegularSchema})
  getSchema(): RegularSchema {
    let response = new RegularSchema();
    response.message ="Success";
    return response
  }

  @Post('add-job')
  addJob(@Body() body: { message: string }) {
    console.log('Adding job', body)
    return this.addJobService.addJob(body)
  }
}
