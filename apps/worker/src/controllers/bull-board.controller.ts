import { Controller, Get, Res, Req, Next } from '@nestjs/common';
import type { Response, Request, NextFunction } from 'express';
import { BullBoardService } from '../common/services/bull-board.service';

@Controller({
  version: '1',
  path: 'admin'
})
export class BullBoardController {
  constructor(private readonly bullBoardService: BullBoardService) {}

  /**
   * Serve Bull Board UI - Main dashboard
   */
  @Get('queues')
  async serveBullBoardRoot(
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    const serverAdapter = this.bullBoardService.getServerAdapter();
    return serverAdapter.getRouter()(req, res, next);
  }

  /**
   * Serve Bull Board UI - All routes under /admin/queues/*
   */
  @Get('queues/*')
  async serveBullBoard(
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ) {
    const serverAdapter = this.bullBoardService.getServerAdapter();
    return serverAdapter.getRouter()(req, res, next);
  }

  /**
   * Get Bull Board status and information
   */
  @Get('status')
  async getBullBoardStatus() {
    const isInitialized = this.bullBoardService.isInitialized();
    const queueCount = this.bullBoardService.getMonitoredQueueCount();
    const queueNames = this.bullBoardService.getMonitoredQueueNames();

    return {
      status: isInitialized ? 'initialized' : 'not_initialized',
      message: isInitialized ? 'Bull Board is running' : 'Bull Board is not initialized',
      queues: {
        count: queueCount,
        names: queueNames,
      },
      uiUrl: '/v1/admin/queues',
      timestamp: new Date().toISOString(),
    };
  }
}
