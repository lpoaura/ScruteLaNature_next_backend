import { Global, Module } from '@nestjs/common';
import { AppConfigService } from './app-config.service';

/**
 * Module de configuration global.
 * Le décorateur @Global() rend AppConfigService injectable dans TOUT le projet
 * sans avoir besoin de l'importer dans chaque module.
 */
@Global()
@Module({
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class AppConfigModule {}
