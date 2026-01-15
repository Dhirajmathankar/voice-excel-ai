import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExcelAiComponent } from './excel-ai.component';

describe('ExcelAiComponent', () => {
  let component: ExcelAiComponent;
  let fixture: ComponentFixture<ExcelAiComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExcelAiComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExcelAiComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
