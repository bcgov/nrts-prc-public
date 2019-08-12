import { ComponentFixture, async, TestBed } from '@angular/core/testing';
import { SplashModalComponent } from './splash-modal.component';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';

describe('SplashModalComponent', () => {
  let component: SplashModalComponent;
  let fixture: ComponentFixture<SplashModalComponent>;

  const activatedRouteStub = {};

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [SplashModalComponent],
      imports: [FormsModule, RouterTestingModule],
      providers: [{ provide: ActivatedRoute, useValue: activatedRouteStub }, NgbActiveModal]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SplashModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
