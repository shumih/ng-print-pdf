import { PdfPageDimension, PrintPdfInterface } from '../models';
import { PDFPageProxy } from 'pdfjs-dist';

export const browser = {
  isIE: navigator.userAgent.indexOf('MSIE') !== -1 || !!document['documentMode'],
  isFirefox: typeof window['InstallTrigger'] !== 'undefined',
};

export function getPrintPageStyleSheet(pageWidth: number, pageHeight: number): HTMLStyleElement {
  const pageStyleSheet = document.createElement('style');

  pageStyleSheet.textContent += `
    @supports ((size:A4) and (size:1pt 1pt)) {
      @page { size: ${pageWidth}pt ${pageHeight}pt;}
    };
    * {
      margin: 0;
      padding: 0;
    }
    img {
      position: absolute;
      margin: 0;
      padding: 0;
      display: block;
     }
    .wrapper {
      position: relative;
      top: 0;
      left: 0;
      width: 1px;
      height: 1px;
      overflow: visible;
      page-break-after: always;
      page-break-inside: avoid;
    }`;

  return pageStyleSheet;
}

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

export function normalizeRotationProperty(rotation: number, dimension: PdfPageDimension): number {
  let value: number;

  if (rotation % 90 !== 0) {
    value = 0;
  } else if (rotation >= 360) {
    value = rotation % 360;
  } else if (rotation < 0) {
    value = ((rotation % 360) + 360) % 360;
  } else {
    value = rotation;
  }

  return dimension.reverted ? value + 90 : value;
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
  params: PrintPdfInterface
): Promise<HTMLDivElement> {
  const { useCanvasToDataUrl, cssUnits, printResolution, scale, rotation } = params;
  const printUnits = printResolution / 72.0;
  const current = last(dimensions);
  const viewport = page.getViewport(scale, normalizeRotationProperty(rotation, current));

  canvas.width = Math.floor(viewport.width * printUnits);
  canvas.height = Math.floor(viewport.height * printUnits);

  const ctx = canvas.getContext('2d');
  ctx.save();
  ctx.fillStyle = 'rgb(255, 255, 255)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();

  const renderContext = {
    canvasContext: ctx,
    transform: [printUnits, 0, 0, printUnits, 0, 0],
    viewport,
    intent: 'print',
  };

  await deffer<PDFPageProxy>(async () => await page.render(renderContext).promise);

  const wrapper = document.createElement('div');
  const url = await getDataFromCanvas(canvas, useCanvasToDataUrl);
  const img = document.createElement('img');

  img.setAttribute('width', Math.floor(current.width * cssUnits) + 'px');
  img.setAttribute('height', Math.floor(current.height * cssUnits) + 'px');

  wrapper.setAttribute('class', 'wrapper');
  wrapper.appendChild(img);

  await new Promise(resolve => {
    img.onload = resolve;
    img.setAttribute('src', url);
  }).then(() => URL.revokeObjectURL(url));

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
  const supportToBlob = browser.isIE ? 'msToBlob' in canvas : 'toBlob' in canvas;

  if (supportToBlob && !useCanvasToDataUrl) {
    return new Promise(resolve =>
      browser.isIE
        ? resolve(URL.createObjectURL(canvas['msToBlob']()))
        : canvas.toBlob(blob => resolve(URL.createObjectURL(blob)))
    );
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

  const initial = { width: pageWidth, height: pageHeight, reverted: false };
  const reverted = { width: pageHeight, height: pageWidth, reverted: true };
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
