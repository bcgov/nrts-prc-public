import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/mergeMap';
import 'rxjs/add/operator/toPromise';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/catch';
import 'rxjs/add/observable/of';
import * as _ from 'lodash';

import { Application } from 'app/models/application';
import { ApiService } from './api';
import { DocumentService } from './document.service';
import { CommentPeriodService } from './commentperiod.service';
import { DecisionService } from './decision.service';
import { SearchService } from './search.service';

@Injectable()
export class ApplicationService {
  // statuses / query param options
  readonly ABANDONED = 'AB';
  readonly ACCEPTED = 'AC';
  readonly ALLOWED = 'AL';
  readonly CANCELLED = 'CA';
  readonly DISALLOWED = 'DI';
  readonly DISPOSITION_GOOD_STANDING = 'DG';
  readonly OFFER_ACCEPTED = 'OA';
  readonly OFFER_NOT_ACCEPTED = 'ON';
  readonly OFFERED = 'OF';
  readonly SUSPENDED = 'SU';
  // special combination status (see isDecision below)
  readonly DECISION_MADE = 'DE';
  // special status when no data
  readonly UNKNOWN = 'UN';

  readonly CARIBOO = 'CA';
  readonly KOOTENAY = 'KO';
  readonly LOWER_MAINLAND = 'LM';
  readonly OMENICA = 'OM';
  readonly PEACE = 'PE';
  readonly SKEENA = 'SK';
  readonly SOUTHERN_INTERIOR = 'SI';
  readonly VANCOUVER_ISLAND = 'VI';

  public applicationStatuses: Array<string> = [];
  private regions: Array<string> = [];
  private application: Application = null;

  constructor(
    private api: ApiService,
    private documentService: DocumentService,
    private commentPeriodService: CommentPeriodService,
    private decisionService: DecisionService,
    private searchService: SearchService
  ) {
    // display strings
    this.applicationStatuses[this.ABANDONED] = 'Application Abandoned';
    this.applicationStatuses[this.ACCEPTED] = 'Application Under Review';
    this.applicationStatuses[this.ALLOWED] = 'Decision: Allowed';
    this.applicationStatuses[this.CANCELLED] = 'Application Cancelled';
    this.applicationStatuses[this.DISALLOWED] = 'Decision: Not Approved';
    this.applicationStatuses[this.DISPOSITION_GOOD_STANDING] = 'Tenure: Disposition in Good Standing';
    this.applicationStatuses[this.OFFER_ACCEPTED] = 'Decision: Offer Accepted';
    this.applicationStatuses[this.OFFER_NOT_ACCEPTED] = 'Decision: Offer Not Accepted';
    this.applicationStatuses[this.OFFERED] = 'Decision: Offered';
    this.applicationStatuses[this.SUSPENDED] = 'Tenure: Suspended';
    this.applicationStatuses[this.DECISION_MADE] = 'Decision Made';
    this.applicationStatuses[this.UNKNOWN] = 'Unknown Application Status';

    this.regions[this.CARIBOO] = 'Cariboo, Williams Lake';
    this.regions[this.KOOTENAY] = 'Kootenay, Cranbrook';
    this.regions[this.LOWER_MAINLAND] = 'Lower Mainland, Surrey';
    this.regions[this.OMENICA] = 'Omenica/Peace, Prince George';
    this.regions[this.PEACE] = 'Peace, Ft. St. John';
    this.regions[this.SKEENA] = 'Skeena, Smithers';
    this.regions[this.SOUTHERN_INTERIOR] = 'Thompson Okanagan, Kamloops';
    this.regions[this.VANCOUVER_ISLAND] = 'West Coast, Nanaimo';
  }

  // get count of applications
  getCount(): Observable<number> {
    return this.getAllInternal()
      .map(applications => {
        return applications.length;
      })
      .catch(this.api.handleError);
  }

