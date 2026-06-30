import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const jeux = await prisma.jeu.findMany({ where: { type: 'QCM' } });
  console.log(JSON.stringify(jeux, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
