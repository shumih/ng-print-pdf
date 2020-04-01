import { Component, ElementRef } from '@angular/core';
import { PrintPdfService } from '../../projects/ng-print-pdf/src/lib/print-pdf.service';
import { HttpClient } from '@angular/common/http';
import html2canvas from 'html2canvas';

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
      printResolution: 144,
      rotation: 0,
      scale: 1,
      cssUnits: 78.0 / 72.0,
      useCanvasToDataUrl: false,
      layout: 'portrait',
    });
  }

  public async getPagesCount(path: string): Promise<void> {
    const blob = await this.http.get(path, { responseType: 'blob', observe: 'body' }).toPromise();

    const pages = await this.printService.getPagesCount(blob);

    alert(pages);
  }

  public async handleCanvasClick(el: HTMLElement) {
    const clonedEl = el.cloneNode(true) as HTMLElement;
    clonedEl.setAttribute(
      'style',
      'position: absolute; left: -20000px; top: 0px; width: 21cm; margin: 27mm 16mm 27mm 16mm;'
    );
    document.body.appendChild(clonedEl);

    const canvas = await html2canvas(clonedEl, { scale: 2 });

    this.printService.printCanvas(canvas, {
      iframeId: 'pdfPrintIframe',
      printResolution: 300,
      rotation: 0,
      scale: 1,
      cssUnits: 96.0 / 72.0,
      useCanvasToDataUrl: true,
      layout: 'none',
    });
  }
}