  // get all applications
  // TODO: instead of using promises to get all data at once, use observables and DEEP-OBSERVE changes
  // see https://github.com/angular/angular/issues/11704
  getAll(): Observable<Application[]> {
    // first get the applications
    return this.getAllInternal()
      .mergeMap(applications => {
        if (applications.length === 0) {
          return Observable.of([] as Application[]);
        }

        // replace \\n (JSON format) with newlines in each application
        applications.forEach((application, i) => {
          if (applications[i].description) {
            applications[i].description = applications[i].description.replace(/\\n/g, '\n');
          }
          if (applications[i].legalDescription) {
            applications[i].legalDescription = applications[i].legalDescription.replace(/\\n/g, '\n');
          }
        });

        const promises: Array<Promise<any>> = [];

        // FUTURE: now get the organization for each application

        // now get the current comment period for each application
        applications.forEach((application, i) => {
          promises.push(this.commentPeriodService.getAllByApplicationId(applications[i]._id)
            .toPromise()
            .then(periods => {
              const cp = this.commentPeriodService.getCurrent(periods);
              applications[i].currentPeriod = cp;
              // derive comment period status for app list display
              applications[i]['cpStatus'] = this.commentPeriodService.getStatus(cp);
            })
          );
        });

        // now get the referenced data (features)
        applications.forEach((application, i) => {
          promises.push(this.searchService.getByDTID(application.tantalisID)
            .toPromise()
            .then(features => {
              application.features = features;

              // calculate Total Area (hectares) from all features
              application.areaHectares = 0;
              _.each(application.features, function (f) {
                if (f['properties']) {
                  application.areaHectares += f['properties'].TENURE_AREA_IN_HECTARES;
                }
              });

              // cache application properties from first feature
              if (application.features && application.features.length > 0) {
                application.purpose = application.features[0].properties.TENURE_PURPOSE;
                application.subpurpose = application.features[0].properties.TENURE_SUBPURPOSE;
                application.type = application.features[0].properties.TENURE_TYPE;
                application.subtype = application.features[0].properties.TENURE_SUBTYPE;
                application.status = application.features[0].properties.TENURE_STATUS;
                application.tenureStage = application.features[0].properties.TENURE_STAGE;
                application.location = application.features[0].properties.TENURE_LOCATION;
                application.businessUnit = application.features[0].properties.RESPONSIBLE_BUSINESS_UNIT;
              }

              // derive application status for app list display
              application['appStatus'] = this.getStatus(application);
            })
          );
        });

        return Promise.all(promises).then(() => { return applications; });
      })
      .catch(this.api.handleError);
  }

  // get just the applications
  private getAllInternal(): Observable<Application[]> {
    return this.api.getApplications()
      .map(res => {
        const applications = res.text() ? res.json() : [];
        applications.forEach((application, i) => {
          applications[i] = new Application(application);
        });
        return applications;
      })
      .catch(this.api.handleError);
  }

  // get a specific application by its id
  getById(appId: string, forceReload: boolean = false): Observable<Application> {
    if (this.application && this.application._id === appId && !forceReload) {
      return Observable.of(this.application);
    }

    // first get the application data
    return this.api.getApplication(appId)
      .map(res => {
        const applications = res.text() ? res.json() : [];
        // return the first (only) application
        return applications.length > 0 ? new Application(applications[0]) : null;
      })
      .mergeMap(application => {
        if (!application) { return Observable.of(null as Application); }

        // replace \\n (JSON format) with newlines
        if (application.description) {
          application.description = application.description.replace(/\\n/g, '\n');
        }
        if (application.legalDescription) {
          application.legalDescription = application.legalDescription.replace(/\\n/g, '\n');
        }

        const promises: Array<Promise<any>> = [];

        // FUTURE: now get the organization

        // now get the documents
        promises.push(this.documentService.getAllByApplicationId(application._id)
          .toPromise()
          .then(documents => application.documents = documents)
        );

        // now get the current comment period
        promises.push(this.commentPeriodService.getAllByApplicationId(application._id)
          .toPromise()
          .then(periods => application.currentPeriod = this.commentPeriodService.getCurrent(periods))
        );

        // now get the decision
        promises.push(this.decisionService.getByApplicationId(application._id, forceReload)
          .toPromise()
          .then(decision => application.decision = decision)
        );

        // now get the shapes
        promises.push(this.searchService.getByDTID(application.tantalisID, forceReload)
          .toPromise()
          .then(features => {
            application.features = features;

            // calculate Total Area (hectares) from all features
            application.areaHectares = 0;
            _.each(application.features, function (f) {
              if (f['properties']) {
                application.areaHectares += f['properties'].TENURE_AREA_IN_HECTARES;
              }
            });

            // cache application properties from first feature
            if (application.features && application.features.length > 0) {
              application.purpose = application.features[0].properties.TENURE_PURPOSE;
              application.subpurpose = application.features[0].properties.TENURE_SUBPURPOSE;
              application.type = application.features[0].properties.TENURE_TYPE;
              application.subtype = application.features[0].properties.TENURE_SUBTYPE;
              application.status = application.features[0].properties.TENURE_STATUS;
              application.tenureStage = application.features[0].properties.TENURE_STAGE;
              application.location = application.features[0].properties.TENURE_LOCATION;
              application.businessUnit = application.features[0].properties.RESPONSIBLE_BUSINESS_UNIT;
            }
          })
        );

        return Promise.all(promises).then(() => {
          this.application = application;
          return this.application;
        });
      })
      .catch(this.api.handleError);
  }

