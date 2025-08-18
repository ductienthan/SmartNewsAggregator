import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';

@Processor('SnagWorker')
export class TestingProcessor extends WorkerHost {
  async process(job: Job) {
    console.log('Processing job', job.id);
  }
  @OnWorkerEvent('completed')
  onCompleted(job: Job, result: any) {
    console.log('Job completed', job.id, result);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    console.log('Job failed', job.id, err);
  }

  async onWorkerReady() {
    console.log('Worker ready');
  }
}