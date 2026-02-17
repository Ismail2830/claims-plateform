// API to check for duplicate claims
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

// Type for the claim with included client data
type ClaimWithClient = {
  claimId: string;
  createdAt: Date;
  status: string;
  client: {
    firstName: string;
    lastName: string;
    email: string;
  } | null;
};

export async function GET(request: NextRequest) {
  try {
    console.log('Checking for duplicate claims...');
    
    // Find duplicate claim numbers
    const duplicateClaimNumbers = await prisma.claim.groupBy({
      by: ['claimNumber'],
      _count: {
        claimNumber: true,
      },
      having: {
        claimNumber: {
          _count: {
            gt: 1,
          },
        },
      },
    });

    let detailedDuplicates = [];
    
    if (duplicateClaimNumbers.length > 0) {
      for (const duplicate of duplicateClaimNumbers) {
        const claims = await prisma.claim.findMany({
          where: {
            claimNumber: duplicate.claimNumber,
          },
          include: {
            client: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        });
        
        detailedDuplicates.push({
          claimNumber: duplicate.claimNumber,
          count: duplicate._count.claimNumber,
          claims: claims.map((claim: ClaimWithClient) => ({
            id: claim.claimId,
            createdAt: claim.createdAt,
            client: claim.client ? `${claim.client.firstName} ${claim.client.lastName}` : 'N/A',
            status: claim.status,
          }))
        });
      }
    }

    // Get total claims count
    const totalClaims = await prisma.claim.count();

    // Get a sample of claims to verify structure
    const sampleClaims = await prisma.claim.findMany({
      take: 5,
      select: {
        claimId: true,
        claimNumber: true,
        createdAt: true,
        status: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        duplicatesFound: duplicateClaimNumbers.length > 0,
        duplicateCount: duplicateClaimNumbers.length,
        duplicates: detailedDuplicates,
        totalClaims,
        sampleClaims,
      },
    });

  } catch (error) {
    console.error('Error checking for duplicates:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to check for duplicate claims',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}