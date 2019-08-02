import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { DetailsMapComponent } from './details-map.component';
import { FeatureService } from 'app/services/feature.service';
import { Application } from 'app/models/application';
import { Feature } from 'app/models/feature';

describe('DetailsMapComponent', () => {
  let component: DetailsMapComponent;
  let fixture: ComponentFixture<DetailsMapComponent>;

  const mockFeatureService = jasmine.createSpyObj('FeatureService', ['getByApplicationId', 'getByTantalisId']);

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [DetailsMapComponent],
      providers: [{ provide: FeatureService, useValue: mockFeatureService }]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DetailsMapComponent);
    component = fixture.componentInstance;
    component.application = new Application();
    mockFeatureService.getByApplicationId.and.returnValue(of([new Feature()]));
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
