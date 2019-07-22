import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import * as _ from 'lodash';
import * as moment from 'moment';

import { ApplicationService } from 'app/services/application.service';
import { CommentPeriodService } from 'app/services/commentperiod.service';
import { PurposeInfoModalComponent } from 'app/applications/purpose-info-modal/purpose-info-modal.component';
import { UrlService } from 'app/services/url.service';

import { StatusCodes, PurposeCodes } from 'app/utils/constants/application';
import { CommentCodes } from 'app/utils/constants/comment';
import { ICodeGroup } from 'app/utils/constants/interfaces';
import { ConstantUtils, CodeType } from 'app/utils/constants/constantUtils';

@Component({
  selector: 'app-explore-panel',
  templateUrl: './explore-panel.component.html',
  styleUrls: ['./explore-panel.component.scss']
})
export class ExplorePanelComponent implements OnInit, OnDestroy {
  @Output() updateFilters = new EventEmitter(); // to applications component
  @Output() hideSidePanel = new EventEmitter(); // to applications component // used in template
  @Output() resetView = new EventEmitter(); // to applications component

  readonly minDate = moment('2018-03-23').toDate(); // first app created
  readonly maxDate = moment().toDate(); // today

  private ngUnsubscribe: Subject<boolean> = new Subject<boolean>();

  // search keys for lists
  public cpStatusKeys: string[] = [];
  public appStatusKeys: string[] = [];
  public purposeKeys: string[] = [];
  public subpurposeKeys: string[] = [];

  public cpStatusFilters: object = {}; // array-like object
  public _cpStatusFilters: object = {}; // temporary filters for Cancel feature

  public appStatusFilters: object = {}; // array-like object
  public _appStatusFilters: object = {}; // temporary filters for Cancel feature

  public purposeFilters: object = {}; // array-like object
  public _purposeFilters: object = {}; // temporary filters for Cancel feature

  public subpurposeFilters: object = {}; // array-like object
  public _subpurposeFilters: object = {}; // temporary filters for Cancel feature

  public publishFromFilter: Date = null;
  public _publishFromFilter: Date = null; // temporary filters for Cancel feature

  public publishToFilter: Date = null;
  public _publishToFilter: Date = null; // temporary filters for Cancel feature

  constructor(
    private modalService: NgbModal,
    public applicationService: ApplicationService, // used in template
    public commentPeriodService: CommentPeriodService, // used in template
    private urlService: UrlService
  ) {
    // declare comment period status keys
    this.cpStatusKeys.push(CommentCodes.OPEN.code);
    this.cpStatusKeys.push(CommentCodes.NOT_OPEN.code);

    // declare application status keys - don't include UNKNOWN
    this.appStatusKeys.push(StatusCodes.APPLICATION_UNDER_REVIEW.param);
    this.appStatusKeys.push(StatusCodes.APPLICATION_REVIEW_COMPLETE.param);
    this.appStatusKeys.push(StatusCodes.DECISION_APPROVED.param);
    this.appStatusKeys.push(StatusCodes.DECISION_NOT_APPROVED.param);
    this.appStatusKeys.push(StatusCodes.ABANDONED.param);

    // declare purpose keys
    new PurposeCodes().getCodeGroups().map((codeGroup: ICodeGroup) => this.purposeKeys.push(codeGroup.param));

    // declare subpurpose keys
    new PurposeCodes()
      .getCodeGroups()
      .map((codeGroup: ICodeGroup) =>
        this.subpurposeKeys.concat(codeGroup.mappedCodes.map(mappedCode => mappedCode.toUpperCase()))
      );

    // initialize temporary filters
    this.cpStatusKeys.forEach(key => {
      this._cpStatusFilters[key] = false;
    });
    this.appStatusKeys.forEach(key => {
      this._appStatusFilters[key] = false;
    });
    this.purposeKeys.forEach(key => {
      this._purposeFilters[key] = false;
    });
    this.subpurposeKeys.forEach(key => {
      this._subpurposeFilters[key] = false;
    });

    // watch for URL param changes
    // NB: this must be in constructor to get initial parameters
    this.urlService.onNavEnd$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(() => {
      // get initial or updated parameters
      // TODO: could also get params from event.url
      const hasChanges = this.getParameters();

      // notify applications component that we have new filters
      if (hasChanges) {
        this.updateFilters.emit(this.getFilters());
      }
    });
  }

