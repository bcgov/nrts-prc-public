import { Injectable } from '@angular/core';
import { Observable, of, combineLatest, merge } from 'rxjs';
import { map, mergeMap, catchError } from 'rxjs/operators';
import * as _ from 'lodash';
import * as moment from 'moment';

import { IFiltersType } from 'app/applications/applications.component';
import { Application } from 'app/models/application';
import { ApiService } from './api';
import { DocumentService } from './document.service';
import { CommentPeriodService } from './commentperiod.service';
import { DecisionService } from './decision.service';
import { FeatureService } from './feature.service';

import { StatusCodes, ReasonCodes } from 'app/utils/constants/application';
import { ConstantUtils, CodeType } from 'app/utils/constants/constantUtils';
import { CommentCodes } from 'app/utils/constants/comment';

@Injectable()
export class ApplicationService {
  private application: Application = null; // for caching

  constructor(
    private api: ApiService,
    private documentService: DocumentService,
    private commentPeriodService: CommentPeriodService,
    private decisionService: DecisionService,
    private featureService: FeatureService
  ) {}

  // get count of matching applications
  getCount(filters: IFiltersType, coordinates: string): Observable<number> {
    // assign publish date filters
    const publishSince = filters.publishFrom ? filters.publishFrom.toISOString() : null;
    const publishUntil = filters.publishTo ? filters.publishTo.toISOString() : null;

    // convert application statuses from codes to array of strings
    const appStatuses = _.flatMap(filters.appStatuses, statusCode =>
      ConstantUtils.getMappedCodes(CodeType.STATUS, statusCode)
    );

    // handle comment period filtering
    const cpOpen = filters.cpStatuses.includes(CommentCodes.OPEN.code);
    const cpNotOpen = filters.cpStatuses.includes(CommentCodes.NOT_OPEN.code);

    // if both cpOpen and cpNotOpen or neither cpOpen nor cpNotOpen then use no cpStart or cpEnd filters
    if ((cpOpen && cpNotOpen) || (!cpOpen && !cpNotOpen)) {
      return this.api
        .getCountApplications({
          appStatuses: appStatuses,
          applicant: filters.applicant,
          clidDtid: filters.clidDtid,
          purposes: filters.purposes,
          subpurposes: filters.subpurposes,
          publishSince: publishSince,
          publishUntil: publishUntil,
          coordinates: coordinates
        })
        .pipe(catchError(this.api.handleError));
    }

    const now = moment();
    // watch out -- Moment mutates objects!
    const yesterday = now.clone().subtract(1, 'days');
    const tomorrow = now.clone().add(1, 'days');

    // if cpOpen then filter by cpStart <= today && cpEnd >= today
    if (cpOpen) {
      return this.api
        .getCountApplications({
          cpStartUntil: now.endOf('day').toISOString(),
          cpEndSince: now.startOf('day').toISOString(),
          appStatuses: appStatuses,
          applicant: filters.applicant,
          clidDtid: filters.clidDtid,
          purposes: filters.purposes,
          subpurposes: filters.subpurposes,
          publishSince: publishSince,
          publishUntil: publishUntil,
          coordinates: coordinates
        })
        .pipe(catchError(this.api.handleError));
    }

    // else cpNotOpen (ie, closed or future) then filter by cpEnd <= yesterday || cpStart >= tomorrow
    // NB: this doesn't return apps without comment periods
    const closed = this.api.getCountApplications({
      cpEndUntil: yesterday.endOf('day').toISOString(),
      appStatuses: appStatuses,
      applicant: filters.applicant,
      clidDtid: filters.clidDtid,
      purposes: filters.purposes,
      subpurposes: filters.subpurposes,
      publishSince: publishSince,
      publishUntil: publishUntil,
      coordinates: coordinates
    });
    const future = this.api.getCountApplications({
      cpStartSince: tomorrow.startOf('day').toISOString(),
      appStatuses: appStatuses,
      applicant: filters.applicant,
      clidDtid: filters.clidDtid,
      purposes: filters.purposes,
      subpurposes: filters.subpurposes,
      publishSince: publishSince,
      publishUntil: publishUntil,
      coordinates: coordinates
    });

    return combineLatest(closed, future, (v1: number, v2: number) => v1 + v2).pipe(catchError(this.api.handleError));
  }

