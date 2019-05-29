import { Component, HostBinding } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { PurposeCodes } from 'app/utils/constants/application';
import { ICodeGroup } from 'app/utils/constants/interfaces';

@Component({
  selector: 'app-purpose-info-modal',
  templateUrl: './purpose-info-modal.component.html',
  styleUrls: ['./purpose-info-modal.component.scss']
})
export class PurposeInfoModalComponent {
  @HostBinding('class') classes = 'modal-content-flex';

  purposeCodeGroups: ICodeGroup[];

  constructor(public activeModal: NgbActiveModal) {
    this.purposeCodeGroups = new PurposeCodes().getCodeGroups();
  }
}
