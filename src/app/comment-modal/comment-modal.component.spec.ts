import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { CommentModalComponent } from './comment-modal.component';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { CommentService } from 'app/services/comment.service';
import { DocumentService } from 'app/services/document.service';
import { CommentPeriod } from 'app/models/commentperiod';
import { DialogService } from 'ng2-bootstrap-modal';
import { MockComponent } from 'ng-mocks';
import { FileUploadComponent } from 'app/file-upload/file-upload.component';
import { MatProgressBar } from '@angular/material';

describe('CommentModalComponent', () => {
  let component: CommentModalComponent;
  let fixture: ComponentFixture<CommentModalComponent>;

  const commentServiceSpy = jasmine.createSpyObj('CommentService', ['add']);
  const documentServiceSpy = jasmine.createSpyObj('DocumentService', ['add']);

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [CommentModalComponent, MockComponent(FileUploadComponent), MatProgressBar],
      imports: [FormsModule],
      providers: [
        NgbActiveModal,
        DialogService,
        { provide: CommentService, useValue: commentServiceSpy },
        { provide: DocumentService, useValue: documentServiceSpy }
      ]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CommentModalComponent);
    component = fixture.componentInstance;

    component.currentPeriod = new CommentPeriod({});

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
