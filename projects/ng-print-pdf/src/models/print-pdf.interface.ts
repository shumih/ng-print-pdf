export interface PrintPdfInterface {
  iframeId: string;
  printResolution: number;
  rotation: number;
  scale: number;
  cssUnits: number;
  useCanvasToDataUrl: boolean;
  layout?: 'portrait' | 'album';
}

export interface PdfPageDimensions {
  width: number;
  height: number;
}
