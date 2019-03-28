import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ExplorePanelComponent } from './explore-panel.component';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ApplicationService } from 'app/services/application.service';
import { CommentPeriodService } from 'app/services/commentperiod.service';
import { UrlService } from 'app/services/url.service';
import { of } from 'rxjs';
import { MockComponent } from 'ng-mocks';
import { DateInputComponent } from './date-input/date-input.component';
import { FormsModule } from '@angular/forms';

describe('ExplorePanelComponent', () => {
  let component: ExplorePanelComponent;
  let fixture: ComponentFixture<ExplorePanelComponent>;

  const applicationServiceSpy = jasmine.createSpyObj('ApplicationService', ['getStatusStringShort']);
  const commentPeriodServiceSpy = jasmine.createSpyObj('CommentPeriodService', ['getStatusString']);
  const urlServiceSpy = jasmine.createSpyObj('UrlService', ['query', 'save']);
  urlServiceSpy.onNavEnd$ = of();

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ExplorePanelComponent, MockComponent(DateInputComponent)],
      imports: [FormsModule],
      providers: [
        NgbModal,
        { provide: ApplicationService, useValue: applicationServiceSpy },
        { provide: CommentPeriodService, useValue: commentPeriodServiceSpy },
        { provide: UrlService, useValue: urlServiceSpy }
      ]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ExplorePanelComponent);
    component = fixture.componentInstance;

    applicationServiceSpy.getStatusStringShort.and.returnValue('shortStatusString');

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
