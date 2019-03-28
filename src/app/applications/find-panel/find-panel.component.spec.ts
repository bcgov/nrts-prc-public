import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { FindPanelComponent } from './find-panel.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute } from '@angular/router';
import { UrlService } from 'app/services/url.service';
import { of } from 'rxjs';

describe('FindPanelComponent', () => {
  let component: FindPanelComponent;
  let fixture: ComponentFixture<FindPanelComponent>;

  const activatedRouteStub = {};
  const urlServiceSpy = jasmine.createSpyObj('UrlService', ['query', 'save']);
  urlServiceSpy.onNavEnd$ = of();

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [FindPanelComponent],
      imports: [NgbModule, FormsModule, RouterTestingModule],
      providers: [
        { provide: ActivatedRoute, useValue: activatedRouteStub },
        { provide: UrlService, useValue: urlServiceSpy }
      ]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FindPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
