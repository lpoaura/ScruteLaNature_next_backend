import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const token = await prisma.verificationToken.findFirst({ orderBy: { createdAt: 'desc' } });
  console.log(token?.token);
}
main().finally(() => prisma.$disconnect());
