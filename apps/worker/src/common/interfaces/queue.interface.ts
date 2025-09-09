import { Queue } from 'bullmq';

export interface QueueStats {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  total: number;
}

export interface JobInfo {
  id: string | number;
  name: string;
  data: any;
  progress: number | object;
  state: string;
  createdAt: number;
  processedOn?: number;
  finishedOn?: number;
  failedReason?: string;
}

export interface QueueHealthStatus {
  status: 'healthy' | 'unhealthy';
  message: string;
  queues: number;
  timestamp: string;
  error?: string;
}

export interface QueueCleanupResult {
  cleaned: number;
  olderThanDays: number;
  timestamp: string;
}

export interface QueueManagementService {
  getQueueStats(): Promise<QueueStats[]>;
  getRecentJobs(limit?: number): Promise<{ [queueName: string]: JobInfo[] }>;
  cleanOldJobs(olderThanDays?: number): Promise<QueueCleanupResult>;
  getHealthStatus(): Promise<QueueHealthStatus>;
}

export interface QueueAdapterService {
  getQueues(): Queue[];
  getQueueByName(name: string): Queue | undefined;
  registerQueue(queue: Queue): void;
  unregisterQueue(name: string): void;
}
