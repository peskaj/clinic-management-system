import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideAppInitializer, inject, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { AuthService } from './auth/auth.service';

import { routes } from './app.routes';

// IMPORTY KALENDARZA
import { CalendarModule, DateAdapter } from 'angular-calendar';
import { adapterFactory } from 'angular-calendar/date-adapters/date-fns';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(),
    // TWÓJ DZIAŁAJĄCY ZAPŁON AUTORYZACJI
    provideAppInitializer(() => inject(AuthService).refresh()),
    
    // ANIMACJE DLA ANGULAR MATERIAL
    provideAnimationsAsync(),
    
    // INICJALIZACJA KALENDARZA
    importProvidersFrom(
        CalendarModule.forRoot({
            provide: DateAdapter,
            useFactory: adapterFactory,
        })
    )
  ]
};