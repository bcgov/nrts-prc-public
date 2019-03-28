import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { MarkerPopupComponent } from './marker-popup.component';
import { ApplicationService } from 'app/services/application.service';
import { CommentPeriodService } from 'app/services/commentperiod.service';
import { Application } from 'app/models/application';
import { UrlService } from 'app/services/url.service';
import { of } from 'rxjs';

describe('MarkerPopupComponent', () => {
  let component: MarkerPopupComponent;
  let fixture: ComponentFixture<MarkerPopupComponent>;

  const app = new Application({ _id: '1234' });

  const applicationServiceSpy = jasmine.createSpyObj('ApplicationService', [
    'getById',
    'getCount',
    'isAmendment',
    'isAbandoned',
    'isApplicationUnderReview',
    'isApplicationReviewComplete',
    'isDecisionApproved',
    'isDecisionNotApproved',
    'isUnknown',
    'getStatusStringLong'
  ]);
  const commentPeriodServiceSpy = jasmine.createSpyObj('CommentPeriodService', ['isOpen', 'getStatusStringLong']);
  const urlServiceSpy = jasmine.createSpyObj('UrlService', ['save', 'setFragment']);
  urlServiceSpy.onNavEnd$ = of();

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [MarkerPopupComponent],
      providers: [
        { provide: ApplicationService, useValue: applicationServiceSpy },
        { provide: CommentPeriodService, useValue: commentPeriodServiceSpy },
        { provide: UrlService, useValue: urlServiceSpy }
      ]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MarkerPopupComponent);
    component = fixture.componentInstance;

    applicationServiceSpy.getById.and.returnValue(of(app));

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('sets local app variable', () => {
      expect(component.app).toBe(app);
    });
  });
});
