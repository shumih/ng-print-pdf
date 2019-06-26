import { Injectable } from '@angular/core';
import { getDocument } from 'pdfjs-dist';
import { DEFAULT_PRINT_PDF_PARAMS, PrintPdfInterface } from '../models';
import {
  browser,
  createPrintPdfItem,
  createPrintFrame,
  performPrint,
  getPrintPageStyleSheet,
  blobToArrayBuffer,
  handlePrintEvents,
  getDimensionsAccordingToLayout,
} from '../helpers';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Injectable()
export class PrintPdfService {
  private pageStyleSheet: HTMLStyleElement | null = null;

  public inProcess$: Observable<boolean> = of(null).pipe(switchMap(() => this.inProcessSubject));

  private inProcessSubject: BehaviorSubject<boolean> = new BehaviorSubject(false);

  constructor() {
    handlePrintEvents(() => this.inProcessSubject.next(true), () => this.inProcessSubject.next(false));
  }

  public async printDocument(blob: Blob, externalParams: Partial<PrintPdfInterface> = {}): Promise<void> {
    const params: PrintPdfInterface = { ...DEFAULT_PRINT_PDF_PARAMS, ...externalParams };

    if (browser.isIE) {
      await this.printDocumentForIE(blob, params);
    } else {
      const objectURL = URL.createObjectURL(blob);

      await this.printDocumentForOtherBrowsers(objectURL, params);
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
      const dimensions = getDimensionsAccordingToLayout(page, params.layout);
      const pdfItem = await createPrintPdfItem(page, canvas, dimensions, params);
      container.appendChild(pdfItem);

      heights.push(dimensions.height);
      widths.push(dimensions.width);

      setTimeout(() => canvas.remove());
    }

    const iframe = this.getPrintFrame(params);
    document.body.appendChild(iframe);

    this.pageStyleSheet = getPrintPageStyleSheet(Math.max(...widths), Math.max(...heights));
    iframe.contentWindow.document.body.appendChild(this.pageStyleSheet);
    iframe.contentWindow.document.body.appendChild(container);
    iframe.contentDocument.body.style.background = 'black';
    iframe.contentDocument.body.style.margin = '0';

    return new Promise(resolve => {
      setTimeout(() => {
        performPrint(params);
        resolve();
      });
    });
  }

  private printDocumentForOtherBrowsers(objectURL: string, params: PrintPdfInterface): Promise<void> {
    return new Promise(resolve => {
      const printFrame = this.getPrintFrame(params);
      printFrame.setAttribute('type', 'application/pdf');
      printFrame.setAttribute('src', objectURL);
      document.body.appendChild(printFrame);

      printFrame.onload = () => {
        performPrint(params);

        URL.revokeObjectURL(objectURL);
        resolve();
      };
    });
  }

  private getPrintFrame(params: PrintPdfInterface): HTMLIFrameElement {
    const existedPrintFrame = document.getElementById(params.iframeId) as HTMLIFrameElement | null;

    if (!existedPrintFrame) {
      return createPrintFrame(params);
    }

    existedPrintFrame.innerHTML = '';
    existedPrintFrame.onload = null;
    existedPrintFrame.setAttribute('src', null);

    return existedPrintFrame;
  }
}
