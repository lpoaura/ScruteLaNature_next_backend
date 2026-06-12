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
  // --- Création de données de test (Saint-Étienne) ---
  console.log(`🌲 Création des données de test pour Saint-Étienne...`);

  const zonageParcEurope = await prisma.zonage.upsert({
    where: { nom: "Parc de l'Europe" },
    update: {},
    create: { nom: "Parc de l'Europe", code: "42100" },
  });

  const zonageGorges = await prisma.zonage.upsert({
    where: { nom: "Gorges de la Loire" },
    update: {},
    create: { nom: "Gorges de la Loire", code: "42230" },
  });

  // Nettoyage des parcours de test pour éviter les doublons lors des relances
  await prisma.parcours.deleteMany({
    where: { title: { in: ["Découverte du Parc de l'Europe", "Balade des Gorges de la Loire"] } }
  });

  const parcours1 = await prisma.parcours.create({
    data: {
      title: "Découverte du Parc de l'Europe",
      description: "Une balade familiale idéale pour découvrir les oiseaux en milieu urbain.",
      difficulty: "FACILE",
      distanceKm: 2.5,
      durationMin: 45,
      coverImage: "https://images.unsplash.com/photo-1611003228941-98852ba62227?q=80&w=600&auto=format&fit=crop",
      status: "PUBLISHED",
      organismeId: organisme.id,
      zonageId: zonageParcEurope.id,
      isChildFriendly: true,
      isPMRFriendly: true,
      etapes: {
        create: [
          {
            order: 1,
            title: "L'entrée du Parc",
            latitude: 45.4220,
            longitude: 4.4060,
            jeux: {
              create: [
                {
                  order: 1,
                  type: "INFO",
                  question: "Le saviez-vous ?",
                  explication: "Le Parc de l'Europe abrite plus de 30 espèces d'oiseaux différentes, même en plein cœur de Saint-Étienne !",
                }
              ]
            }
          },
          {
            order: 2,
            title: "Le grand cèdre",
            latitude: 45.4230,
            longitude: 4.4070,
            jeux: {
              create: [
                {
                  order: 1,
                  type: "QCM",
                  question: "Quel oiseau commun est reconnaissable à sa calotte bleue ?",
                  explication: "La Mésange bleue est très commune dans les parcs urbains.",
                  reponse: "Mésange bleue",
                  donneesJeu: {
                    options: ["Pigeon ramier", "Mésange bleue", "Merle noir"]
                  }
                }
              ]
            }
          }
        ]
      }
    }
  });

  const parcours2 = await prisma.parcours.create({
    data: {
      title: "Balade des Gorges de la Loire",
      description: "Une randonnée spectaculaire offrant des points de vue uniques sur le fleuve.",
      difficulty: "MOYEN",
      distanceKm: 5.0,
      durationMin: 120,
      coverImage: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=600&auto=format&fit=crop",
      status: "PUBLISHED",
      organismeId: organisme.id,
      zonageId: zonageGorges.id,
      isChildFriendly: false,
      isPMRFriendly: false,
      etapes: {
        create: [
          {
            order: 1,
            title: "Le belvédère",
            latitude: 45.4300,
            longitude: 4.2500,
            jeux: {
              create: [
                {
                  order: 1,
                  type: "QCM",
                  question: "Quel rapace survole fréquemment ces gorges ?",
                  explication: "Le Milan noir est un visiteur estival très commun ici.",
                  reponse: "Milan noir",
                  donneesJeu: {
                    options: ["Faucon pèlerin", "Milan noir", "Chouette effraie"]
                  }
                }
              ]
            }
          }
        ]
      }
    }
  });

  console.log(`✅ Parcours de test créés avec succès (Saint-Étienne) !`);
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
