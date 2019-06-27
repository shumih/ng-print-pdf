import { PrintPdfInterface } from './print-pdf.interface';

export const DEFAULT_PRINT_PDF_PARAMS: PrintPdfInterface = {
  iframeId: 'pdfPrintIframe',
  printResolution: 150,
  rotation: 0,
  scale: 1,
  cssUnits: 96.0 / 72.0,
  useCanvasToDataUrl: true,
  layout: 'none'
};
