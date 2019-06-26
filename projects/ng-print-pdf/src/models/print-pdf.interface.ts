export interface PrintPdfInterface {
  iframeId: string;
  printResolution: number;
  rotation: number;
  scale: number;
  cssUnits: number;
  useCanvasToDataUrl: boolean;
  layout?: 'portrait' | 'landscape';
}

export interface PdfPageDimensions {
  width: number;
  height: number;
}

export interface PdfPrintProgressEvent {
  index: number;
  totalCount: number;
}
