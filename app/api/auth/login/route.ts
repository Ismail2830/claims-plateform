import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
const JWT_EXPIRES_IN = '7d';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email and password are required' },
        { status: 400 }
      );
    }

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
      // Log failed login attempt
      await prisma.auditLog.create({
        data: {
          entityType: 'CLIENT',
          entityId: null, // Use null instead of 'unknown' for UUID field
          action: 'LOGIN',
          description: `Failed login attempt for email: ${email} - Client not found`,
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
          riskLevel: 'MEDIUM',
          isSuspicious: true,
          metadata: {
            email,
            reason: 'Client not found',
            success: false
          }
        }
      });

      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    if (client.status !== 'ACTIVE') {
      return NextResponse.json(
        { success: false, message: 'Account is not active' },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, client.password);
    if (!isValidPassword) {
      // Log failed login attempt
      await prisma.auditLog.create({
        data: {
          entityType: 'CLIENT',
          entityId: client.clientId,
          action: 'LOGIN',
          description: `Failed login attempt for client: ${client.firstName} ${client.lastName} - Invalid password`,
          clientId: client.clientId,
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
          riskLevel: 'MEDIUM',
          isSuspicious: true,
          metadata: {
            email: client.email,
            reason: 'Invalid password',
            success: false
          }
        }
      });

      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Update last login time
    await prisma.client.update({
      where: { clientId: client.clientId },
      data: { lastLoginAt: new Date() }
    });

    // Create JWT token
    const tokenPayload = {
      clientId: client.clientId,
      email: client.email,
      cin: client.cin,
      type: 'CLIENT'
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    // Log successful login
    await prisma.auditLog.create({
      data: {
        entityType: 'CLIENT',
        entityId: client.clientId,
        action: 'LOGIN',
        description: `Successful login: ${client.firstName} ${client.lastName}`,
        clientId: client.clientId,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        metadata: {
          email: client.email,
          loginTime: new Date(),
          success: true
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      data: {
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
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: 'Login failed' },
      { status: 500 }
    );
  }
}