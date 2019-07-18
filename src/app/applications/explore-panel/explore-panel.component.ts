import { Component, OnDestroy, Output, EventEmitter } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import * as moment from 'moment';

import { ApplicationService } from 'app/services/application.service';
import { CommentPeriodService } from 'app/services/commentperiod.service';
import { PurposeInfoModalComponent } from 'app/applications/purpose-info-modal/purpose-info-modal.component';
import { UrlService } from 'app/services/url.service';

import { StatusCodes, PurposeCodes } from 'app/utils/constants/application';
import { CommentCodes } from 'app/utils/constants/comment';
import { ICodeGroup } from 'app/utils/constants/interfaces';
import { Filter, MultiStringFilter, IMultiStringFilterOption } from '../utils/filter';
import { IFiltersType, IUpdateEvent } from '../applications.component';

/**
 * Explore side panel.
 *
 * @export
 * @class ExplorePanelComponent
 * @implements {OnDestroy}
 */
@Component({
  selector: 'app-explore-panel',
  templateUrl: './explore-panel.component.html',
  styleUrls: ['./explore-panel.component.scss']
})
export class ExplorePanelComponent implements OnDestroy {
  @Output() update = new EventEmitter<IUpdateEvent>();

  readonly minDate = moment('2018-03-23').toDate(); // first app created
  readonly maxDate = moment().toDate(); // today

  public ngUnsubscribe: Subject<boolean> = new Subject<boolean>();

  // comment period filters
  public commentPeriodFilters = new MultiStringFilter({
    queryParamsKey: 'cpStatus',
    filters: [
      { queryParam: CommentCodes.OPEN.code, displayString: 'Commenting Open', isSelected: false },
      { queryParam: CommentCodes.NOT_OPEN.code, displayString: 'Commenting Closed', isSelected: false }
    ]
  });

  // application status filters
  public statusFilters = new MultiStringFilter({
    queryParamsKey: 'appStatuses',
    filters: [
      {
        queryParam: StatusCodes.APPLICATION_UNDER_REVIEW.param,
        displayString: StatusCodes.APPLICATION_UNDER_REVIEW.text.short,
        isSelected: false
      },
      {
        queryParam: StatusCodes.APPLICATION_REVIEW_COMPLETE.param,
        displayString: StatusCodes.APPLICATION_REVIEW_COMPLETE.text.short,
        isSelected: false
      },
      {
        queryParam: StatusCodes.DECISION_APPROVED.param,
        displayString: StatusCodes.DECISION_APPROVED.text.short,
        isSelected: false
      },
      {
        queryParam: StatusCodes.DECISION_NOT_APPROVED.param,
        displayString: StatusCodes.DECISION_NOT_APPROVED.text.short,
        isSelected: false
      },
      { queryParam: StatusCodes.ABANDONED.param, displayString: StatusCodes.ABANDONED.text.short, isSelected: false }
    ]
  });

  // application purpose filters
  public purposeFilters = new MultiStringFilter({
    queryParamsKey: 'purposes',
    filters: new PurposeCodes().getCodeGroups().map((codeGroup: ICodeGroup) => {
      return { queryParam: codeGroup.param, displayString: codeGroup.text.long, isSelected: false };
    })
  });

  // application publish from date filter
  public publishFromFilter = new Filter<Date>({ filter: { queryParam: 'publishFrom', value: null } });

  // application publish to date filter
  public publishToFilter = new Filter<Date>({ filter: { queryParam: 'publishTo', value: null } });

  constructor(
    public modalService: NgbModal,
    public applicationService: ApplicationService, // used in template
    public commentPeriodService: CommentPeriodService, // used in template
    public urlService: UrlService
  ) {
    // watch for URL param changes
    // NB: this must be in constructor to get initial parameters
    this.urlService.onNavEnd$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(() => {
      this.loadQueryParameters();
      if (this.areFiltersSet()) {
        this.emitUpdate({ search: false, resetMap: false, hidePanel: false });
      }
    });
  }

  /**
   * Toggles the given filters isSelected boolean.
   *
   * @param {IMultiStringFilterOption} filter
   * @memberof ExplorePanelComponent
   */
  public toggleFilter(filter: IMultiStringFilterOption) {
    filter.isSelected = !filter.isSelected;
  }

  /**
   * Emit the current selected filters to the parent.
   *
   * @param {IUpdateEvent} updateEventOptions
   * @memberof ExplorePanelComponent
   */
  public emitUpdate(updateEventOptions: IUpdateEvent) {
    this.update.emit({ ...updateEventOptions, filters: this.getFilters() });
  }

