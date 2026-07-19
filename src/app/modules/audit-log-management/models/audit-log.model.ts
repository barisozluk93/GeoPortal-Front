export interface AuditLogModel {
  id: number;
  timestampUtc: string;
  serviceName: string;
  userId?: string | null;
  userName?: string | null;
  roles?: string | null;
  actionType: string;
  httpMethod: string;
  path: string;
  queryString?: string | null;
  statusCode: number;
  isSuccess: boolean;
  resultText?: string;
  durationMs: number;
  ipAddress?: string | null;
  userAgent?: string | null;
  correlationId: string;
  errorMessage?: string | null;
}
