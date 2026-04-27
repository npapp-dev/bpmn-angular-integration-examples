import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import {
  DiagramStateService,
  CustomPropertiesService,
  FileService
} from './services';
import { ValidationService } from './services/validation.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection(),
    provideHttpClient(withInterceptorsFromDi()),
    provideRouter([]),
    DiagramStateService,
    CustomPropertiesService,
    ValidationService,
    FileService
    // BpmnService is intentionally NOT a root provider — it's component-scoped
    // on DiagramComponent so each diagram instance owns its own modeler.
  ]
};
