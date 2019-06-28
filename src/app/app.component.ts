import { Component } from '@angular/core';
import { PrintPdfService } from '../../projects/ng-print-pdf/src/lib/print-pdf.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  constructor(public printService: PrintPdfService, private http: HttpClient) {}

  public async handleClick(path: string): Promise<void> {
    const blob = await this.http.get(path, { responseType: 'blob', observe: 'body' }).toPromise();

    this.printService.printDocument(blob);
  }

  public async handleIEClick(path: string): Promise<void> {
    const blob = await this.http.get(path, { responseType: 'blob', observe: 'body' }).toPromise();

    (this.printService as any).printDocumentForIEorFirefox(blob, {
      iframeId: 'pdfPrintIframe',
      printResolution: 150,
      rotation: 0,
      scale: 1,
      cssUnits: 96.0 / 72.0,
      useCanvasToDataUrl: true,
      layout: 'portrait'
    });
  }
}
