// API service for Super Admin Entity Management

// Types
export interface User {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'SUPER_ADMIN' | 'MANAGER_SENIOR' | 'MANAGER_JUNIOR' | 'EXPERT';
  isActive: boolean;
  currentWorkload: number;
  maxWorkload: number;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    assignedClaims: number;
    documentsUploaded: number;
    statusChanges: number;
  };
}

export interface Client {
  clientId: string;
  cin: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  address: string;
  city: string;
  province: string;
  postalCode?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION' | 'BLOCKED';
  emailVerified: boolean;
  phoneVerified: boolean;
  documentVerified: boolean;
  createdAt: string;
  lastLoginAt?: string;
  _count?: {
    policies: number;
    claims: number;
  };
  lifetimeValue?: string;
  riskScore?: string;
  totalClaims?: number;
  rejectedClaims?: number;
}

export interface Policy {
  policyId: string;
  clientId: string;
  policyNumber: string;
  policyType: 'AUTO' | 'HOME' | 'HEALTH' | 'LIFE';
  coverageType?: string;
  startDate: string;
  endDate: string;
  premiumAmount: number;
  insuredAmount: number;
  deductible: number;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELED' | 'SUSPENDED';
  createdAt: string;
  updatedAt: string;
  client?: {
    clientId: string;
    firstName: string;
    lastName: string;
    email: string;
    status: string;
  };
  _count?: {
    claims: number;
  };
}

export interface Claim {
  claimId: string;
  claimNumber: string;
  policyId?: string;
  clientId: string;
  claimType: 'ACCIDENT' | 'THEFT' | 'FIRE' | 'WATER_DAMAGE';
  incidentDate: string;
  declarationDate: string;
  incidentLocation?: string;
  description: string;
  damageDescription?: string;
  claimedAmount?: number;
  estimatedAmount?: number;
  approvedAmount?: number;
  status: 'DECLARED' | 'ANALYZING' | 'DOCS_REQUIRED' | 'UNDER_EXPERTISE' | 'IN_DECISION' | 'APPROVED' | 'IN_PAYMENT' | 'CLOSED' | 'REJECTED';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  client?: {
    clientId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  policy?: {
    policyId: string;
    policyNumber: string;
    policyType: string;
    insuredAmount: number;
  };
  assignedUser?: {
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
  _count?: {
    documents: number;
    comments: number;
  };
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  details?: any;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: {
    items?: T[];
    users?: T[];
    clients?: T[];
    policies?: T[];
    claims?: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
    stats?: any[];
  };
}

// Request options
export interface EntityListOptions {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  [key: string]: any;
}

// Base API class
class BaseEntityAPI<T> {
  protected baseUrl: string;

  constructor(entityPath: string) {
    this.baseUrl = `/api/super-admin/${entityPath}`;
  }

  async list(options: EntityListOptions = {}): Promise<PaginatedResponse<T>> {
    const params = new URLSearchParams();
    
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.set(key, String(value));
      }
    });

    const response = await fetch(`${this.baseUrl}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return response.json();
  }

  async create(data: Partial<T>): Promise<ApiResponse<T>> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    return result;
  }

  async update(id: string, data: Partial<T>): Promise<ApiResponse<T>> {
    const response = await fetch(`${this.baseUrl}?id=${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    return result;
  }

  async delete(id: string, hard: boolean = false): Promise<ApiResponse<void>> {
    const response = await fetch(`${this.baseUrl}?id=${id}&hard=${hard}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    return result;
  }

  async bulkAction(action: string, ids: string[], options: any = {}): Promise<ApiResponse<any>> {
    const response = await fetch(this.baseUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        [`${this.getEntityName()}Ids`]: ids,
        action,
        ...options,
      }),
    });

    const result = await response.json();

    return result;
  }

  protected getEntityName(): string {
    return this.baseUrl.split('/').pop() || 'entity';
  }
}

// User API
export class UserAPI extends BaseEntityAPI<User> {
  constructor() {
    super('users');
  }

  async list(options: EntityListOptions & {
    role?: string;
    status?: 'active' | 'inactive';
  } = {}) {
    return super.list(options);
  }
}

// Client API
export class ClientAPI extends BaseEntityAPI<Client> {
  constructor() {
    super('clients');
  }

  async list(options: EntityListOptions & {
    status?: string;
    riskLevel?: string;
  } = {}) {
    return super.list(options);
  }

  async merge(primaryClientId: string, secondaryClientId: string): Promise<ApiResponse<void>> {
    const response = await fetch(this.baseUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operation: 'merge',
        primaryClientId,
        secondaryClientId,
      }),
    });

    const result = await response.json();

    return result;
  }
}

// Policy API
export class PolicyAPI extends BaseEntityAPI<Policy> {
  constructor() {
    super('policies');
  }

  async list(options: EntityListOptions & {
    policyType?: string;
    status?: string;
    clientId?: string;
  } = {}) {
    return super.list(options);
  }

  async transfer(policyId: string, newClientId: string): Promise<ApiResponse<void>> {
    const response = await fetch(this.baseUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operation: 'transfer',
        policyId,
        newClientId,
      }),
    });

    const result = await response.json();

    return result;
  }
}

// Claim API
export class ClaimAPI extends BaseEntityAPI<Claim> {
  constructor() {
    super('claims');
  }

  async list(options: EntityListOptions & {
    status?: string;
    priority?: string;
    claimType?: string;
    assignedTo?: string;
    clientId?: string;
  } = {}) {
    return super.list(options);
  }

  async reassign(claimIds: string[], newExpertId: string | null): Promise<ApiResponse<void>> {
    const response = await fetch(this.baseUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operation: 'reassign',
        claimIds,
        newExpertId,
      }),
    });

    const result = await response.json();

    return result;
  }

  async bulkStatusChange(
    claimIds: string[], 
    action: 'approve' | 'reject' | 'close', 
    reason?: string
  ): Promise<ApiResponse<void>> {
    const response = await fetch(this.baseUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        claimIds,
        action,
        reason,
      }),
    });

    const result = await response.json();

    return result;
  }
}

// API instances
export const userAPI = new UserAPI();
export const clientAPI = new ClientAPI();
export const policyAPI = new PolicyAPI();
export const claimAPI = new ClaimAPI();

// Statistics API
export async function getSystemStats() {
  try {
    const [users, clients, policies, claims] = await Promise.all([
      userAPI.list({ limit: 1 }),
      clientAPI.list({ limit: 1 }),
      policyAPI.list({ limit: 1 }),
      claimAPI.list({ limit: 1 }),
    ]);

    return {
      users: {
        total: users.data?.pagination.total || 0,
        stats: users.data?.stats || [],
      },
      clients: {
        total: clients.data?.pagination.total || 0,
        stats: clients.data?.stats || [],
      },
      policies: {
        total: policies.data?.pagination.total || 0,
        stats: policies.data?.stats || [],
        expiring: (policies.data as any)?.expiringPolicies || 0,
      },
      claims: {
        total: claims.data?.pagination.total || 0,
        stats: claims.data?.stats || [],
        workload: (claims.data as any)?.expertWorkload || [],
      },
    };
  } catch (error) {
    console.error('Error fetching system stats:', error);
    throw error;
  }
}