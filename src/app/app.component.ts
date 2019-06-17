import { Component } from '@angular/core';
import { PrintPdfService } from '../../projects/ng-print-pdf/src/lib/print-pdf.service';
import {HttpClient, HttpHeaders} from '@angular/common/http';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  constructor(public printService: PrintPdfService, private http: HttpClient) {}

  public async handleClick(): Promise<void> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/pdf' });

    const blob = await this.http.get('assets/f.pdf', { responseType: 'blob', observe: 'body', headers }).toPromise();
    this.printService.printDocument(blob, {}, true);
  }
}
