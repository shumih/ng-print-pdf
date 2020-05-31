# NgPrintPdf

The library is available as an [npm package](https://www.npmjs.com/package/ng-print-pdf).
This library uses [Mozilla PDF.js](https://github.com/mozilla/pdf.js) to support IE11. It uses native api in other browsers. 

## Install

To install the package run:

```bash
npm i ng-print-pdf
```

## Usage
import PrintPdfModule in target module:
```typescript
import { PrintPdfModule } from 'ng-print-pdf';

@NgModule({
  imports: [PrintPdfModule]
})
export class AppModule {}
```
and inject PrintPdfService:

```typescript
export class PdfService {
  constructor(private printPdfService: PrintPdfService) {}

  public printFile(blob: Blob) {
      return this.printPdfService.printDocument(blob, {
        printResolution: 144,
        scale: 1,
        cssUnits: 78.0 / 72.0,
        layout: 'portrait',
      });
    }
}
```

## Cautions
This solution requires a lot of memory in IE browser. Therefore it's better to add extra check for amount of pages in file.

```typescript
public async isSafeToPrintPdf(blob: Blob) {
  if (!isIE) {
    return true;
  }

  const amountOfPages = await this.printPdfService.getPagesCount(blob)

  return amountOfPages < 35;
}
```
