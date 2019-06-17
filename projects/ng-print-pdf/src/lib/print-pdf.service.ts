import { Injectable } from '@angular/core';
import { getDocument, PDFPageProxy } from 'pdfjs-dist';
import { DEFAULT_PRINT_PDF_PARAMS, PrintPdfInterface } from '../models';
import { browser, normalizeRotationProperty, hideEl, blobToArrayBuffer } from '../helpers';
import { BehaviorSubject, Observable, of, Subject } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Injectable()
export class PrintPdfService {
  private pageStyleSheet: HTMLStyleElement | null = null;

  public inProcess$: Observable<boolean> = of(null).pipe(switchMap(() => this.inProcessSubject));

  private inProcessSubject: BehaviorSubject<boolean> = new BehaviorSubject(false);

  public async printDocument(
    blob: Blob,
    externalParams: Partial<PrintPdfInterface> = {},
    isIE: boolean
  ): Promise<void> {
    const params: PrintPdfInterface = { ...DEFAULT_PRINT_PDF_PARAMS, ...externalParams };

    this.beforePrint(params);

    if (browser.isIE || isIE) {
      await this.printDocumentForIE(blob, params);
    } else {
      const objectURL = URL.createObjectURL(blob);

      await this.printDocumentForOtherBrowsers(objectURL, params);
    }

    this.afterPrint(params);
  }

  private beforePrint(params: PrintPdfInterface): void {
    this.inProcessSubject.next(true);
  }

  private afterPrint(params: PrintPdfInterface): void {
    this.inProcessSubject.next(false);
    const iframeEl = document.getElementById(params.iframeId);

    if (iframeEl) {
      iframeEl.remove();
    }
  }

  private async printDocumentForIE(blob: Blob, params: PrintPdfInterface): Promise<void> {
    const data = (await blobToArrayBuffer(blob)) as any;
    const doc = await getDocument(data).promise;
    const container = document.createElement('div');

    const heights: number[] = [];
    const widths: number[] = [];

    for (let i = 1; i <= doc.numPages; i++) {
      const canvas = document.createElement('canvas');
      const page = await doc.getPage(i);
      const pdfItem = await this.createPrintPdfItem(page, canvas, params);
      container.appendChild(pdfItem);

      const [_, __, pageWidth, pageHeight] = page.view;
      heights.push(pageHeight);
      widths.push(pageWidth);

      setTimeout(() => canvas.remove());
    }

    const iframe = this.createIframe(params);
    document.body.appendChild(iframe);

    this.pageStyleSheet = this.getStyleSheet(Math.max(...widths), Math.max(...heights));
    iframe.contentWindow.document.body.appendChild(this.pageStyleSheet);
    iframe.contentWindow.document.body.appendChild(container);

    return new Promise(resolve => {
      setTimeout(() => {
        this.performPrint(iframe);
        resolve();
      });
    });
  }

  private async createPrintPdfItem(
    page: PDFPageProxy,
    canvas: HTMLCanvasElement,
    { useCanvasToDataUrl, cssUnits, printResolution, rotation, scale }: PrintPdfInterface
  ): Promise<HTMLDivElement> {
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

  private createIframe(params: PrintPdfInterface): HTMLIFrameElement {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('id', params.iframeId);
    hideEl(iframe);

    return iframe;
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

    pageStyleSheet.textContent = `@supports ((size:A4) and (size:1pt 1pt)) {
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