  /**
   * Gets any query parameters from the URL and updates the local filters accordingly.
   *
   * @memberof ExplorePanelComponent
   */
  public loadQueryParameters(): void {
    const cpStatusQueryParams = (this.urlService.getQueryParam(this.commentPeriodFilters.queryParamsKey) || '').split(
      '|'
    );
    this.commentPeriodFilters.filters.forEach(filter => {
      filter.isSelected = cpStatusQueryParams.includes(filter.queryParam);
    });

    const appStatusQueryParams = (this.urlService.getQueryParam(this.statusFilters.queryParamsKey) || '').split('|');
    this.statusFilters.filters.forEach(filter => {
      filter.isSelected = appStatusQueryParams.includes(filter.queryParam);
    });

    const appPurposeQueryParams = (this.urlService.getQueryParam(this.purposeFilters.queryParamsKey) || '').split('|');
    this.purposeFilters.filters.forEach(filter => {
      filter.isSelected = appPurposeQueryParams.includes(filter.queryParam);
    });

    this.publishFromFilter.filter.value = this.urlService.getQueryParam(this.publishFromFilter.filter.queryParam)
      ? moment(this.urlService.getQueryParam(this.publishFromFilter.filter.queryParam)).toDate()
      : null;

    this.publishToFilter.filter.value = this.urlService.getQueryParam(this.publishToFilter.filter.queryParam)
      ? moment(this.urlService.getQueryParam(this.publishToFilter.filter.queryParam)).toDate()
      : null;
  }

  /**
   * Parses the local filters into the type expected by the parent.
   *
   * @returns {IFiltersType}
   * @memberof ExplorePanelComponent
   */
  public getFilters(): IFiltersType {
    const filters = {
      cpStatuses: this.commentPeriodFilters.getQueryParamsArray(),
      appStatuses: this.statusFilters.getQueryParamsArray(),
      purposes: this.purposeFilters.getQueryParamsArray(),
      publishFrom: this.publishFromFilter.filter.value
        ? moment(this.publishFromFilter.filter.value)
            .startOf('day')
            .toDate()
        : null,
      publishTo: this.publishToFilter.filter.value
        ? moment(this.publishToFilter.filter.value)
            .endOf('day')
            .toDate()
        : null
    };

    return filters;
  }

  /**
   * Saves the currently selected filters to the url and emits them to the parent.
   *
   * @memberof ExplorePanelComponent
   */
  public applyAllFilters() {
    this.saveQueryParameters();
    this.emitUpdate({ search: true, resetMap: true, hidePanel: false });
  }

  /**
   * Saves the currently selected filters to the url and emits them to the parent.
   *
   * @memberof ExplorePanelComponent
   */
  public applyAllFiltersMobile() {
    this.saveQueryParameters();
    this.emitUpdate({ search: true, resetMap: true, hidePanel: true });
  }

  /**
   * Save the currently selected filters to the url.
   *
   * @memberof ExplorePanelComponent
   */
  public saveQueryParameters() {
    this.urlService.setQueryParam(
      this.commentPeriodFilters.queryParamsKey,
      this.commentPeriodFilters.getQueryParamsString()
    );

    this.urlService.setQueryParam(this.statusFilters.queryParamsKey, this.statusFilters.getQueryParamsString());

    this.urlService.setQueryParam(this.purposeFilters.queryParamsKey, this.purposeFilters.getQueryParamsString());

    this.urlService.setQueryParam(
      this.publishFromFilter.filter.queryParam,
      this.publishFromFilter.filter.value && moment(this.publishFromFilter.filter.value).format('YYYY-MM-DD')
    );

    this.urlService.setQueryParam(
      this.publishToFilter.filter.queryParam,
      this.publishToFilter.filter.value && moment(this.publishToFilter.filter.value).format('YYYY-MM-DD')
    );
  }

  /**
   * Resets all filters to their default (null, empty) values.
   * Removes the query parameters from the url.
   *
   * @memberof ExplorePanelComponent
   */
  public clear() {
    this.clearAllFilters();
    this.saveQueryParameters();
    this.emitUpdate({ search: false, resetMap: true, hidePanel: false });
  }

  /**
   * Resets all filters to their default (null, empty) values.
   *
   * @memberof ExplorePanelComponent
   */
  public clearAllFilters() {
    this.commentPeriodFilters.reset();
    this.statusFilters.reset();
    this.purposeFilters.reset();
    this.publishFromFilter.reset();
    this.publishToFilter.reset();
  }

  /**
   * Returns true if at least 1 filter is selected/populated., false otherwise.
   *
   * @returns {boolean}
   * @memberof ExplorePanelComponent
   */
  public areFiltersSet(): boolean {
    return (
      this.commentPeriodFilters.areFiltersSet() ||
      this.statusFilters.areFiltersSet() ||
      this.purposeFilters.areFiltersSet() ||
      this.publishFromFilter.isFilterSet() ||
      this.publishToFilter.isFilterSet()
    );
  }

  /**
   * Show purpose filter details modal.
   *
   * @memberof ExplorePanelComponent
   */
  public showPurposeInfoModal() {
    this.modalService.open(PurposeInfoModalComponent, { size: 'lg', windowClass: 'modal-fixed' });
  }

  /**
   * On component destroy.
   *
   * @memberof ExplorePanelComponent
   */
  public ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }
}
