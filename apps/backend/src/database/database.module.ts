import { Global, Module } from '@nestjs/common';
import { DatabaseService } from './database.service';

@Global() // Rend le service disponible dans toute l'application sans réimporter le module
@Module({
  providers: [DatabaseService],
  exports: [DatabaseService], // Exporte le service pour les autres modules
})
export class DatabaseModule {}
