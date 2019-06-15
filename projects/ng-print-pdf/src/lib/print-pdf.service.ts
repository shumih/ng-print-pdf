import { HttpClient, HttpHeaders } from '@angular/common/http';

import { Injectable } from '@angular/core';
import { getDocument, PDFPageProxy } from 'pdfjs-dist';
import { DEFAULT_PRINT_PDF_PARAMS, PrintPdfInterface } from '../models';
import { browser, normalizeRotationProperty, hideEl } from '../helpers';

@Injectable()
export class PrintPdfService {
  private pageStyleSheet: HTMLStyleElement | null = null;

  constructor(private http: HttpClient) {}

  public async printDocument(src: string, externalParams: Partial<PrintPdfInterface> = {}): Promise<void> {
    const params: PrintPdfInterface = { ...DEFAULT_PRINT_PDF_PARAMS, ...externalParams };

    this.beforePrint(params);

    if (browser.isIE) {
      this.printDocumentForIE(src, params);
    } else {
      const headers = new HttpHeaders({ 'Content-Type': 'application/pdf' });

      const blob = await this.http.get(src, { responseType: 'blob', observe: 'body', headers }).toPromise();
      const objectURL = URL.createObjectURL(blob);

      await this.printDocumentForOtherBrowsers(objectURL, params);
    }
  }

  private beforePrint(params: PrintPdfInterface): void {
    const iframeEl = document.getElementById(params.iframeId);

    if (iframeEl) {
      iframeEl.remove();
    }
  }

  private async printDocumentForIE(src: string, params: PrintPdfInterface): Promise<void> {
    const { printResolution, rotation, scale } = params;
    const canvas = document.createElement('canvas');
    const doc = await getDocument(src).promise;
    const page = await doc.getPage(1);
    const [_, __, pageWidth, pageHeight] = page.view;

    const printUnits = printResolution / 72.0;

    const canvasWidth = (canvas.width = Math.floor(pageWidth * printUnits));
    const canvasHeight = (canvas.height = Math.floor(pageHeight * printUnits));

    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.fillStyle = 'rgb(255, 255, 255)';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    ctx.restore();

    const renderContext = {
      canvasContext: ctx,
      transform: [printUnits, 0, 0, printUnits, 0, 0],
      viewport: page.getViewport(scale, normalizeRotationProperty(rotation)),
      intent: 'print',
    };

    await page.render(renderContext).promise;
    const pdfItem = await this.createPrintPdfItem(canvas, page, params);
    const wrapper = document.createElement('div');
    // wrapper.setAttribute('style', 'display: flex;justify-content: center;align-items: center');
    // wrapper.setAttribute('width', '100vw');
    // wrapper.setAttribute('height', '100vh');
    wrapper.appendChild(pdfItem);

    const iframe = document.createElement('iframe');
    hideEl(iframe);
    document.body.appendChild(iframe);

    if (this.pageStyleSheet) {
      this.pageStyleSheet.remove();
    }

    this.pageStyleSheet = this.getStyleSheet(pageWidth, pageHeight);
    iframe.contentWindow.document.body.appendChild(this.pageStyleSheet);
    iframe.contentWindow.document.body.appendChild(pdfItem);
    setTimeout(() => this.performPrint(iframe));
    setTimeout(() => canvas.remove());
  }

  private async createPrintPdfItem(
    canvas: HTMLCanvasElement,
    page: PDFPageProxy,
    { useCanvasToDataUrl, cssUnits }: PrintPdfInterface
  ): Promise<HTMLDivElement> {
    const [_, __, pageWidth, pageHeight] = page.view;

    const width = Math.floor(pageWidth * cssUnits) + 'px';
    const height = Math.floor(pageHeight * cssUnits) + 'px';

    const img = document.createElement('img') as HTMLImageElement;
    img.setAttribute('width', width + 'px');
    img.setAttribute('height', height + 'px');
    img.setAttribute('src', await this.getDataFromCanvas(canvas, useCanvasToDataUrl));
    img.setAttribute('style', 'margin: auto;');

    await new Promise(resolve => (img.onload = resolve));

    return img;
  }

  private getDataFromCanvas(canvas: HTMLCanvasElement, useCanvasToDataUrl: boolean): Promise<string> {
    if ('toBlob' in canvas && !useCanvasToDataUrl) {
      return new Promise(resolve => canvas.toBlob(blob => resolve(URL.createObjectURL(blob))));
    } else {
      return Promise.resolve(canvas['toDataURL']());
    }
  }

  private printDocumentForOtherBrowsers(objectURL: string, { iframeId }: PrintPdfInterface): Promise<void> {
    return new Promise(resolve => {
      const printFrame = document.createElement('iframe');

      hideEl(printFrame);
      printFrame.setAttribute('id', iframeId);
      printFrame.setAttribute('src', objectURL);

      document.body.appendChild(printFrame);

      let iframeEl = document.getElementById(iframeId) as HTMLIFrameElement;
      iframeEl.onload = () => {
        this.performPrint(iframeEl);

        URL.revokeObjectURL(objectURL);
        iframeEl = null;

        setTimeout(resolve);
      };
    });
  }

  private getStyleSheet(pageWidth: number, pageHeight: number): HTMLStyleElement {
    const pageStyleSheet = document.createElement('style');

    pageStyleSheet.textContent =
      `@supports ((size:A4) and (size:1pt 1pt)) {
        @page { size: ${pageWidth}pt ${pageHeight}pt;}
      };`;

    return pageStyleSheet;
  }

  private performPrint(iframeEl: HTMLIFrameElement) {
    iframeEl.focus();

    if (browser.isIE) {
      try {
        iframeEl.contentWindow.document.execCommand('print', false, null);
      } catch (e) {
        iframeEl.contentWindow.print();
      }
    } else {
      iframeEl.contentWindow.print();
    }
  }
}
