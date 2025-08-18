import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Job } from 'bullmq';

export class AddJobService {
  constructor(@InjectQueue('SnagWorker') private readonly queue: Queue) {}

  async addJob(data: { message: string }) {
    await this.queue.add('test', data);
  }
}