  // get matching applications without their meta (documents, comment period, decisions, etc)
  getAll(
    pageNum: number = 0,
    pageSize: number = 1000,
    filters: IFiltersType,
    coordinates: string
  ): Observable<Application[]> {
    // assign publish date filters
    const publishSince = filters.publishFrom ? filters.publishFrom.toISOString() : null;
    const publishUntil = filters.publishTo ? filters.publishTo.toISOString() : null;

    // convert application statuses from codes to array of strings
    const appStatuses = _.flatMap(filters.appStatuses, statusCode =>
      ConstantUtils.getMappedCodes(CodeType.STATUS, statusCode)
    );

    // handle comment period filtering
    const cpOpen = filters.cpStatuses.includes(CommentCodes.OPEN.code);
    const cpNotOpen = filters.cpStatuses.includes(CommentCodes.NOT_OPEN.code);

    // if both cpOpen and cpNotOpen or neither cpOpen nor cpNotOpen then use no cpStart or cpEnd filters
    if ((cpOpen && cpNotOpen) || (!cpOpen && !cpNotOpen)) {
      return this.api
        .getApplications({
          pageNum: pageNum,
          pageSize: pageSize,
          appStatuses: appStatuses,
          applicant: filters.applicant,
          clidDtid: filters.clidDtid,
          purposes: filters.purposes,
          subpurposes: filters.subpurposes,
          publishSince: publishSince,
          publishUntil: publishUntil,
          coordinates: coordinates
        })
        .pipe(
          map((res: Application[]) => {
            if (!res || res.length === 0) {
              return [] as Application[];
            }

            const applications: Application[] = [];
            res.forEach(application => {
              applications.push(new Application(application));
            });
            console.log('1: ', applications);
            return applications;
          }),
          catchError(this.api.handleError)
        );
    }

    const now = moment();
    // watch out -- Moment mutates objects!
    const yesterday = now.clone().subtract(1, 'days');
    const tomorrow = now.clone().add(1, 'days');

    // if cpOpen then filter by cpStart <= today && cpEnd >= today
    if (cpOpen) {
      return this.api
        .getApplications({
          pageNum: pageNum,
          pageSize: pageSize,
          cpStartUntil: now.endOf('day').toISOString(),
          cpEndSince: now.startOf('day').toISOString(),
          appStatuses: appStatuses,
          applicant: filters.applicant,
          clidDtid: filters.clidDtid,
          purposes: filters.purposes,
          subpurposes: filters.subpurposes,
          publishSince: publishSince,
          publishUntil: publishUntil,
          coordinates: coordinates
        })
        .pipe(
          map((res: Application[]) => {
            if (!res || res.length === 0) {
              return [] as Application[];
            }

            const applications: Application[] = [];
            res.forEach(application => {
              applications.push(new Application(application));
            });
            console.log('2: ', applications);
            return applications;
          }),
          catchError(this.api.handleError)
        );
    }

    // else cpNotOpen (ie, closed or future) then filter by cpEnd <= yesterday || cpStart >= tomorrow
    // NB: this doesn't return apps without comment periods
    const closed = this.api.getApplications({
      pageNum: pageNum,
      pageSize: pageSize,
      cpEndUntil: yesterday.endOf('day').toISOString(),
      appStatuses: appStatuses,
      applicant: filters.applicant,
      clidDtid: filters.clidDtid,
      purposes: filters.purposes,
      subpurposes: filters.subpurposes,
      publishSince: publishSince,
      publishUntil: publishUntil,
      coordinates: coordinates
    });
    const future = this.api.getApplications({
      pageNum: pageNum,
      pageSize: pageSize,
      cpStartSince: tomorrow.startOf('day').toISOString(),
      appStatuses: appStatuses,
      applicant: filters.applicant,
      clidDtid: filters.clidDtid,
      purposes: filters.purposes,
      subpurposes: filters.subpurposes,
      publishSince: publishSince,
      publishUntil: publishUntil,
      coordinates: coordinates
    });

    return merge(closed, future).pipe(
      map((res: Application[]) => {
        if (!res || res.length === 0) {
          return [] as Application[];
        }

        const applications: Application[] = [];
        res.forEach(application => {
          applications.push(new Application(application));
        });
        console.log('3: ', applications);
        return applications;
      }),
      catchError(this.api.handleError)
    );
  }

