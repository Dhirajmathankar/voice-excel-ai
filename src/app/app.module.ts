import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';

import { AppComponent } from './app.component';
import { ExcelAiComponent } from './excel-ai/excel-ai.component';
import { CommandCenterComponent } from './command-center/command-center.component';

@NgModule({
  declarations: [
    AppComponent,
    ExcelAiComponent,
    CommandCenterComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
