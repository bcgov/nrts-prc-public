import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { DetailsPanelComponent } from './details-panel.component';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ApplicationService } from 'app/services/application.service';
import { CommentPeriodService } from 'app/services/commentperiod.service';
import { ApiService } from 'app/services/api';
import { UrlService } from 'app/services/url.service';
import { of } from 'rxjs';
import { LinkifyPipe } from 'app/pipes/linkify.pipe';
import { NewlinesPipe } from 'app/pipes/newlines.pipe';
import { MockComponent } from 'ng-mocks';
import { DetailsMapComponent } from './details-map/details-map.component';

describe('DetailsPanelComponent', () => {
  let component: DetailsPanelComponent;
  let fixture: ComponentFixture<DetailsPanelComponent>;

  const applicationServiceSpy = jasmine.createSpyObj('ApplicationService', [
    'getById',
    'getCount',
    'isAmendment',
    'isAbandoned',
    'isApplicationUnderReview',
    'isApplicationReviewComplete',
    'isDecisionApproved',
    'isDecisionNotApproved',
    'isUnknown'
  ]);
  const commentPeriodServiceSpy = jasmine.createSpyObj('CommentPeriodService', ['isOpen']);
  const apiServiceSpy = jasmine.createSpyObj('ApiService', ['getDocumentUrl']);
  const urlServiceSpy = jasmine.createSpyObj('UrlService', ['query', 'save']);
  urlServiceSpy.onNavEnd$ = of();

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [DetailsPanelComponent, LinkifyPipe, NewlinesPipe, MockComponent(DetailsMapComponent)],
      providers: [
        NgbModal,
        { provide: ApplicationService, useValue: applicationServiceSpy },
        { provide: CommentPeriodService, useValue: commentPeriodServiceSpy },
        { provide: ApiService, useValue: apiServiceSpy },
        { provide: UrlService, useValue: urlServiceSpy }
      ]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DetailsPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
