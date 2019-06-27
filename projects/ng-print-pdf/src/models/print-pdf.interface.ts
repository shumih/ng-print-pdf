export interface PrintPdfInterface {
  iframeId: string;
  printResolution: number;
  rotation: number;
  scale: number;
  cssUnits: number;
  useCanvasToDataUrl: boolean;
  layout: 'portrait' | 'landscape' | 'none' | 'fixed';
}

export interface PdfPageDimension {
  width: number;
  height: number;
}

export interface PdfPrintProgressEvent {
  index: number;
  totalCount: number;
}
