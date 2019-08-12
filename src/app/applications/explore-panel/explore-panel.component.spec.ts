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
import { MultiFilter } from '../utils/filter';
import * as moment from 'moment';

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

  describe('checkAndSetFiltersHash', () => {
    let oldFilterHash: string;

    beforeEach(() => {
      component.filterHash = null;

      component.checkAndSetFiltersHash();

      oldFilterHash = component.filterHash;
    });

    it('sets the filter hash if it is null', () => {
      expect(component.filterHash).not.toEqual(null);
    });

    it('generates the same filter hash if the filters have no changed, and returns false', () => {
      component.publishFromFilter.filter.value = null;

      const wasFilterHashUpdated = component.checkAndSetFiltersHash();

      const newFilterHash = component.filterHash;

      expect(newFilterHash).toEqual(oldFilterHash);

      expect(wasFilterHashUpdated).toEqual(false);
    });

    it('generates and sets a new filter hash if the filters have changed, and returns true', () => {
      component.publishFromFilter.filter.value = new Date();

      const wasFilterHashUpdated = component.checkAndSetFiltersHash();

      const newFilterHash = component.filterHash;

      expect(newFilterHash).not.toEqual(oldFilterHash);

      expect(wasFilterHashUpdated).toEqual(true);
    });
  });

  describe('toggleFilter', () => {
    it('toggles a multi filter boolean value field', () => {
      const multiFilter = new MultiFilter<boolean>({
        queryParamsKey: 'someParamKey',
        filters: [{ queryParam: 'someQueryparam', displayString: 'someDisplayString', value: false }]
      });

      component.toggleFilter(multiFilter.filters[0]);

      expect(multiFilter.filters[0].value).toEqual(true);

      component.toggleFilter(multiFilter.filters[0]);

      expect(multiFilter.filters[0].value).toEqual(false);
    });
  });

  describe('getFilters', () => {
    const now = new Date();

    beforeEach(() => {
      component.publishFromFilter.filter.value = now;
      component.publishToFilter.filter.value = now;

      component.purposeFilters.filters[0].value = true;

      component.statusFilters.filters[2].value = true;

      component.commentPeriodFilters.filters[1].value = true;
    });

    it('returns the filters as a basic object', () => {
      const filters = component.getFilters();

      expect(filters.publishFrom).toEqual(
        moment(now)
          .startOf('day')
          .toDate()
      );
      expect(filters.publishTo).toEqual(
        moment(now)
          .endOf('day')
          .toDate()
      );
      expect(filters.appStatuses).toEqual(['DA']);
      expect(filters.purposes).toEqual(['AGR']);
      expect(filters.cpStatuses).toEqual(['NOT_OPEN']);
    });
  });
});
