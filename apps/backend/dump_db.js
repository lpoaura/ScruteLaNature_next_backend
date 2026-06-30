const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const parcours = await prisma.parcours.findMany({
    include: { 
      etapes: {
        include: { jeux: true }
      } 
    }
  });
  
  console.log("=== TOUS LES PARCOURS ET LEURS ETAPES ===");
  parcours.forEach(p => {
    console.log(`\nParcours: [${p.id}] ${p.title}`);
    console.log(`Etapes (${p.etapes.length}):`);
    p.etapes.forEach(e => {
      console.log(`  - [${e.id}] ${e.title} (Order: ${e.order})`);
      e.jeux.forEach(j => {
        console.log(`      -> Jeu: [${j.id}] type=${j.type}`);
      });
    });
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