  // get a specific application by its id
  getById(appId: string, forceReload: boolean = false): Observable<Application> {
    if (this.application && this.application._id === appId && !forceReload) {
      return of(this.application);
    }

    // first get the application
    return this.api.getApplication(appId).pipe(
      map((res: Application[]) => {
        if (!res || res.length === 0) {
          return null as Application;
        }

        // return the first (only) application
        return new Application(res[0]);
      }),
      mergeMap((application: Application) => {
        if (!application) {
          return of(null as Application);
        }

        const promises: Array<Promise<any>> = [];

        // derive retire date
        if (
          application.statusHistoryEffectiveDate &&
          [
            StatusCodes.DECISION_APPROVED.code,
            StatusCodes.DECISION_NOT_APPROVED.code,
            StatusCodes.ABANDONED.code
          ].includes(ConstantUtils.getParam(CodeType.STATUS, application.status))
        ) {
          application['retireDate'] = moment(application.statusHistoryEffectiveDate)
            .endOf('day')
            .add(6, 'months');
        }

        // 7-digit CL File number for display
        if (application.cl_file) {
          application['clFile'] = application.cl_file.toString().padStart(7, '0');
        }

        // derive unique applicants
        if (application.client) {
          const clients = application.client.split(', ');
          application['applicants'] = _.uniq(clients).join(', ');
        }

        // get the documents (may be empty array)
        promises.push(
          this.documentService
            .getAllByApplicationId(application._id)
            .toPromise()
            .then(documents => (application.documents = documents))
        );

        // get the comment periods (may be empty array)
        promises.push(
          this.commentPeriodService
            .getAllByApplicationId(application._id)
            .toPromise()
            .then(periods => {
              application.currentPeriod = this.commentPeriodService.getCurrent(periods); // may be null

              // comment period status code
              application.cpStatus = this.commentPeriodService.getCode(application.currentPeriod);

              // derive days remaining for display
              // use moment to handle Daylight Saving Time changes
              if (this.commentPeriodService.isOpen(application.cpStatus)) {
                const now = new Date();
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                application.currentPeriod['daysRemaining'] =
                  moment(application.currentPeriod.endDate).diff(moment(today), 'days') + 1; // including today
              }
            })
        );

        // get the decision (may be null)
        promises.push(
          this.decisionService
            .getByApplicationId(application._id, forceReload)
            .toPromise()
            .then(decision => (application.decision = decision))
        );

        // get the features (may be empty array)
        promises.push(
          this.featureService
            .getByApplicationId(application._id)
            .toPromise()
            .then(features => (application.features = features))
        );

        return Promise.all(promises).then(() => {
          this.application = application;
          return this.application;
        });
      }),
      catchError(this.api.handleError)
    );
  }

  /**
   * Returns true if the application has an abandoned status AND an amendment reason.
   *
   * @param {Application} application
   * @returns {boolean} true if the application has an abandoned status AND an amendment reason, false otherwise.
   * @memberof ApplicationService
   */
  isAmendment(application: Application): boolean {
    return (
      application &&
      application.status === StatusCodes.ABANDONED.code &&
      application.reason === ReasonCodes.AMENDMENT.code
    );
  }

  /**
   * Returns true if the application has an abandoned status and does not have an amendment reason.
   *
   * @param {Application} application
   * @returns {boolean} true if the application has an abandoned status and does not have an amendment
   * reason, false otherwise.
   * @memberof ApplicationService
   */
  isAbandoned(application: Application): boolean {
    return (
      application &&
      application.status === StatusCodes.ABANDONED.code &&
      (!application.reason || application.reason !== ReasonCodes.AMENDMENT.code)
    );
  }

  /**
   *
   *
   * @param {Application} application
   * @returns {boolean} true if the application has an under review status, false otherwise.
   * @memberof ApplicationService
   */
  isApplicationUnderReview(application: Application): boolean {
    return application && application.status === StatusCodes.APPLICATION_UNDER_REVIEW.code;
  }

  /**
   *
   *
   * @param {Application} application
   * @returns {boolean} true if the application has a review complete status, false otherwise.
   * @memberof ApplicationService
   */
  isApplicationReviewComplete(application: Application): boolean {
    return application && application.status === StatusCodes.APPLICATION_REVIEW_COMPLETE.code;
  }

  /**
   *
   *
   * @param {Application} application
   * @returns {boolean} true if the application has a decision approved status, false otherwise.
   * @memberof ApplicationService
   */
  isDecisionApproved(application: Application): boolean {
    return application && application.status === StatusCodes.DECISION_APPROVED.code;
  }

  /**
   *
   *
   * @param {Application} application
   * @returns {boolean} true if the application has a decision not approved status, false otherwise.
   * @memberof ApplicationService
   */
  isDecisionNotApproved(application: Application): boolean {
    return application && application.status === StatusCodes.DECISION_NOT_APPROVED.code;
  }

  /**
   *
   *
   * @param {Application} application
   * @returns {boolean} true if the application has an unknown status, false otherwise.
   * @memberof ApplicationService
   */
  isUnknown(application: Application): boolean {
    return application && application.status === StatusCodes.UNKNOWN.code;
  }

  /**
   * Given a status code, returns a short user-friendly status string.
   *
   * @param {string} statusCode
   * @returns {string}
   * @memberof ApplicationService
   */
  getStatusStringShort(statusCode: string): string {
    return ConstantUtils.getStringShort(CodeType.STATUS, statusCode);
  }

  /**
   * Returns the application long status string.
   *
   * @param {Application} application
   * @returns {string}
   * @memberof ApplicationService
   */
  getStatusStringLong(application: Application): string {
    if (application && application.reason === ReasonCodes.AMENDMENT.code) {
      return ConstantUtils.getTextLong(CodeType.REASON, application.reason);
    }

    return (
      (application && ConstantUtils.getTextLong(CodeType.STATUS, application.status)) || StatusCodes.UNKNOWN.text.long
    );
  }
}
