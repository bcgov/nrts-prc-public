import { Component, OnDestroy, Output, EventEmitter } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { UrlService } from 'app/services/url.service';
import { Filter, FilterUtils } from '../utils/filter';
import { Panel } from '../utils/panel.enum';
import { IUpdateEvent } from '../applications.component';
import { IFiltersType } from 'app/services/application.service';

/**
 * Find side panel.
 *
 * @export
 * @class FindPanelComponent
 * @implements {OnDestroy}
 */
@Component({
  selector: 'app-find-panel',
  templateUrl: './find-panel.component.html',
  styleUrls: ['./find-panel.component.scss']
})
export class FindPanelComponent implements OnDestroy {
  @Output() update = new EventEmitter<IUpdateEvent>();

  public filterHash: string;

  private ngUnsubscribe: Subject<boolean> = new Subject<boolean>();

  public crownLandOrDispositionIDFilter = new Filter<string>({ filter: { queryParam: 'clidDtid', value: null } });

  constructor(public urlService: UrlService) {
    this.urlService.onNavEnd$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(() => {
      this.loadQueryParameters();
      if (this.areFiltersSet()) {
        this.emitUpdate({ search: false, resetMap: false, hidePanel: false });
      }
    });
  }

  /**
   * Computes a hash based on the current filters, updates the local filterHash value if the newly computed hash is
   * different from the current hash, and returns true if the hash was updated, or false otherwise.
   *
   * @returns {boolean}
   * @memberof FindPanelComponent
   */
  public checkAndSetFiltersHash(): boolean {
    const newFilterHash = FilterUtils.hashFilters(this.crownLandOrDispositionIDFilter);

    if (this.filterHash === newFilterHash) {
      return false;
    }

    this.filterHash = newFilterHash;
    return true;
  }

  /**
   * Emit the current selected filters to the parent, if the filters have changed since the last time emit was called.
   *
   * @memberof FindPanelComponent
   */
  public emitUpdate(updateEventOptions: IUpdateEvent) {
    if (this.checkAndSetFiltersHash()) {
      this.update.emit({ ...updateEventOptions, filters: this.getFilters() });
    }
  }

  /**
   * Gets any query parameters from the URL and updates the local filters accordingly.
   *
   * @memberof FindPanelComponent
   */
  public loadQueryParameters(): void {
    this.crownLandOrDispositionIDFilter.filter.value = this.urlService.getQueryParam(
      this.crownLandOrDispositionIDFilter.filter.queryParam
    );
  }

  /**
   * Parses the local filters into the type expected by the parent.
   *
   * @returns {IFiltersType}
   * @memberof FindPanelComponent
   */
  public getFilters(): IFiltersType {
    return { clidDtid: this.crownLandOrDispositionIDFilter.filter.value };
  }

  /**
   * Saves the currently selected filters to the url and emits them to the parent.
   *
   * @memberof FindPanelComponent
   */
  public applyAllFilters() {
    this.saveQueryParameters();
    this.emitUpdate({ search: true, resetMap: false, hidePanel: false });
  }

  /**
   * Saves the currently selected filters to the url and emits them to the parent.
   *
   * @memberof ExplorePanelComponent
   */
  public applyAllFiltersMobile() {
    this.saveQueryParameters();
    this.emitUpdate({ search: true, resetMap: false, hidePanel: true });
  }

  /**
   * Save the currently selected filters to the url.
   *
   * @memberof FindPanelComponent
   */
  public saveQueryParameters() {
    this.urlService.setQueryParam(
      this.crownLandOrDispositionIDFilter.filter.queryParam,
      this.crownLandOrDispositionIDFilter.filter.value
    );
  }

  /**
   * Resets all filters to their default (null, empty) values.
   * Removes the query parameters from the url.
   *
   * @memberof FindPanelComponent
   */
  public clear() {
    this.clearAllFilters();
    this.saveQueryParameters();
    this.emitUpdate({ search: true, resetMap: true, hidePanel: false });
  }

  /**
   * Resets all filters to their default (null, empty) values.
   *
   * @memberof FindPanelComponent
   */
  public clearAllFilters() {
    this.crownLandOrDispositionIDFilter.reset();
  }
  /**
   * Returns true if at least 1 filter is selected/populated, false otherwise.
   *
   * @returns {boolean}
   * @memberof FindPanelComponent
   */
  public areFiltersSet(): boolean {
    return this.crownLandOrDispositionIDFilter.isFilterSet();
  }

  public showExplorePanel() {
    this.urlService.setFragment(Panel.Explore);
  }

  /**
   * On component destroy.
   *
   * @memberof FindPanelComponent
   */
  public ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }
}
