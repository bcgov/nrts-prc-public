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
      component.crownLandOrDispositionIDFilter.filter.value = null;

      const wasFilterHashUpdated = component.checkAndSetFiltersHash();

      const newFilterHash = component.filterHash;

      expect(newFilterHash).toEqual(oldFilterHash);

      expect(wasFilterHashUpdated).toEqual(false);
    });

    it('generates and sets a new filter hash if the filters have changed, and returns true', () => {
      component.crownLandOrDispositionIDFilter.filter.value = '222222';

      const wasFilterHashUpdated = component.checkAndSetFiltersHash();

      const newFilterHash = component.filterHash;

      expect(newFilterHash).not.toEqual(oldFilterHash);

      expect(wasFilterHashUpdated).toEqual(true);
    });
  });

  describe('getFilters', () => {
    beforeEach(() => {
      component.crownLandOrDispositionIDFilter.filter.value = '333333';
    });

    it('returns the filters as a basic object', () => {
      const filters = component.getFilters();

      expect(filters.clidDtid).toEqual('333333');
    });
  });
});
