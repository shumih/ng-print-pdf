import { NgModule } from '@angular/core';
import { GlobalWorkerOptions } from 'pdfjs-dist/webpack';

GlobalWorkerOptions.workerSrc = 'pdfjs-dist/pdf.worker.entry';
@NgModule()
export class PrintPdfModule {}
