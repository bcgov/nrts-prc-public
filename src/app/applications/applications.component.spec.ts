import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { FormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { ApplicationsComponent } from './applications.component';
import { MatSnackBar } from '@angular/material';
import { ApplicationService } from 'app/services/application.service';
import { UrlService } from 'app/services/url.service';
import { of } from 'rxjs';
import { Renderer2 } from '@angular/core';
import { MockComponent } from 'ng-mocks';
import { DetailsPanelComponent } from './details-panel/details-panel.component';
import { FindPanelComponent } from './find-panel/find-panel.component';
import { ExplorePanelComponent } from './explore-panel/explore-panel.component';
import { AppListComponent } from './app-list/app-list.component';
import { AppMapComponent } from './app-map/app-map.component';

describe('ApplicationsComponent', () => {
  let component: ApplicationsComponent;
  let fixture: ComponentFixture<ApplicationsComponent>;

  const matSnackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);
  const applicationServiceSpy = jasmine.createSpyObj('ApplicationService', ['getAll', 'getCount']);
  applicationServiceSpy.getCount.and.returnValue(of());
  const urlServiceSpy = jasmine.createSpyObj('UrlService', ['setFragment']);
  urlServiceSpy.onNavEnd$ = of();

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [
        ApplicationsComponent,
        MockComponent(DetailsPanelComponent),
        MockComponent(ExplorePanelComponent),
        MockComponent(FindPanelComponent),
        MockComponent(AppListComponent),
        MockComponent(AppMapComponent)
      ],
      imports: [NgbModule, FormsModule, RouterTestingModule],
      providers: [
        { provide: MatSnackBar, useValue: matSnackBarSpy },
        { provide: ApplicationService, useValue: applicationServiceSpy },
        { provide: UrlService, useValue: urlServiceSpy },
        Renderer2
      ]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ApplicationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
