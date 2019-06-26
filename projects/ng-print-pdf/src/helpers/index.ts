import { PdfPageDimensions, PrintPdfInterface } from '../models';
import { PDFPageProxy } from 'pdfjs-dist';

export const browser = {
  isIE: navigator.userAgent.indexOf('MSIE') !== -1 || !!document['documentMode'],
};

export function deffer<T>(fn: (...args: unknown[]) => PromiseLike<T>, ...args: unknown[]): PromiseLike<T> {
  return new Promise(resolve => {
    requestAnimationFrame(async () => {
      resolve(await fn(...args));
    });
  });
}

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

  pageStyleSheet.textContent += `
    @supports ((size:A4) and (size:1pt 1pt)) {
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

export async function createPrintPdfItem(
  page: PDFPageProxy,
  canvas: HTMLCanvasElement,
  { width, height }: PdfPageDimensions,
  { useCanvasToDataUrl, cssUnits, printResolution, rotation, scale }: PrintPdfInterface
): Promise<HTMLDivElement> {
  const printUnits = printResolution / 72.0;

  const canvasWidth = (canvas.width = Math.floor(width * printUnits));
  const canvasHeight = (canvas.height = Math.floor(height * printUnits));

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

  await deffer<PDFPageProxy>(async () => await page.render(renderContext).promise);

  const wrapper = document.createElement('div');
  const img = document.createElement('img');
  img.setAttribute('width', Math.floor(width * cssUnits) + 'px');
  img.setAttribute('height', Math.floor(height * cssUnits) + 'px');
  img.setAttribute('src', await getDataFromCanvas(canvas, useCanvasToDataUrl));
  img.setAttribute('style', 'margin: auto; display: block;');

  wrapper.setAttribute('style', 'margin: 4px; display: block;');
  wrapper.appendChild(img);

  await new Promise(resolve => (img.onload = resolve));

  return wrapper;
}

export function hideEl(el: HTMLElement): void {
  el.setAttribute('style', 'visibility: hidden; position: absolute; left: -20000px; top: 0px;');
}

export function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  const reader = new FileReader();

  return new Promise((resolve, reject) => {
    reader.addEventListener('error', reject);
    reader.addEventListener('loadend', event => resolve(event.target['result']));

    reader.readAsArrayBuffer(blob);
  });
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
    case 'landscape': {
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
