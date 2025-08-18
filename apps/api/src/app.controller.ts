import { Controller, Get, Post, Body } from '@nestjs/common'
import { AppService } from './app.service'
import { AddJobService } from './services/addJobService'

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

  @Post('add-job')
  addJob(@Body() body: { message: string }) {
    console.log('Adding job', body)
    return this.addJobService.addJob(body)
  }
}