  private getParameters(): boolean {
    const cpStatuses = (this.urlService.query('cpStatuses') || '').split('|');
    this.cpStatusKeys.forEach(key => {
      this.cpStatusFilters[key] = cpStatuses.includes(key);
    });

    const appStatuses = (this.urlService.query('appStatuses') || '').split('|');
    this.appStatusKeys.forEach(key => {
      this.appStatusFilters[key] = appStatuses.includes(key);
    });

    const purposes = (this.urlService.query('purposes') || '').split('|');
    this.purposeKeys.forEach(key => {
      this.purposeFilters[key] = purposes.includes(key);
    });

    const subpurposes = (this.urlService.query('subpurposes') || '').split('|');
    this.subpurposeKeys.forEach(key => {
      this.subpurposeFilters[key] = subpurposes.includes(key);
    });

    this.publishFromFilter = this.urlService.query('publishFrom')
      ? moment(this.urlService.query('publishFrom')).toDate()
      : null;
    this.publishToFilter = this.urlService.query('publishTo')
      ? moment(this.urlService.query('publishTo')).toDate()
      : null;

    // const hasFilters = _.values(this.cpStatusFilters).find(b => b)
    //   || _.values(this.appStatusFilters).find(b => b)
    //   || _.values(this.purposeFilters).find(b => b)
    //   || _.values(this.subpurposeFilters).find(b => b)
    //   || !!this.publishFromFilter
    //   || !!this.publishToFilter;

    const hasChanges =
      !_.isEqual(this._cpStatusFilters, this.cpStatusFilters) ||
      !_.isEqual(this._appStatusFilters, this.appStatusFilters) ||
      !_.isEqual(this._purposeFilters, this.purposeFilters) ||
      !_.isEqual(this._subpurposeFilters, this.subpurposeFilters) ||
      !_.isEqual(this._publishFromFilter, this.publishFromFilter) ||
      !_.isEqual(this._publishToFilter, this.publishToFilter);

    // copy all data from actual to temporary properties
    this._cpStatusFilters = { ...this.cpStatusFilters };
    this._appStatusFilters = { ...this.appStatusFilters };
    this._purposeFilters = { ...this.purposeFilters };
    this._subpurposeFilters = { ...this.subpurposeFilters };
    this._publishFromFilter = this.publishFromFilter;
    this._publishToFilter = this.publishToFilter;

    return hasChanges;
  }

  public ngOnInit() {}

  public ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  public getFilters(): object {
    // convert array-like objects to arrays
    const cpStatuses: string[] = [];
    Object.keys(this.cpStatusFilters).forEach(key => {
      if (this.cpStatusFilters[key]) {
        cpStatuses.push(key);
      }
    });

    const appStatuses: string[] = [];
    Object.keys(this.appStatusFilters).forEach(key => {
      if (this.appStatusFilters[key]) {
        appStatuses.push(key);
      }
    });

    const purposes: string[] = [];
    Object.keys(this.purposeFilters).forEach(key => {
      if (this.purposeFilters[key]) {
        purposes.push(key);
      }
    });

    const subpurposes: string[] = [];
    Object.keys(this.subpurposeFilters).forEach(key => {
      if (this.subpurposeFilters[key]) {
        subpurposes.push(key);
      }
    });

    return {
      cpStatuses: cpStatuses,
      appStatuses: appStatuses,
      purposes: purposes,
      subpurposes: subpurposes,
      publishFrom: this.publishFromFilter
        ? moment(this.publishFromFilter)
            .startOf('day')
            .toDate()
        : null,
      publishTo: this.publishToFilter
        ? moment(this.publishToFilter)
            .endOf('day')
            .toDate()
        : null
    };
  }

  public applyAllFilters(doNotify: boolean = true) {
    // notify applications component to reset map view so user has context of what results are returned
    this.resetView.emit();

    // apply all temporary filters
    this.cpStatusFilters = { ...this._cpStatusFilters };
    this.appStatusFilters = { ...this._appStatusFilters };
    this.purposeFilters = { ...this._purposeFilters };
    this.subpurposeFilters = { ...this._subpurposeFilters };
    this.publishFromFilter = this._publishFromFilter;
    this.publishToFilter = this._publishToFilter;

    // save parameters
    this._saveParameters();

    // notify applications component that we have new filters
    if (doNotify) {
      this.updateFilters.emit(this.getFilters());
    }
  }

