import { PdfPageDimension, PrintPdfInterface } from '../models';
import { PDFPageProxy } from 'pdfjs-dist';

export const browser = {
  isIE: navigator.userAgent.indexOf('MSIE') !== -1 || !!document['documentMode'],
  isFirefox: typeof window['InstallTrigger'] !== 'undefined',
};

export function last<T>(array: T[]): T {
  return array[array.length - 1];
}

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

export function getScaleFactor(dimensions: PdfPageDimension[]): number {
  const first = dimensions[0];
  const current = last(dimensions);

  const widthFactor = first.width / current.width;
  const heightFactor = first.height / current.height;
  const maxScaleFactor = Math.max(widthFactor, heightFactor);
  const minScaleFactor = Math.min(widthFactor, heightFactor);

  return minScaleFactor < 1 ? minScaleFactor : maxScaleFactor;
}

export function getPrintPageStyleSheet(pageWidth: number, pageHeight: number): HTMLStyleElement {
  const pageStyleSheet = document.createElement('style');

  pageStyleSheet.textContent += `
    @supports ((size:A4) and (size:1pt 1pt)) {
      @page { size: ${pageWidth}pt ${pageHeight}pt;}
    };
    * {
      margin: 0;
      padding: 0;
    }`;

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
  iframe.setAttribute('height', '100%');
  iframe.setAttribute('width', '100%');
  hideEl(iframe);

  return iframe;
}

export function createPrintCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('style', 'display: block;');

  return canvas;
}

export async function createPrintPdfItem(
  page: PDFPageProxy,
  canvas: HTMLCanvasElement,
  dimensions: PdfPageDimension[],
  { useCanvasToDataUrl, cssUnits, printResolution, rotation, scale }: PrintPdfInterface
): Promise<HTMLDivElement> {
  const printUnits = printResolution / 72.0;

  const current = last(dimensions);
  const scaleFactor = getScaleFactor(dimensions);

  canvas.width = Math.floor(current.width * printUnits);
  canvas.height = Math.floor(current.height * printUnits);

  const ctx = canvas.getContext('2d');
  ctx.save();
  ctx.fillStyle = 'rgb(255, 255, 255)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();

  const renderContext = {
    canvasContext: ctx,
    transform: [printUnits, 0, 0, printUnits, 0, 0],
    viewport: page.getViewport(scaleFactor * scale, normalizeRotationProperty(rotation)),
    intent: 'print',
  };

  await deffer<PDFPageProxy>(async () => await page.render(renderContext).promise);

  const wrapper = document.createElement('div');
  const img = document.createElement('img');
  img.setAttribute('width', Math.floor(current.width * cssUnits * ( 1 / scaleFactor)) + 'px');
  img.setAttribute('height', Math.floor(current.height * cssUnits * ( 1 / scaleFactor)) + 'px');
  img.setAttribute('src', await getDataFromCanvas(canvas, useCanvasToDataUrl));
  img.setAttribute('style', 'margin: 0; padding: 0; display: block;');

  wrapper.setAttribute(
    'style',
    `
    position: relative;
    top: 0;
    left: 0;
    width: 1px;
    height: 1px;
    overflow: visible;
    page-break-after: always;
    page-break-inside: avoid;`
  );
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

export function getDimensionAccordingToLayout(
  page: PDFPageProxy,
  first: PdfPageDimension | undefined,
  layout: PrintPdfInterface['layout']
): PdfPageDimension {
  const [_, __, pageWidth, pageHeight] = page.view;

  const initial = { width: pageWidth, height: pageHeight };
  const reverted = { width: pageHeight, height: pageWidth };
  const isLandscape = pageWidth > pageHeight;

  switch (layout) {
    case 'fixed': {
      return first && first.width > first.height !== isLandscape ? reverted : initial;
    }
    case 'landscape': {
      return isLandscape ? initial : reverted;
    }
    case 'portrait': {
      return isLandscape ? reverted : initial;
    }
    default:
      return initial;
  }
}
