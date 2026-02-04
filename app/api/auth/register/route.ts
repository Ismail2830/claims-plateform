import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    console.log('Registration request received');
    const body = await request.json();
    console.log('Request body:', body);
    
    const {
      cin,
      firstName,
      lastName,
      email,
      password,
      phone,
      dateOfBirth,
      address,
      city,
      province,
      postalCode
    } = body;

    // Validate required fields
    if (!cin || !firstName || !lastName || !email || !password || !phone || !dateOfBirth || !address || !city || !province) {
      return NextResponse.json(
        { success: false, message: 'All required fields must be provided' },
        { status: 400 }
      );
    }

    // Check for duplicate email
    const existingEmail = await prisma.client.findUnique({
      where: { email }
    });
    if (existingEmail) {
      return NextResponse.json(
        { success: false, message: 'Email already registered' },
        { status: 400 }
      );
    }

    // Check for duplicate CIN
    const existingCin = await prisma.client.findUnique({
      where: { cin }
    });
    if (existingCin) {
      return NextResponse.json(
        { success: false, message: 'CIN already registered' },
        { status: 400 }
      );
    }

    // Check for duplicate phone
    const existingPhone = await prisma.client.findUnique({
      where: { phone }
    });
    if (existingPhone) {
      return NextResponse.json(
        { success: false, message: 'Phone number already registered' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create client
    const client = await prisma.client.create({
      data: {
        cin,
        firstName,
        lastName,
        email,
        password: hashedPassword,
        phone,
        dateOfBirth: new Date(dateOfBirth),
        address,
        city,
        province,
        postalCode,
        status: 'ACTIVE'
      },
      select: {
        clientId: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true
      }
    });

    // Log registration
    await prisma.auditLog.create({
      data: {
        entityType: 'CLIENT',
        entityId: client.clientId,
        action: 'CREATE',
        description: `New client registered: ${firstName} ${lastName}`,
        clientId: client.clientId,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        metadata: {
          email: client.email,
          registrationTime: new Date(),
          success: true
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Registration successful',
      data: client
    });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Registration failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}