  private _saveParameters() {
    let cpStatuses: string = null;
    this.cpStatusKeys.forEach(key => {
      if (this.cpStatusFilters[key]) {
        if (!cpStatuses) {
          cpStatuses = key;
        } else {
          cpStatuses += '|' + key;
        }
      }
    });

    let appStatuses: string = null;
    this.appStatusKeys.forEach(key => {
      if (this.appStatusFilters[key]) {
        if (!appStatuses) {
          appStatuses = key;
        } else {
          appStatuses += '|' + key;
        }
      }
    });

    let purposes: string = null;
    this.purposeKeys.forEach(key => {
      if (this.purposeFilters[key]) {
        if (!purposes) {
          purposes = key;
        } else {
          purposes += '|' + key;
        }
      }
    });

    let subpurposes: string = null;
    this.subpurposeKeys.forEach(key => {
      if (this.subpurposeFilters[key]) {
        if (!subpurposes) {
          subpurposes = key;
        } else {
          subpurposes += '|' + key;
        }
      }
    });

    this.urlService.save('cpStatuses', cpStatuses);
    this.urlService.save('appStatuses', appStatuses);
    this.urlService.save('purposes', purposes);
    this.urlService.save('subpurposes', subpurposes);
    this.urlService.save('publishFrom', this.publishFromFilter && moment(this.publishFromFilter).format('YYYY-MM-DD'));
    this.urlService.save('publishTo', this.publishToFilter && moment(this.publishToFilter).format('YYYY-MM-DD'));
  }

  // clear all temporary filters
  public clearAllFilters(doNotify: boolean = true) {
    if (this.filterCount() > 0) {
      this.cpStatusKeys.forEach(key => {
        this._cpStatusFilters[key] = false;
      });
      this.appStatusKeys.forEach(key => {
        this._appStatusFilters[key] = false;
      });
      this.purposeKeys.forEach(key => {
        this._purposeFilters[key] = false;
      });
      this.subpurposeKeys.forEach(key => {
        this._subpurposeFilters[key] = false;
      });
      this._publishFromFilter = null;
      this._publishToFilter = null;

      this.applyAllFilters(doNotify);
    }
  }

  // return count of filters
  public filterCount(): number {
    const cpStatusCount = this.cpStatusKeys.filter(key => this.cpStatusFilters[key]).length;
    const appStatusCount = this.appStatusKeys.filter(key => this.appStatusFilters[key]).length;
    const purposeCount = this.purposeKeys.filter(key => this.purposeFilters[key]).length;
    const subpurposeCount = this.subpurposeKeys.filter(key => this.subpurposeFilters[key]).length;
    const publishCount = this.publishFromFilter || this.publishToFilter ? 1 : 0;

    return cpStatusCount + appStatusCount + purposeCount + subpurposeCount + publishCount;
  }

  public showPurposeInfoModal() {
    // open modal
    this.modalService.open(PurposeInfoModalComponent, {
      size: 'lg',
      windowClass: 'modal-fixed'
    });
  }

  /**
   * Given a purpose code, returns a user-friendly long purpose string.
   *
   * @param {string} purposeCode
   * @returns {string}
   * @memberof ExplorePanelComponent
   */
  getPurposeStringLong(purposeCode: string): string {
    return ConstantUtils.getTextLong(CodeType.PURPOSE, purposeCode);
  }

  /**
   * Given a status code, returns a user-friendly long status string.
   *
   * @param {string} statusCode
   * @returns {string}
   * @memberof CommentPeriodService
   */
  getStatusStringLong(statusCode: string): string {
    if (statusCode === CommentCodes.NOT_OPEN.code) {
      // Even though the status is Not Open, we want to display Closed, as it is less confusing for the average user
      // Could expand the explore filters to include an option to filter by comment periods that have not yet started
      return CommentCodes.CLOSED.text.long;
    }
    return ConstantUtils.getTextLong(CodeType.COMMENT, statusCode);
  }
}
