import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { verifyAccessToken } from '@/app/lib/tokens';

export async function POST(request: NextRequest) {
  try {
    // Get the token from the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization token required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    let decoded;
    try { decoded = verifyAccessToken(token); } catch { decoded = null; }
    
    if (!decoded || decoded.type !== 'CLIENT') {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      policyId,
      incidentDate,
      incidentTime,
      incidentLocation,
      description,
      claimType,
      claimedAmount,
      damageDescription,
      witnesses,
      documents,
      policeReport,
      policeReportNumber,
      emergencyServices,
      emergencyServicesDetails,
      additionalNotes
    } = body;

    // Validate required fields
    if (!policyId || !incidentDate || !incidentTime || !incidentLocation || 
        !description || !claimType || !claimedAmount || !damageDescription) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify that the policy belongs to this client
    const policy = await prisma.policy.findFirst({
      where: {
        policyId: policyId,
        clientId: decoded.clientId,
        status: 'ACTIVE'
      }
    });

    if (!policy) {
      return NextResponse.json(
        { error: 'Policy not found or not active' },
        { status: 404 }
      );
    }

    // Generate a unique claim number
    const claimNumber = `CLM-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

    // Combine date and time for incident timestamp
    const incidentDateTime = new Date(`${incidentDate}T${incidentTime}`);

    // Create the claim in a transaction
    const result = await prisma.$transaction(async (tx: any) => {
      // Create the claim
      const newClaim = await tx.claim.create({
        data: {
          claimNumber,
          policyId,
          clientId: decoded.clientId,
          claimType,
          incidentDate: incidentDateTime,
          declarationDate: new Date(),
          incidentLocation,
          description,
          claimedAmount: parseFloat(claimedAmount),
          status: 'DECLARED',
          priority: 'NORMAL',
          declarationChannel: 'WEB',
          // Additional fields from the form
          damageDescription,
          policeReport: policeReport || false,
          policeReportNumber: policeReport ? policeReportNumber : null,
          emergencyServices: emergencyServices || false,
          emergencyServicesDetails: emergencyServices ? emergencyServicesDetails : null,
          additionalNotes: additionalNotes || null
        }
      });

      // Add witnesses if any
      if (witnesses && witnesses.length > 0) {
        const validWitnesses = witnesses.filter((w: any) => w.name && w.name.trim());
        
        for (const witness of validWitnesses) {
          await tx.claimWitness.create({
            data: {
              claimId: newClaim.claimId,
              name: witness.name,
              phone: witness.phone || null,
              email: witness.email || null
            }
          });
        }
      }

      // Create status history entry
      await tx.claimStatusHistory.create({
        data: {
          claimId: newClaim.claimId,
          fromStatus: null,
          toStatus: 'DECLARED',
          changedBy: decoded.clientId,
          reason: 'Initial claim declaration',
          notes: 'Claim created by client through web portal'
        }
      });

      // Log the activity
      await tx.auditLog.create({
        data: {
          entityType: 'CLAIM',
          entityId: newClaim.claimId,
          claimId: newClaim.claimId,
          action: 'CREATE',
          description: `Claim ${claimNumber} created by client`,
          clientId: decoded.clientId,
          metadata: {
            claimNumber,
            claimType,
            claimedAmount,
            incidentDate: incidentDateTime.toISOString(),
            incidentLocation
          },
          ipAddress: request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown'
        }
      });

      return newClaim;
    });

    // Fire-and-forget: trigger AI risk scoring in background, don't block response
    const origin = request.nextUrl.origin;
    fetch(`${origin}/api/claims/${result.claimId}/score`, { method: 'POST' })
      .catch((err: unknown) => {
        // Non-blocking — scoring failure never prevents claim creation
        void err;
      });

    return NextResponse.json({
      success: true,
      message: 'Claim created successfully',
      data: {
        claimId: result.claimId,
        claimNumber: result.claimNumber,
        status: result.status,
        createdAt: result.createdAt
      }
    });

  } catch (error) {
    console.error('Error creating claim:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create claim' 
      },
      { status: 500 }
    );
  }
}

// GET method to fetch claim creation requirements/options
export async function GET(request: NextRequest) {
  try {
    // Get the token from the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization token required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    let decoded;
    try { decoded = verifyAccessToken(token); } catch { decoded = null; }
    
    if (!decoded || decoded.type !== 'CLIENT') {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Fetch client's active policies
    const policies = await prisma.policy.findMany({
      where: {
        clientId: decoded.clientId,
        status: 'ACTIVE',
        endDate: {
          gte: new Date() // Policy hasn't expired
        }
      },
      select: {
        policyId: true,
        policyNumber: true,
        policyType: true,
        status: true,
        insuredAmount: true,
        premiumAmount: true,
        startDate: true,
        endDate: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Get claim type options and document requirements
    const claimTypes = [
      { 
        value: 'ACCIDENT', 
        label: 'Accident', 
        requiredDocs: ['INCIDENT_PHOTOS', 'POLICE_REPORT', 'DAMAGE_ASSESSMENT'],
        description: 'Vehicle or personal accidents'
      },
      { 
        value: 'THEFT', 
        label: 'Theft', 
        requiredDocs: ['POLICE_REPORT', 'PROOF_OF_OWNERSHIP', 'INCIDENT_PHOTOS'],
        description: 'Theft of insured property'
      },
      { 
        value: 'FIRE', 
        label: 'Fire Damage', 
        requiredDocs: ['FIRE_REPORT', 'DAMAGE_PHOTOS', 'DAMAGE_ASSESSMENT'],
        description: 'Fire damage to insured property'
      },
      { 
        value: 'WATER_DAMAGE', 
        label: 'Water Damage', 
        requiredDocs: ['DAMAGE_PHOTOS', 'REPAIR_ESTIMATE', 'INCIDENT_REPORT'],
        description: 'Water damage to insured property'
      }
    ];

    return NextResponse.json({
      success: true,
      data: {
        policies,
        claimTypes,
        documentTypes: [
          { value: 'PHOTO', label: 'Photo/Image', accept: '.jpg,.jpeg,.png' },
          { value: 'DOCUMENT', label: 'Document', accept: '.pdf,.doc,.docx' },
          { value: 'RECEIPT', label: 'Receipt/Invoice', accept: '.pdf,.jpg,.jpeg,.png' },
          { value: 'REPORT', label: 'Official Report', accept: '.pdf,.doc,.docx' },
          { value: 'OTHER', label: 'Other', accept: '*/*' }
        ]
      }
    });

  } catch (error) {
    console.error('Error fetching claim requirements:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch claim requirements' 
      },
      { status: 500 }
    );
  }
}