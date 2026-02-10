import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { appConfig } from './app/app.config';
import { initializeTimezoneConfig } from './app/core/config/timezone.config';

// Inicializar configuração de timezone UTC
initializeTimezoneConfig();

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));