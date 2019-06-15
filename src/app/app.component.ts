import { Component } from '@angular/core';
import { PrintPdfService } from '../../projects/ng-print-pdf/src/lib/print-pdf.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  constructor(public printService: PrintPdfService) {}
}
