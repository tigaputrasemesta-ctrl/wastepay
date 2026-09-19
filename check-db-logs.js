const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const recentPayments = await prisma.pembayaran.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log("Recent Pembayaran:");
  console.log(JSON.stringify(recentPayments, null, 2));
  
  // also check audit log if it exists
  try {
     const logs = await prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5
     });
     console.log("Recent Audit Logs:");
     console.log(JSON.stringify(logs, null, 2));
  } catch (e) { console.log("No audit log table or error."); }
})();
