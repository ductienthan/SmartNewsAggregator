import { Test, TestingModule } from '@nestjs/testing'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { AddJobService } from './services/addJobService'

describe('AppController', () => {
  let appController: AppController

  beforeEach(async () => {
    const mockAddJobService = {
      addJob: jest.fn().mockResolvedValue({}),
    }

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: AddJobService,
          useValue: mockAddJobService,
        },
      ],
    }).compile()

    appController = app.get<AppController>(AppController)
  })

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!')
    })
  })
})
