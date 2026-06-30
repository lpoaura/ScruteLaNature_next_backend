const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const parcours = await prisma.parcours.findMany({
    include: { etapes: true }
  });
  console.log(JSON.stringify(parcours, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
