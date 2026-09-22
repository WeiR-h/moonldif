import { workerHandler } from './paging-worker.js';
self.onmessage = workerHandler('review');
