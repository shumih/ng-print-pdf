import { Observable, of, Subject } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { Injectable } from '@angular/core';
import { getDocument, PDFPageProxy } from 'pdfjs-dist';
import { DEFAULT_PRINT_PDF_PARAMS, PrintPdfInterface, PdfPrintProgressEvent, PdfPageDimension } from '../models';
import {
  browser,
  deffer,
  createPrintPdfItem,
  createPrintFrame,
  createPrintCanvas,
  performPrint,
  getPrintPageStyleSheet,
  blobToArrayBuffer,
  getDimensionAccordingToLayout,
} from '../helpers';

@Injectable()
export class PrintPdfService {
  private pageStyleSheet: HTMLStyleElement | null = null;

  public progress$: Observable<PdfPrintProgressEvent> = of(null).pipe(switchMap(() => this.progressSubject));

  private progressSubject: Subject<PdfPrintProgressEvent> = new Subject();

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

    const dimensions: PdfPageDimension[] = [];
    const totalCount = doc.numPages;

    for (let i = 1; i <= totalCount; i++) {
      const canvas = createPrintCanvas();
      const page = await deffer<PDFPageProxy>(doc.getPage.bind(doc), i);

      dimensions.push(getDimensionAccordingToLayout(page, dimensions[0], params.layout));
      const pdfItem = await deffer(createPrintPdfItem, page, canvas, dimensions, params);
      container.appendChild(pdfItem);

      this.progressSubject.next({ index: i, totalCount });

      canvas.remove();
    }

    const iframe = this.getPrintFrame(params);
    document.body.appendChild(iframe);

    this.pageStyleSheet = getPrintPageStyleSheet(
      Math.max(...dimensions.map(d => d.width)),
      Math.max(...dimensions.map(d => d.height))
    );
    iframe.contentWindow.document.body.appendChild(this.pageStyleSheet);
    iframe.contentWindow.document.body.appendChild(container);
    iframe.contentDocument.body.style.background = 'black';
    iframe.contentDocument.body.style.margin = '0';

    return deffer(async () => performPrint(params));
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
