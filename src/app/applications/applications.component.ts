import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs/Subject';
import 'rxjs/add/operator/takeUntil';
// import 'rxjs/add/operator/mergeMap';
import * as _ from 'lodash';

import { Application } from 'app/models/application';
import { ApplicationService } from 'app/services/application.service';

const NUM_APPS = 1414; // TODO: get from db
const PAGE_SIZE = 500;

@Component({
  selector: 'app-applications',
  templateUrl: './applications.component.html',
  styleUrls: ['./applications.component.scss']
})

export class ApplicationsComponent implements OnInit, OnDestroy {
  public allApps: Array<Application> = [];
  private ngUnsubscribe: Subject<boolean> = new Subject<boolean>();

  // TODO: get actual filters from filter component
  private regionFilters: object = { /*VI: true*/ }; // array-like object
  private cpStatusFilters: object = {}; // array-like object
  private appStatusFilters: object = {}; // array-like object
  private applicantFilter: string = null;
  private clFileFilter: string = null;
  private dispIdFilter: string = null;
  private purposeFilter: string = null;

  constructor(
    private applicationService: ApplicationService
  ) { }

  ngOnInit() {
    // get all apps, one page at a time
    // (all 1414 at once => ~4.5 seconds)
    // (3 pages of 500 => ~3.5 seconds -- and it looks better!)
    this.getPageOfApps(0, PAGE_SIZE);

    // this way works but isn't faster and doesn't scale
    // const self = this;
    // this.applicationService.getAll(0, PAGE_SIZE)
    //   .mergeMap(applications => {
    //     self.allApps = _.concat(self.allApps, applications);
    //     return self.applicationService.getAll(1, PAGE_SIZE);
    //   })
    //   .mergeMap(applications => {
    //     self.allApps = _.concat(self.allApps, applications);
    //     return self.applicationService.getAll(2, PAGE_SIZE);
    //   })
    //   .subscribe(applications => {
    //     self.allApps = _.concat(self.allApps, applications);
    //   });
  }

  // NB: recursive function
  private getPageOfApps(pageNum: number, pageSize: number) {
    this.applicationService.getAll(pageNum, pageSize, this.regionFilters, this.cpStatusFilters, this.appStatusFilters,
      this.applicantFilter, this.clFileFilter, this.dispIdFilter, this.purposeFilter)
      .takeUntil(this.ngUnsubscribe)
      .subscribe(applications => {
        this.allApps = _.concat(this.allApps, applications);
        if (++pageNum < Math.ceil(NUM_APPS / PAGE_SIZE)) {
          this.getPageOfApps(pageNum, PAGE_SIZE);
        }
      }, error => {
        console.log(error);
      });
  }

  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }
}
