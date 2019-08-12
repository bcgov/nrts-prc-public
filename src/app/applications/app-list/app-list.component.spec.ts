import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { AppListComponent } from './app-list.component';
import { RouterTestingModule } from '@angular/router/testing';
import { CommentPeriodService } from 'app/services/commentperiod.service';
import { ApplicationService } from 'app/services/application.service';

describe('AppListComponent', () => {
  let component: AppListComponent;
  let fixture: ComponentFixture<AppListComponent>;

  const applicationServiceSpy = jasmine.createSpyObj('ApplicationService', ['getById']);
  const commentPeriodService = jasmine.createSpyObj('CommentPeriodService', ['isOpen', 'isNotOpen', 'getStatusString']);

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [AppListComponent],
      imports: [RouterTestingModule],
      providers: [
        { provide: ApplicationService, useValue: applicationServiceSpy },
        { provide: CommentPeriodService, useValue: commentPeriodService }
      ]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AppListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
