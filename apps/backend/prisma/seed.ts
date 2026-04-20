import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Démarrage du script de Seeding (Peuplement initial)...');

  // L'email et mot de passe par défaut peuvent être gérés via des variables d'environnement
  // ou on fixe des valeurs par défaut pour un environnement local.
  const superAdminEmail = 'superadmin@lpo.fr';
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'LpoAdmin123!';

  // On vérifie s'il n'y a pas déjà un compte avec cet email
  const existingAdmin = await prisma.user.findUnique({
    where: { email: superAdminEmail },
  });

  if (existingAdmin) {
    console.log(`✅ Un compte SUPER_ADMIN existe déjà avec l'email ${superAdminEmail}`);
  } else {
    // Hasher le mot de passe
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(superAdminPassword, saltRounds);

    // Créer le compte
    const superAdmin = await prisma.user.create({
      data: {
        email: superAdminEmail,
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'National',
        role: Role.SUPER_ADMIN,
        isGuest: false,
        isEmailVerified: true, // On le vérifie par défaut
      },
    });

    console.log(`🎉 Super Admin créé avec succès !`);
    console.log(`➡️  Email : ${superAdmin.email}`);
    console.log(`➡️  Mot de passe : ${superAdminPassword}`);
    console.log(`⚠️  Pensez à le changer rapidement en production !`);
  }
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seeding :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
