import { prisma } from './prisma';

export interface LogEntry {
  entityType: 'CLAIM' | 'CLIENT' | 'USER' | 'POLICY' | 'DOCUMENT';
  entityId: string;
  action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'UPLOAD' | 'DOWNLOAD' | 'APPROVE' | 'REJECT' | 'ASSIGN' | 'UNASSIGN' | 'STATUS_CHANGE';
  description: string;
  claimId?: string;
  userId?: string;
  clientId?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  oldValues?: any;
  newValues?: any;
  metadata?: any;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  isSuspicious?: boolean;
}

/**
 * Create an audit log entry
 */
export const createAuditLog = async (entry: LogEntry): Promise<string> => {
  try {
    const auditLog = await prisma.auditLog.create({
      data: {
        entityType: entry.entityType,
        entityId: entry.entityId,
        action: entry.action,
        description: entry.description,
        claimId: entry.claimId,
        userId: entry.userId,
        clientId: entry.clientId,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        sessionId: entry.sessionId,
        oldValues: entry.oldValues,
        newValues: entry.newValues,
        metadata: entry.metadata,
        riskLevel: entry.riskLevel || 'LOW',
        isSuspicious: entry.isSuspicious || false,
      },
    });
    
    return auditLog.logId;
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw error - logging should not break the main operation
    return '';
  }
};

/**
 * Log client authentication events
 */
export const logClientAuth = async (
  action: 'LOGIN' | 'LOGOUT',
  clientId: string,
  ipAddress?: string,
  userAgent?: string,
  metadata?: any
) => {
  return createAuditLog({
    entityType: 'CLIENT',
    entityId: clientId,
    action,
    description: `Client ${action.toLowerCase()} attempt`,
    clientId,
    ipAddress,
    userAgent,
    metadata,
    riskLevel: action === 'LOGIN' ? 'LOW' : 'LOW',
  });
};

/**
 * Log staff authentication events
 */
export const logStaffAuth = async (
  action: 'LOGIN' | 'LOGOUT',
  userId: string,
  ipAddress?: string,
  userAgent?: string,
  metadata?: any
) => {
  return createAuditLog({
    entityType: 'USER',
    entityId: userId,
    action,
    description: `Staff ${action.toLowerCase()} attempt`,
    userId,
    ipAddress,
    userAgent,
    metadata,
    riskLevel: 'LOW',
  });
};

/**
 * Log claim-related activities
 */
export const logClaimActivity = async (
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE' | 'ASSIGN' | 'UNASSIGN' | 'APPROVE' | 'REJECT',
  claimId: string,
  description: string,
  userId?: string,
  clientId?: string,
  oldValues?: any,
  newValues?: any,
  metadata?: any,
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW'
) => {
  return createAuditLog({
    entityType: 'CLAIM',
    entityId: claimId,
    action,
    description,
    claimId,
    userId,
    clientId,
    oldValues,
    newValues,
    metadata,
    riskLevel,
  });
};

/**
 * Log document-related activities
 */
export const logDocumentActivity = async (
  action: 'UPLOAD' | 'DOWNLOAD' | 'DELETE' | 'UPDATE',
  documentId: string,
  description: string,
  claimId?: string,
  userId?: string,
  clientId?: string,
  metadata?: any
) => {
  return createAuditLog({
    entityType: 'DOCUMENT',
    entityId: documentId,
    action,
    description,
    claimId,
    userId,
    clientId,
    metadata,
    riskLevel: 'LOW',
  });
};

/**
 * Log policy-related activities
 */
export const logPolicyActivity = async (
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  policyId: string,
  description: string,
  userId?: string,
  clientId?: string,
  oldValues?: any,
  newValues?: any,
  metadata?: any
) => {
  return createAuditLog({
    entityType: 'POLICY',
    entityId: policyId,
    action,
    description,
    userId,
    clientId,
    oldValues,
    newValues,
    metadata,
    riskLevel: 'LOW',
  });
};

/**
 * Log suspicious activities
 */
export const logSuspiciousActivity = async (
  entityType: 'CLAIM' | 'CLIENT' | 'USER' | 'POLICY' | 'DOCUMENT',
  entityId: string,
  action: any,
  description: string,
  riskLevel: 'MEDIUM' | 'HIGH' | 'CRITICAL',
  metadata?: any,
  userId?: string,
  clientId?: string
) => {
  return createAuditLog({
    entityType,
    entityId,
    action,
    description,
    userId,
    clientId,
    metadata,
    riskLevel,
    isSuspicious: true,
  });
};

/**
 * Extract request information for logging
 */
export const extractRequestInfo = (req: any) => {
  const ipAddress = req?.headers?.['x-forwarded-for'] || 
                   req?.headers?.['x-real-ip'] || 
                   req?.connection?.remoteAddress ||
                   req?.ip ||
                   'unknown';
                   
  const userAgent = req?.headers?.['user-agent'] || 'unknown';
  
  return {
    ipAddress: Array.isArray(ipAddress) ? ipAddress[0] : ipAddress,
    userAgent,
  };
};

/**
 * Middleware to automatically log API requests
 */
export const withAuditLog = (
  handler: (...args: any[]) => Promise<any>,
  entityType: 'CLAIM' | 'CLIENT' | 'USER' | 'POLICY' | 'DOCUMENT',
  action: string,
  getDescription: (...args: any[]) => string
) => {
  return async (...args: any[]) => {
    const startTime = Date.now();
    let error: any = null;
    let result: any = null;
    
    try {
      result = await handler(...args);
      return result;
    } catch (err) {
      error = err;
      throw err;
    } finally {
      // Log the operation
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      const description = getDescription(...args);
      const metadata = {
        duration,
        success: !error,
        error: error?.message,
      };
      
      // Extract entity ID from result or args
      // This would need to be customized based on your specific use case
      const entityId = result?.id || args[0]?.id || 'unknown';
      
      createAuditLog({
        entityType,
        entityId,
        action: action as any,
        description,
        metadata,
        riskLevel: error ? 'MEDIUM' : 'LOW',
        isSuspicious: !!error,
      }).catch(console.error);
    }
  };
};