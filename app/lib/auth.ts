import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from './prisma';
import { logClientAuth, logStaffAuth, extractRequestInfo } from './logging';

// JWT Secret - In production, use environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
const JWT_EXPIRES_IN = '7d';

export interface ClientTokenPayload {
  clientId: string;
  email: string;
  cin: string;
  type: 'CLIENT';
}

export interface StaffTokenPayload {
  userId: string;
  email: string;
  username: string;
  role: 'SUPER_ADMIN' | 'MANAGER_SENIOR' | 'MANAGER_JUNIOR' | 'EXPERT';
  type: 'STAFF';
}

export type TokenPayload = ClientTokenPayload | StaffTokenPayload;

// Password hashing utilities
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

export const verifyPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return await bcrypt.compare(password, hashedPassword);
};

// JWT utilities
export const signToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
};

// Client Authentication
export const authenticateClient = async (email: string, password: string) => {
  // Find client by email
  const client = await prisma.client.findUnique({
    where: { email },
    select: {
      clientId: true,
      email: true,
      cin: true,
      firstName: true,
      lastName: true,
      password: true,
      status: true,
      emailVerified: true,
    }
  });

  if (!client) {
    throw new Error('Client not found');
  }

  if (client.status !== 'ACTIVE') {
    throw new Error('Account is not active');
  }

  const isValidPassword = await verifyPassword(password, client.password);
  
  if (!isValidPassword) {
    throw new Error('Invalid credentials');
  }

  // Update last login
  await prisma.client.update({
    where: { clientId: client.clientId },
    data: { lastLoginAt: new Date() }
  });

  // Log successful login
  await logClientAuth('LOGIN', client.clientId, undefined, undefined, {
    email: client.email,
    loginTime: new Date(),
    success: true
  });

  const tokenPayload: ClientTokenPayload = {
    clientId: client.clientId,
    email: client.email,
    cin: client.cin,
    type: 'CLIENT'
  };

  const token = signToken(tokenPayload);

  return {
    token,
    client: {
      clientId: client.clientId,
      email: client.email,
      cin: client.cin,
      firstName: client.firstName,
      lastName: client.lastName,
      status: client.status,
      emailVerified: client.emailVerified
    }
  };
};

// Staff Authentication
export const authenticateStaff = async (email: string, password: string) => {
  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      userId: true,
      username: true,
      email: true,
      passwordHash: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
    }
  });

  if (!user) {
    throw new Error('User not found');
  }

  if (!user.isActive) {
    throw new Error('Account is not active');
  }

  const isValidPassword = await verifyPassword(password, user.passwordHash);
  
  if (!isValidPassword) {
    throw new Error('Invalid credentials');
  }

  // Update last login
  await prisma.user.update({
    where: { userId: user.userId },
    data: { lastLogin: new Date() }
  });

  // Log successful login
  await logStaffAuth('LOGIN', user.userId, undefined, undefined, {
    email: user.email,
    username: user.username,
    role: user.role,
    loginTime: new Date(),
    success: true
  });

  const tokenPayload: StaffTokenPayload = {
    userId: user.userId,
    email: user.email,
    username: user.username,
    role: user.role,
    type: 'STAFF'
  };

  const token = signToken(tokenPayload);

  return {
    token,
    user: {
      userId: user.userId,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive
    }
  };
};

// Registration utilities
export const registerClient = async (data: {
  cin: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  dateOfBirth: Date;
  address: string;
  city: string;
  province: string;
  postalCode?: string;
}) => {
  // Check for duplicate email
  const existingEmailClient = await prisma.client.findUnique({
    where: { email: data.email }
  });
  
  if (existingEmailClient) {
    throw new Error('Email already registered');
  }

  // Check for duplicate CIN
  const existingCinClient = await prisma.client.findUnique({
    where: { cin: data.cin }
  });
  
  if (existingCinClient) {
    throw new Error('CIN already registered');
  }

  // Check for duplicate phone
  const existingPhoneClient = await prisma.client.findUnique({
    where: { phone: data.phone }
  });
  
  if (existingPhoneClient) {
    throw new Error('Phone number already registered');
  }

  const hashedPassword = await hashPassword(data.password);

  const client = await prisma.client.create({
    data: {
      ...data,
      password: hashedPassword,
      status: 'PENDING_VERIFICATION'
    },
    select: {
      clientId: true,
      email: true,
      cin: true,
      firstName: true,
      lastName: true,
      status: true
    }
  });

  // Log client registration
  await logClientAuth('CREATE' as any, client.clientId, undefined, undefined, {
    email: client.email,
    cin: client.cin,
    registrationTime: new Date(),
    success: true
  });

  return client;
};

export const registerStaff = async (data: {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role: 'SUPER_ADMIN' | 'MANAGER_SENIOR' | 'MANAGER_JUNIOR' | 'EXPERT';
}) => {
  // Check for duplicate email
  const existingEmailUser = await prisma.user.findUnique({
    where: { email: data.email }
  });
  
  if (existingEmailUser) {
    throw new Error('Email already registered');
  }

  // Check for duplicate username
  const existingUsernameUser = await prisma.user.findUnique({
    where: { username: data.username }
  });
  
  if (existingUsernameUser) {
    throw new Error('Username already taken');
  }

  const hashedPassword = await hashPassword(data.password);

  const user = await prisma.user.create({
    data: {
      ...data,
      passwordHash: hashedPassword,
      isActive: true
    },
    select: {
      userId: true,
      username: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true
    }
  });

  return user;
};

// Token validation utilities
export const validateClientToken = (token: string): ClientTokenPayload => {
  const payload = verifyToken(token);
  
  if (payload.type !== 'CLIENT') {
    throw new Error('Invalid token type');
  }
  
  return payload as ClientTokenPayload;
};

export const validateStaffToken = (token: string): StaffTokenPayload => {
  const payload = verifyToken(token);
  
  if (payload.type !== 'STAFF') {
    throw new Error('Invalid token type');
  }
  
  return payload as StaffTokenPayload;
};

// Role-based authorization
export const hasStaffPermission = (userRole: string, requiredRoles: string[]): boolean => {
  return requiredRoles.includes(userRole);
};

export const isManager = (userRole: string): boolean => {
  return ['SUPER_ADMIN', 'MANAGER_SENIOR', 'MANAGER_JUNIOR'].includes(userRole);
};

export const isAdmin = (userRole: string): boolean => {
  return userRole === 'SUPER_ADMIN';
};

export default {
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
  authenticateClient,
  authenticateStaff,
  registerClient,
  registerStaff,
  validateClientToken,
  validateStaffToken,
  hasStaffPermission,
  isManager,
  isAdmin
};