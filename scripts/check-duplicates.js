const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

async function checkDuplicateClaims() {
  // Create connection pool
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

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

    console.log('Duplicate claim numbers found:', duplicateClaimNumbers);

    if (duplicateClaimNumbers.length > 0) {
      console.log('\nDetailed information about duplicates:');
      
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
        
        console.log(`\nClaim Number: ${duplicate.claimNumber}`);
        console.log(`Number of duplicates: ${duplicate._count.claimNumber}`);
        claims.forEach((claim, index) => {
          console.log(`  ${index + 1}. ID: ${claim.claimId}, Created: ${claim.createdAt}, Client: ${claim.client?.firstName} ${claim.client?.lastName}`);
        });
      }
    } else {
      console.log('No duplicate claims found!');
    }

    // Also check for claims without unique constraints that might be causing issues
    const allClaims = await prisma.claim.findMany({
      select: {
        claimId: true,
        claimNumber: true,
        createdAt: true,
      },
      orderBy: {
        claimNumber: 'asc',
      },
    });

    console.log(`\nTotal claims in database: ${allClaims.length}`);
    
    // Show first few claims
    if (allClaims.length > 0) {
      console.log('\nFirst few claims:');
      allClaims.slice(0, 5).forEach((claim, index) => {
        console.log(`  ${index + 1}. ${claim.claimNumber} (ID: ${claim.claimId.substring(0, 8)}...)`);
      });
    }
    
  } catch (error) {
    console.error('Error checking for duplicates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDuplicateClaims();