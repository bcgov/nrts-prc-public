import { Component, OnInit, AfterViewInit, OnDestroy, Renderer2, ViewChild } from '@angular/core';
import { MatSnackBarRef, SimpleSnackBar, MatSnackBar } from '@angular/material';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { Router, UrlTree } from '@angular/router';

import { Observable, Subject, Subscription, concat } from 'rxjs';
import * as operators from 'rxjs/operators';
import * as _ from 'lodash';

import { AppMapComponent } from './app-map/app-map.component';
import { AppListComponent } from './app-list/app-list.component';
import { FindPanelComponent } from './find-panel/find-panel.component';
import { ExplorePanelComponent } from './explore-panel/explore-panel.component';
import { DetailsPanelComponent } from './details-panel/details-panel.component';
import { SplashModalComponent } from './splash-modal/splash-modal.component';
import { Application } from 'app/models/application';
import { ApplicationService, IFiltersType } from 'app/services/application.service';
import { UrlService } from 'app/services/url.service';
import { Panel } from './utils/panel.enum';

/**
 * Object emitted by child panel on update.
 *
 * @export
 * @interface IUpdateEvent
 */
export interface IUpdateEvent {
  // filters (See IFiltersType)
  filters?: IFiltersType;

  // True if the search was manually initiated (button click), false if it is emitting as part of component initiation.
  search?: boolean;

  // True if the map view should be reset
  resetMap?: boolean;

  // True if the panel should be collapsed
  hidePanel?: boolean;
}

const emptyFilters: IFiltersType = {
  // Find panel
  clidDtid: null,

  // Explore panel
  publishFrom: null,
  publishTo: null,
  cpStatuses: [],
  purposes: [],
  appStatuses: []
};

// Page size needs to be small enough to give reasonable app loading feedback on slow networks but large enough for
// optimized "added/deleted" app logic (see map component)
const PAGE_SIZE = 250;

/**
 * Main public site component.
 *
 * @export
 * @class ApplicationsComponent
 * @implements {OnInit}
 * @implements {AfterViewInit}
 * @implements {OnDestroy}
 */
