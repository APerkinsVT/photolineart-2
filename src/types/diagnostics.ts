export interface PipelineDiagnostics {
  totalItems: number;
  completedItems: number;
  avgPrepMs?: number;
  avgUploadMs?: number;
  avgAiMs?: number;
}

export type PublishStatus = 'idle' | 'running' | 'success' | 'error';

export interface PublishDiagnostics {
  status: PublishStatus;
  startedAt?: number;
  finishedAt?: number;
  durationMs?: number;
  itemCount?: number;
  tipEnhancementFailures?: number;
  error?: string;
}

export interface DiagnosticsSummary {
  pipeline: PipelineDiagnostics;
  publish: PublishDiagnostics;
}
