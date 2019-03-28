import { Component, OnDestroy, Output, EventEmitter } from '@angular/core';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { CommentModalComponent } from 'app/comment-modal/comment-modal.component';
import { Application } from 'app/models/application';
import { ApplicationService } from 'app/services/application.service';
import { CommentPeriodService } from 'app/services/commentperiod.service';
import { ApiService } from 'app/services/api';
import { UrlService } from 'app/services/url.service';
import { Filter } from '../utils/filter';

/**
 * Details side panel.
 *
 * @export
 * @class DetailsPanelComponent
 * @implements {OnDestroy}
 */
@Component({
  selector: 'app-details-panel',
  templateUrl: './details-panel.component.html',
  styleUrls: ['./details-panel.component.scss']
})
export class DetailsPanelComponent implements OnDestroy {
  @Output() update = new EventEmitter();

  private ngUnsubscribe: Subject<boolean> = new Subject<boolean>();

  public addCommentModal: NgbModalRef = null;

  public isAppLoading: boolean;
  public applicationId: number = null;
  public application: Application = null;
  public currentPeriodDaysRemainingCount = 0;

  public applicationIdFilter = new Filter<string>({ filter: { queryParam: 'id', value: null } });

  constructor(
    public modalService: NgbModal,
    public applicationService: ApplicationService, // used in template
    public commentPeriodService: CommentPeriodService, // used in template
    public api: ApiService, // used in template
    public urlService: UrlService
  ) {
    // watch for URL param changes
    this.urlService.onNavEnd$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(() => {
      this.loadQueryParameters();
      if (!this.applicationIdFilter.filter.value) {
        // no application to display
        this.application = null;
      } else if (!this.application || this.application._id !== this.applicationIdFilter.filter.value) {
        // no application yet selected, or different application selected
        this.getApplication();
      }
    });
  }

  /**
   * The 'daysRemaining' value from the application current comment period, or else 0.
   *
   * @returns {number} application comment period 'daysRemaining'
   * @memberof DetailsPanelComponent
   */
  public CurrentPeriodDaysRemainingCount(): number {
    return this.application.currentPeriod ? this.application.currentPeriod['daysRemaining'] : 0;
  }

  /**
   * Fetches an application based on its id.
   *
   * @memberof DetailsPanelComponent
   */
  public getApplication() {
    this.isAppLoading = true;

    // load entire application so we get extra data (documents, decision, features)
    this.applicationService
      .getById(this.applicationIdFilter.filter.value, true)
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(
        application => {
          if (application) {
            this.application = application;

            this.isAppLoading = false;

            this.applicationIdFilter.filter.value = this.application._id;
            this.saveQueryParameters();

            this.update.emit(this.application);

            this.currentPeriodDaysRemainingCount = this.CurrentPeriodDaysRemainingCount();
          }
        },
        error => {
          this.isAppLoading = false;
          console.log('error =', error);
          alert("Uh-oh, couldn't load application");
        }
      );
  }

  /**
   * Shows the add comment modal.
   *
   * @memberof DetailsPanelComponent
   */
  public addComment() {
    if (this.application.currentPeriod) {
      // open modal
      this.addCommentModal = this.modalService.open(CommentModalComponent, {
        backdrop: 'static',
        size: 'lg',
        windowClass: 'comment-modal'
      });
      // set input parameter
      (this.addCommentModal.componentInstance as CommentModalComponent).currentPeriod = this.application.currentPeriod;
      // check result
      this.addCommentModal.result.then(
        () => {
          // saved
          this.addCommentModal = null; // for next time
        },
        () => {
          // dismissed
          this.addCommentModal = null; // for next time
        }
      );
    }
  }

  /**
   * Gets any query parameters from the URL and updates the local filters accordingly.
   *
   * @memberof DetailsPanelComponent
   */
  public loadQueryParameters(): void {
    this.applicationIdFilter.filter.value = this.urlService.getQueryParam(this.applicationIdFilter.filter.queryParam);
  }

  /**
   * Save the currently selected filters to the url.
   *
   * @memberof DetailsPanelComponent
   */
  public saveQueryParameters() {
    this.urlService.setQueryParam(this.applicationIdFilter.filter.queryParam, this.applicationIdFilter.filter.value);
  }

  /**
   * Resets all filters to their default (null, empty) values.
   *
   * @memberof DetailsPanelComponent
   */
  public clearAllFilters() {
    this.applicationIdFilter.reset();
  }

  /**
   * On component destroy.
   *
   * @memberof DetailsPanelComponent
   */
  ngOnDestroy() {
    if (this.addCommentModal) {
      (this.addCommentModal.componentInstance as CommentModalComponent).dismiss('destroying');
    }
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }
}
