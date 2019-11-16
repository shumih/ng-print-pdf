import { NgModule } from '@angular/core';
import { PrintPdfService } from './print-pdf.service';
import { GlobalWorkerOptions } from 'pdfjs-dist/webpack'

GlobalWorkerOptions.workerSrc = 'pdfjs-dist/pdf.worker.entry';
@NgModule({
  providers: [PrintPdfService],
})
export class PrintPdfModule {}
