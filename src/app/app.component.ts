import { Component } from '@angular/core';
import { DiagramComponent } from './diagram/diagram.component';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css'],
    imports: [DiagramComponent]
})
export class AppComponent {
}
