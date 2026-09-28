import { workerHandler } from './paging-worker.js';
self.onmessage = workerHandler();
// A loaded script and an accepted input are separate from completed analysis.
self.postMessage({type:'ready'});
