import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { DiagramComponent } from './diagram/diagram.component';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

// Import services
import { BpmnService, DiagramStateService, CustomPropertiesService, FileService } from './services';

// Import decomposed components
import { 
  DiagramEditorComponent,
  PropertiesPanelComponent,
  DiagramToolbarComponent,
  DiagramStatusComponent
} from './components';

@NgModule({ 
  declarations: [
    AppComponent,
    DiagramComponent,
    DiagramEditorComponent,
    PropertiesPanelComponent,
    DiagramToolbarComponent,
    DiagramStatusComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule // Required for ngModel in properties panel
  ],
  providers: [
    provideHttpClient(withInterceptorsFromDi()),
    BpmnService,
    DiagramStateService,
    CustomPropertiesService,
    FileService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
