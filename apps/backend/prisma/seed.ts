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

  // --- Création de l'organisme par défaut ---
  const organisme = await prisma.organisme.upsert({
    where: { nom: 'LPO Auvergne-Rhône-Alpes' },
    update: {},
    create: {
      nom: 'LPO Auvergne-Rhône-Alpes',
    },
  });
  console.log(`🏢 Organisme par défaut prêt : ${organisme.nom}`);

  // --- Création du compte ADMIN (Administrateur régional) ---
  const adminEmail = 'admin@lpo.fr';
  const adminPassword = process.env.ADMIN_PASSWORD || 'LpoAdmin123!';
  const saltRounds = 12;
  const adminHashedPassword = await bcrypt.hash(adminPassword, saltRounds);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      organismeId: organisme.id, // S'assure que l'admin est bien rattaché
    },
    create: {
      email: adminEmail,
      password: adminHashedPassword,
      firstName: 'Admin',
      lastName: 'Régional',
      role: Role.ADMIN,
      isGuest: false,
      isEmailVerified: true,
      organismeId: organisme.id,
    },
  });
  console.log(`🎉 Admin prêt (Email: ${admin.email}, Mdp: ${adminPassword})`);

  // --- Création du compte EDITOR (Animateur) ---
  const editorEmail = 'editor@lpo.fr';
  const editorPassword = process.env.EDITOR_PASSWORD || 'LpoEditor123!';
  const editorHashedPassword = await bcrypt.hash(editorPassword, saltRounds);

  const editor = await prisma.user.upsert({
    where: { email: editorEmail },
    update: {
      organismeId: organisme.id, // S'assure que l'éditeur est bien rattaché
    },
    create: {
      email: editorEmail,
      password: editorHashedPassword,
      firstName: 'Animateur',
      lastName: 'LPO',
      role: Role.EDITOR,
      isGuest: false,
      isEmailVerified: true,
      organismeId: organisme.id,
    },
  });
  console.log(`🎉 Editor prêt (Email: ${editor.email}, Mdp: ${editorPassword})`);
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
