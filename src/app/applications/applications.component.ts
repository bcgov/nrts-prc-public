import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs/Subject';
import 'rxjs/add/operator/takeUntil';

import { Application } from 'app/models/application';
import { ApplicationService } from 'app/services/application.service';

@Component({
  selector: 'app-applications',
  templateUrl: './applications.component.html',
  styleUrls: ['./applications.component.scss']
})

export class ApplicationsComponent implements OnInit, OnDestroy {
  public loading = true; // for spinner
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
    private router: Router,
    private applicationService: ApplicationService
  ) { }

  ngOnInit() {
    // get all apps
    const start = (new Date()).getTime();
    this.applicationService.getAll(this.regionFilters, this.cpStatusFilters, this.appStatusFilters, this.applicantFilter, this.clFileFilter, this.dispIdFilter, this.purposeFilter)
      .takeUntil(this.ngUnsubscribe)
      .subscribe(applications => {
        this.allApps = applications;
      }, error => {
        console.log(error);
        alert('Uh-oh, couldn\'t load applications');
        // applications not found --> navigate back to home
        this.router.navigate(['/']);
      }, () => {
        console.log('getAll() took', (new Date()).getTime() - start, 'ms');
        this.loading = false;
      });
  }

  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }
}
