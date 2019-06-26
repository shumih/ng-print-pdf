import { PdfPageDimensions, PrintPdfInterface } from '../models';
import { PDFPageProxy } from 'pdfjs-dist';

export const browser = {
  isIE: navigator.userAgent.indexOf('MSIE') !== -1 || !!document['documentMode'],
};

export function normalizeRotationProperty(rotate: number): number {
  if (rotate % 90 !== 0) {
    return 0;
  } else if (rotate >= 360) {
    return rotate % 360;
  } else if (rotate < 0) {
    return ((rotate % 360) + 360) % 360;
  }
}

export function getPrintPageStyleSheet(pageWidth: number, pageHeight: number): HTMLStyleElement {
  const pageStyleSheet = document.createElement('style');

  pageStyleSheet.textContent = `@supports ((size:A4) and (size:1pt 1pt)) {
        @page { size: ${pageWidth}pt ${pageHeight}pt;}
      };`;

  return pageStyleSheet;
}

export function performPrint(params: PrintPdfInterface): void {
  const iframeEl = document.getElementById(params.iframeId) as HTMLIFrameElement;
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

export function createPrintFrame(params: PrintPdfInterface): HTMLIFrameElement {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('id', params.iframeId);
  // iframe.setAttribute('height', '100%');
  // iframe.setAttribute('width', '100%');
  hideEl(iframe);

  return iframe;
}

export function hideEl(el: HTMLElement): void {
  el.setAttribute('style', 'visibility: hidden; position: absolute; left: -2000px;');
}

export function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  const reader = new FileReader();

  return new Promise((resolve, reject) => {
    reader.addEventListener('error', reject);
    reader.addEventListener('loadend', event => resolve(event.target['result']));

    reader.readAsArrayBuffer(blob);
  });
}

export function handlePrintEvents(onBefore?: () => void, onAfter?: () => void): void {
  if (window.matchMedia) {
    const mediaQueryList = window.matchMedia('print');
    mediaQueryList.addListener(change => (change.matches ? onBefore && onBefore() : onAfter && onAfter()));
  }
}

export function getDataFromCanvas(canvas: HTMLCanvasElement, useCanvasToDataUrl: boolean): Promise<string> {
  if ('toBlob' in canvas && !useCanvasToDataUrl) {
    return new Promise(resolve => canvas.toBlob(blob => resolve(URL.createObjectURL(blob))));
  } else {
    return Promise.resolve(canvas['toDataURL']());
  }
}

export function getDimensionsAccordingToLayout(
  page: PDFPageProxy,
  layout: PrintPdfInterface['layout']
): PdfPageDimensions {
  const [_, __, pageWidth, pageHeight] = page.view;

  switch (layout) {
    case 'album': {
      return pageWidth > pageHeight
        ? { width: pageWidth, height: pageHeight }
        : { width: pageHeight, height: pageWidth };
    }
    case 'portrait': {
      return pageWidth < pageHeight
        ? { width: pageWidth, height: pageHeight }
        : { width: pageHeight, height: pageWidth };
    }
    default:
      return { width: pageWidth, height: pageHeight };
  }
}
