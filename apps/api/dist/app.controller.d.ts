import { AppService } from './app.service';
import { AddJobService } from './services/addJobService';
export declare class AppController {
    private readonly appService;
    private readonly addJobService;
    constructor(appService: AppService, addJobService: AddJobService);
    getHello(): string;
    healthCheck(): string;
    addJob(body: {
        message: string;
    }): Promise<void>;
}