@Component({
  selector: 'app-applications',
  templateUrl: './applications.component.html',
  styleUrls: ['./applications.component.scss']
})
export class ApplicationsComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('appmap') appmap: AppMapComponent;
  @ViewChild('applist') applist: AppListComponent;
  @ViewChild('findPanel') findPanel: FindPanelComponent;
  @ViewChild('explorePanel') explorePanel: ExplorePanelComponent;
  @ViewChild('detailsPanel') detailsPanel: DetailsPanelComponent;

  private ngUnsubscribe: Subject<boolean> = new Subject<boolean>();

  private splashModal: NgbModalRef = null;
  private snackbarRef: MatSnackBarRef<SimpleSnackBar> = null;

  // necessary to allow referencing the enum in the html
  public Panel = Panel;

  // indicates which side panel should be shown
  public activePanel: Panel;

  public isLoading = false;
  public loadInitialApps = true;

  public urlTree: UrlTree;

  public observablesSub: Subscription = null;
  public coordinates: string = null;

  public filters: IFiltersType = emptyFilters;
  public apps: Application[] = [];
  public totalNumber = 0;

  constructor(
    public snackbar: MatSnackBar,
    private modalService: NgbModal,
    private router: Router,
    private applicationService: ApplicationService,
    public urlService: UrlService,
    private renderer: Renderer2
  ) {
    // watch for URL param changes
    this.urlService.onNavEnd$.pipe(operators.takeUntil(this.ngUnsubscribe)).subscribe(event => {
      this.urlTree = router.parseUrl(event.url);

      if (this.urlTree) {
        switch (this.urlTree.fragment) {
          case 'splash':
            this.displaySplashModal();
            break;
          case Panel.find:
            this.closeSplashModal();
            this.activePanel = Panel.find;
            break;
          case Panel.Explore:
            this.closeSplashModal();
            this.activePanel = Panel.Explore;
            break;
          case Panel.details:
            this.closeSplashModal();
            this.activePanel = Panel.details;
            break;
          default:
            this.closeSplashModal();
            break;
        }
      }
    });
  }

  /**
   * On component inits.
   *
   * @memberof ApplicationsComponent
   */
  ngOnInit() {
    this.renderer.addClass(document.body, 'no-scroll');
  }

  /**
   * After components view inits.
   *
   * @memberof ApplicationsComponent
   */
  ngAfterViewInit() {
    if (this.loadInitialApps) {
      this.getApplications();
    }
  }

  /**
   * Shows the splash modal.
   *
   * @memberof ApplicationsComponent
   */
  public displaySplashModal(): void {
    this.splashModal = this.modalService.open(SplashModalComponent, {
      backdrop: 'static',
      windowClass: 'splash-modal'
    });

    this.splashModal.result.then(() => {
      this.splashModal.dismiss();
    });
  }

  /**
   * Closes the splash modal if its open.
   *
   * @memberof ApplicationsComponent
   */
  public closeSplashModal(): void {
    if (this.splashModal) {
      this.splashModal.close();
    }
  }

  /**
   * Removes any url fragment.
   *
   * @memberof ApplicationsComponent
   */
  public closeSidePanel() {
    if (this.activePanel) {
      this.activePanel = null;
      this.urlService.setFragment(null);
    }
  }

  /**
   * Show snackbar
   *
   * Note: use debounce to delay snackbar opening so we can cancel it preemptively if loading takes less than 500ms
   *
   * @memberof ApplicationsComponent
   */
  public showSnackbar = _.debounce(() => {
    this.snackbarRef = this.snackbar.open('Loading applications ...');
  }, 500);

  /**
   * Hides the snackbar.
   *
   * @memberof ApplicationsComponent
   */
  public hideSnackbar() {
    // cancel any pending open
    this.showSnackbar.cancel();

    // if snackbar is showing, dismiss it
    // NB: use debounce to delay snackbar dismissal so it is visible for at least 500ms
    _.debounce(() => {
      if (this.snackbarRef) {
        this.snackbarRef.dismiss();
        this.snackbarRef = null;
      }
    }, 500)();
  }

  /**
   * Fetches applications.
   *
   * @param {boolean} [getTotalNumber=true]
   * @memberof ApplicationsComponent
   */
  public getApplications(getTotalNumber: boolean = true) {
    // do this in another event so it's not in current change detection cycle
    setTimeout(() => {
      // pre-empt existing observables execution
      if (this.observablesSub && !this.observablesSub.closed) {
        this.observablesSub.unsubscribe();
      }

      this.showSnackbar();
      this.isLoading = true;
      let isFirstPage = true;

      if (getTotalNumber) {
        // get total number using filters (but not coordinates)
        this.applicationService
          .getCount(this.filters, null)
          .pipe(operators.takeUntil(this.ngUnsubscribe))
          .subscribe(count => {
            this.totalNumber = count;
          });
      }

      // get latest coordinates
      this.coordinates = this.appmap.getCoordinates();

      this.applicationService
        .getCount(this.filters, this.coordinates)
        .pipe(operators.takeUntil(this.ngUnsubscribe))
        .subscribe(
          count => {
            // prepare 'pages' of gets
            const observables: Array<Observable<Application[]>> = [];
            for (let page = 0; page < Math.ceil(count / PAGE_SIZE); page++) {
              observables.push(this.applicationService.getAll(page, PAGE_SIZE, this.filters, this.coordinates));
            }

            // check if there's nothing to query
            if (observables.length === 0) {
              this.apps = [];
            }

            // get all observables sequentially
            // const start = new Date().getTime(); // for profiling
            this.observablesSub = concat(...observables)
              .pipe(
                operators.takeUntil(this.ngUnsubscribe),
                operators.finalize(() => {
                  this.isLoading = false;
                  this.hideSnackbar();
                  // console.log('got', this.apps.length, 'apps in', new Date().getTime() - start, 'ms');
                })
              )
              .subscribe(
                applications => {
                  if (isFirstPage) {
                    isFirstPage = false;
                    // replace array with applications so that first 'PAGE_SIZE' apps aren't necessarily redrawn on map
                    // NB: OnChanges event will update the components that use this array
                    this.apps = applications;
                  } else {
                    // NB: OnChanges event will update the components that use this array
                    // NB: remove duplicates (eg, due to bad data such as multiple comment periods)
                    this.apps = _.uniqBy(_.concat(this.apps, applications), app => app._id);
                  }
                },
                error => {
                  console.log(error);
                  alert("Uh-oh, couldn't load applications");
                  // applications not found --> navigate back to home
                  this.router.navigate(['/']);
                }
              );
          },
          error => {
            console.log(error);
            alert("Uh-oh, couldn't count applications");
            // applications not found --> navigate back to home
            this.router.navigate(['/']);
            this.isLoading = false;
            this.hideSnackbar();
          }
        );
    });
  }

  /**
   * Event handler called when Find panel emits an update.
   *
   * @param {IUpdateEvent} updateEvent
   * @memberof ApplicationsComponent
   */
  public handleFindUpdate(updateEvent: IUpdateEvent) {
    this.loadInitialApps = false; // skip initial app load

    this.filters = { ...emptyFilters, ...updateEvent.filters };

    if (updateEvent.search) {
      // clear the other panels filters/data
      this.explorePanel.clearAllFilters();
      this.explorePanel.saveQueryParameters();

      this.detailsPanel.clearAllFilters();
      this.appmap.unhighlightApplications();
    }

    this.getApplications();

    if (updateEvent.resetMap) {
      this.appmap.resetView(false);
    }

    if (updateEvent.hidePanel) {
      this.closeSidePanel();
    }
  }

  /**
   * Event handler called when Explore panel emits an update.
   *
   * @param {IUpdateEvent} updateEvent
   * @memberof ApplicationsComponent
   */
  public handleExploreUpdate(updateEvent: IUpdateEvent) {
    this.loadInitialApps = false; // skip initial app load

    this.filters = { ...emptyFilters, ...updateEvent.filters };

    if (updateEvent.search) {
      // clear the other panels filters/data
      this.findPanel.clearAllFilters();
      this.findPanel.saveQueryParameters();

      this.detailsPanel.clearAllFilters();
      this.appmap.unhighlightApplications();
    }

    this.getApplications();

    if (updateEvent.resetMap) {
      this.appmap.resetView(false);
    }

    if (updateEvent.hidePanel) {
      this.closeSidePanel();
    }
  }

  /**
   * Event handler called when Details component updates/clears its current app.
   *
   * @param {Application} app
   * @param {boolean} show true if the details panel should be shown, false otherwise.
   * @memberof ApplicationsComponent
   */
  public handleDetailsUpdate(app: Application) {
    this.appmap.highlightApplication(app);
  }

  /**
   * Event handler called when map component view has changed.
   *
   * @memberof ApplicationsComponent
   */
  public updateCoordinates(): void {
    this.getApplications(false); // total number is not affected
  }

  /**
   * Toggles active panel and its corresponding url fragment.
   *
   * @param {Panel} panel panel/fragment to toggle
   * @memberof ApplicationsComponent
   */
  public togglePanel(panel: Panel) {
    if (this.urlTree.fragment === panel) {
      this.activePanel = null;
      this.urlService.setFragment(null);
    } else {
      this.activePanel = panel;
      this.urlService.setFragment(panel);
    }
  }

  /**
   * Clears all child component filters and re-fetches applications.
   *
   * @memberof ApplicationsComponent
   */
  public clearFilters() {
    this.findPanel.clearAllFilters();
    this.findPanel.saveQueryParameters();

    this.explorePanel.clearAllFilters();
    this.explorePanel.saveQueryParameters();

    this.filters = emptyFilters;

    this.getApplications();
  }

  /**
   * Returns true if at least 1 filter is selected/populated, false otherwise.
   *
   * @returns {boolean}
   * @memberof ApplicationsComponent
   */
  public areFiltersSet(): boolean {
    return (
      !_.isEmpty(this.filters.cpStatuses) ||
      !_.isEmpty(this.filters.appStatuses) ||
      !_.isEmpty(this.filters.purposes) ||
      !!this.filters.clidDtid ||
      !!this.filters.publishFrom ||
      !!this.filters.publishTo
    );
  }

  /**
   * On component destroy.
   *
   * @memberof ApplicationsComponent
   */
  ngOnDestroy() {
    if (this.splashModal) {
      this.splashModal.dismiss();
    }

    if (this.snackbarRef) {
      this.hideSnackbar();
    }

    this.renderer.removeClass(document.body, 'no-scroll');
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }
}