  // returns application status based on status code
  getStatus(application: Application): string {
    if (!application || !application.status) {
      return this.applicationStatuses[this.UNKNOWN]; // no data
    }

    switch (application.status.toUpperCase()) {
      case 'ABANDONED': return this.applicationStatuses[this.ABANDONED];
      case 'ACCEPTED': return this.applicationStatuses[this.ACCEPTED];
      case 'ALLOWED': return this.applicationStatuses[this.ALLOWED];
      case 'CANCELLED': return this.applicationStatuses[this.CANCELLED];
      case 'DISALLOWED': return this.applicationStatuses[this.DISALLOWED];
      case 'DISPOSITION IN GOOD STANDING': return this.applicationStatuses[this.DISPOSITION_GOOD_STANDING];
      case 'OFFER ACCEPTED': return this.applicationStatuses[this.OFFER_ACCEPTED];
      case 'OFFER NOT ACCEPTED': return this.applicationStatuses[this.OFFER_NOT_ACCEPTED];
      case 'OFFERED': return this.applicationStatuses[this.OFFERED];
      case 'SUSPENDED': return this.applicationStatuses[this.SUSPENDED];
    }

    // else return current status in title case
    return _.startCase(_.camelCase(application.status));
  }

  isAccepted(status: string): boolean {
    return (status && status.toUpperCase() === 'ACCEPTED');
  }

  // NOTE: a decision may or may not include Cancelled
  // see code that uses this helper
  isDecision(status: string): boolean {
    const s = (status && status.toUpperCase());
    return (s === 'ALLOWED'
      || s === 'CANCELLED'
      || s === 'DISALLOWED'
      || s === 'OFFER ACCEPTED'
      || s === 'OFFER NOT ACCEPTED'
      || s === 'OFFERED');
  }

  isCancelled(status: string): boolean {
    return (status && status.toUpperCase() === 'CANCELLED');
  }

  isAbandoned(status: string): boolean {
    return (status && status.toUpperCase() === 'ABANDONED');
  }

  isDispGoodStanding(status: string): boolean {
    return (status && status.toUpperCase() === 'DISPOSITION IN GOOD STANDING');
  }

  isSuspended(status: string): boolean {
    return (status && status.toUpperCase() === 'SUSPENDED');
  }

  getRegion(regionCode: string): string {
    switch (regionCode) {
      case this.CARIBOO: return this.regions[this.CARIBOO];
      case this.KOOTENAY: return this.regions[this.KOOTENAY];
      case this.LOWER_MAINLAND: return this.regions[this.LOWER_MAINLAND];
      case this.OMENICA: return this.regions[this.OMENICA];
      case this.PEACE: return this.regions[this.PEACE];
      case this.SKEENA: return this.regions[this.SKEENA];
      case this.SOUTHERN_INTERIOR: return this.regions[this.SOUTHERN_INTERIOR];
      case this.VANCOUVER_ISLAND: return this.regions[this.VANCOUVER_ISLAND];
    }

    return null;
  }
}
