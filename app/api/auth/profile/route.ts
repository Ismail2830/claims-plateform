import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { verifyAccessToken } from '@/app/lib/tokens';

export async function GET(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Token required' },
        { status: 401 }
      );
    }

    // Verify token using the correct access secret
    let decoded: ReturnType<typeof verifyAccessToken>;
    try {
      decoded = verifyAccessToken(token);
    } catch {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    if (decoded.type !== 'CLIENT') {
      return NextResponse.json(
        { success: false, message: 'Invalid token type' },
        { status: 401 }
      );
    }

    // Get client profile
    const client = await prisma.client.findUnique({
      where: { clientId: decoded.clientId },
      select: {
        clientId: true,
        cin: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        dateOfBirth: true,
        address: true,
        city: true,
        province: true,
        postalCode: true,
        status: true,
        emailVerified: true,
        phoneVerified: true,
        documentVerified: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    if (!client) {
      return NextResponse.json(
        { success: false, message: 'Client not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: client
    });

  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

// ─── PATCH /api/auth/profile — Update client personal information ─
export async function PATCH(request: NextRequest) {
  try {
    // Authenticate
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ success: false, message: 'Token required' }, { status: 401 });
    }

    let decoded: ReturnType<typeof verifyAccessToken>;
    try {
      decoded = verifyAccessToken(token);
    } catch {
      return NextResponse.json({ success: false, message: 'Invalid or expired token' }, { status: 401 });
    }
    if (decoded.type !== 'CLIENT') {
      return NextResponse.json({ success: false, message: 'Invalid token type' }, { status: 401 });
    }

    const clientId = decoded.clientId;
    const body = await request.json();

    const { firstName, lastName, email, phone, dateOfBirth, cin, street, city, province, postalCode } = body;

    // ── Uniqueness checks ────────────────────────────────────────────
    if (email) {
      const existing = await prisma.client.findUnique({ where: { email } });
      if (existing && existing.clientId !== clientId) {
        return NextResponse.json({ success: false, message: 'Email is already in use by another account.' }, { status: 409 });
      }
    }
    if (phone) {
      const existing = await prisma.client.findUnique({ where: { phone } });
      if (existing && existing.clientId !== clientId) {
        return NextResponse.json({ success: false, message: 'Phone number is already in use by another account.' }, { status: 409 });
      }
    }
    if (cin) {
      const existing = await prisma.client.findUnique({ where: { cin } });
      if (existing && existing.clientId !== clientId) {
        return NextResponse.json({ success: false, message: 'National ID (CIN) is already in use by another account.' }, { status: 409 });
      }
    }

    // ── Build update payload ─────────────────────────────────────────
    const updateData: Record<string, unknown> = {};
    if (firstName   !== undefined) updateData.firstName   = firstName;
    if (lastName    !== undefined) updateData.lastName    = lastName;
    if (email       !== undefined) updateData.email       = email;
    if (phone       !== undefined) updateData.phone       = phone;
    if (cin         !== undefined) updateData.cin         = cin;
    if (street      !== undefined) updateData.address     = street; // street → address column
    if (city        !== undefined) updateData.city        = city;
    if (province    !== undefined) updateData.province    = province;
    if (postalCode  !== undefined) updateData.postalCode  = postalCode;
    if (dateOfBirth !== undefined) {
      const parsed = new Date(dateOfBirth);
      if (isNaN(parsed.getTime())) {
        return NextResponse.json({ success: false, message: 'Invalid date of birth.' }, { status: 400 });
      }
      updateData.dateOfBirth = parsed;
    }
    // Note: country is not yet in the DB schema — add a migration to include it

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: false, message: 'No fields to update.' }, { status: 400 });
    }

    const updatedClient = await prisma.client.update({
      where: { clientId },
      data: updateData,
      select: {
        clientId:        true,
        firstName:       true,
        lastName:        true,
        email:           true,
        phone:           true,
        cin:             true,
        dateOfBirth:     true,
        address:         true,
        city:            true,
        province:        true,
        postalCode:      true,
        emailVerified:   true,
        phoneVerified:   true,
        documentVerified: true,
        status:          true,
        updatedAt:       true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedClient,
    });

  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update profile' },
      { status: 500 }
    );
  }
}