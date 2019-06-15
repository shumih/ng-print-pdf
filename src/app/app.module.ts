import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { PrintPdfModule } from '../../projects/ng-print-pdf/src/lib/print-pdf.module';
import { HttpClientModule } from '@angular/common/http';

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, HttpClientModule, PrintPdfModule],
  bootstrap: [AppComponent],
})
export class AppModule {}
