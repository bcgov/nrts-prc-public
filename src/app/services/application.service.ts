import { Injectable } from '@angular/core';
import { Observable, of, combineLatest } from 'rxjs';
import { map, mergeMap, catchError } from 'rxjs/operators';
import * as _ from 'lodash';
import * as moment from 'moment';

import { Application } from 'app/models/application';
import { ApiService, IQueryParamSet, QueryParamModifier } from './api';
import { DocumentService } from './document.service';
import { CommentPeriodService } from './commentperiod.service';
import { DecisionService } from './decision.service';
import { FeatureService } from './feature.service';

import { StatusCodes, ReasonCodes } from 'app/utils/constants/application';
import { ConstantUtils, CodeType } from 'app/utils/constants/constantUtils';
import { CommentCodes } from 'app/utils/constants/comment';

/**
 * All supported filters.
 *
 * @export
 * @interface IFiltersType
 */
export interface IFiltersType {
  // Find panel
  clidDtid?: string;

  // Explore panel
  publishFrom?: Date;
  publishTo?: Date;
  cpStatuses?: string[];
  purposes?: string[];
  appStatuses?: string[];
}

/**
 * Provides supporting methods for working with applications.
 *
 * @export
 * @class ApplicationService
 */
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

  /**
   * Given filters and coordinates, build an array of query parameter sets.
   *
   * Each query parameter set in the array will return a distinct set of results.
   *
   * The combined results from all query parameter sets is needed to fully satisfy the given search filters and
   * coordinates.
   *
   * @param {IFiltersType} filters
   * @param {string} coordinates
   * @returns {IQueryParamSet[]} An array of distinct query parameter sets.
   * @memberof ApplicationService
   */
  buildQueryParamSets(filters: IFiltersType, coordinates: string): IQueryParamSet[] {
    let queryParamSets: IQueryParamSet[] = [];

    // None of these filters require manipulation or unique considerations
    const basicQueryParams: IQueryParamSet = {
      clidDtid: { value: filters && filters.clidDtid },
      purposes: {
        value:
          filters && _.flatMap(filters.purposes, purposeCode => ConstantUtils.getCode(CodeType.PURPOSE, purposeCode))
      },
      publishSince: { value: filters && filters.publishFrom ? filters.publishFrom.toISOString() : null },
      publishUntil: { value: filters && filters.publishTo ? filters.publishTo.toISOString() : null },
      coordinates: { value: coordinates }
    };

    // Certain Statuses require unique considerations, which are accounted for here

    const appStatusCodeGroups =
      (filters &&
        _.flatMap(filters.appStatuses, statusCode => ConstantUtils.getCodeGroup(CodeType.STATUS, statusCode))) ||
      [];

    appStatusCodeGroups.forEach(statusCodeGroup => {
      if (statusCodeGroup === StatusCodes.ABANDONED) {
        // Fetch applications with Abandoned Status that don't have a Reason indicating an amendment.
        queryParamSets.push({
          ...basicQueryParams,
          appStatuses: { value: StatusCodes.ABANDONED.mappedCodes },
          appReasons: {
            value: [ReasonCodes.AMENDMENT_APPROVED.code, ReasonCodes.AMENDMENT_NOT_APPROVED.code],
            modifier: QueryParamModifier.Not_Equal
          }
        });
      } else if (statusCodeGroup === StatusCodes.DECISION_APPROVED) {
        // Fetch applications with Approved status
        queryParamSets.push({
          ...basicQueryParams,
          appStatuses: { value: statusCodeGroup.mappedCodes }
        });

        // Also fetch applications with an Abandoned status that also have a Reason indicating an approved amendment.
        queryParamSets.push({
          ...basicQueryParams,
          appStatuses: { value: StatusCodes.ABANDONED.mappedCodes },
          appReasons: {
            value: [ReasonCodes.AMENDMENT_APPROVED.code],
            modifier: QueryParamModifier.Equal
          }
        });
      } else if (statusCodeGroup === StatusCodes.DECISION_NOT_APPROVED) {
        // Fetch applications with Not Approved status
        queryParamSets.push({
          ...basicQueryParams,
          appStatuses: { value: statusCodeGroup.mappedCodes }
        });

        // Also fetch applications with an Abandoned status that also have a Reason indicating a not approved amendment.
        queryParamSets.push({
          ...basicQueryParams,
          appStatuses: { value: StatusCodes.ABANDONED.mappedCodes },
          appReasons: {
            value: [ReasonCodes.AMENDMENT_NOT_APPROVED.code],
            modifier: QueryParamModifier.Equal
          }
        });
      } else {
        // This status requires no special treatment, fetch as normal
        queryParamSets.push({
          ...basicQueryParams,
          appStatuses: { value: statusCodeGroup.mappedCodes }
        });
      }
    });

    // if no status filters selected, still add the basic query filters
    if (queryParamSets.length === 0) {
      queryParamSets = [{ ...basicQueryParams }];
    }

    // handle comment period filtering

    const cpOpen = filters && filters.cpStatuses.includes(CommentCodes.OPEN.code);
    const cpNotOpen = filters && filters.cpStatuses.includes(CommentCodes.NOT_OPEN.code);

    const now = moment();
    const yesterday = now.clone().subtract(1, 'days');
    const tomorrow = now.clone().add(1, 'days');

    // if cpOpen then filter by cpStart <= today && cpEnd >= today
    if (cpOpen && !cpNotOpen) {
      queryParamSets = queryParamSets.map(queryParamSet => {
        return {
          ...queryParamSet,
          cpStartUntil: { value: now.endOf('day').toISOString() },
          cpEndSince: { value: now.startOf('day').toISOString() }
        };
      });
    }

    // else if cpNotOpen then filter by cpEnd <= yesterday || cpStart >= tomorrow
    if (!cpOpen && cpNotOpen) {
      // we need to duplicate our existing query param sets
      let queryParamSetsCopy = _.cloneDeep(queryParamSets);

      // add this comment period date fitler to the original set
      queryParamSets = queryParamSets.map(queryParamSet => {
        return {
          ...queryParamSet,
          cpEndUntil: { value: yesterday.endOf('day').toISOString() }
        };
      });

      // add this comment period date fitler to the duplicated set
      queryParamSetsCopy = queryParamSetsCopy.map(queryParamSet => {
        return {
          ...queryParamSet,
          cpStartSince: { value: tomorrow.startOf('day').toISOString() }
        };
      });

      // combine sets
      queryParamSets = queryParamSets.concat(queryParamSetsCopy);
    }

    return queryParamSets;
  }

  /**
   * Fetches the count of applications that match the given query parameter filters.
   *
   * @param {IFiltersType} filters
   * @param {string} coordinates
   * @returns {Observable<number>}
   * @memberof ApplicationService
   */
  getCount(filters: IFiltersType, coordinates: string): Observable<number> {
    const queryParamSets = this.buildQueryParamSets(filters, coordinates);

    const observables: Array<Observable<number>> = queryParamSets.map(queryParamSet =>
      this.api.getCountApplications(queryParamSet).pipe(catchError(this.api.handleError))
    );

    return combineLatest(observables, (...args: number[]) => args.reduce((sum, arg) => (sum += arg))).pipe(
      catchError(this.api.handleError)
    );
  }

  /**
   * Fetch all applications that match the given query parameter filters.
   *
   * Note: Doesn't include any secondary application data (documents, comment period, decisions, etc)
   *
   * @param {number} [pageNum=0]
   * @param {number} [pageSize=1000]
   * @param {IFiltersType} filters
   * @param {string} coordinates
   * @returns {Observable<Application[]>}
   * @memberof ApplicationService
   */
  getAll(
    pageNum: number = 0,
    pageSize: number = 1000,
    filters: IFiltersType,
    coordinates: string
  ): Observable<Application[]> {
    const queryParamSets = this.buildQueryParamSets(filters, coordinates);

    const observables: Array<Observable<Application[]>> = queryParamSets.map(queryParamSet => {
      const queryParamSetWithPagination = {
        ...queryParamSet,
        pageNum: { value: pageNum },
        pageSize: { value: pageSize }
      };
      return this.api.getApplications(queryParamSetWithPagination);
    });

    return combineLatest(...observables).pipe(
      map((res: Application[]) => {
        const resApps = _.flatten(res);
        if (!resApps || resApps.length === 0) {
          return [] as Application[];
        }

        const applications: Application[] = [];
        resApps.forEach(application => {
          applications.push(new Application(application));
        });

        return applications;
      }),
      catchError(this.api.handleError)
    );
  }

  /**
   * Fetch a single application by its id.
   *
   * @param {string} appId
   * @param {boolean} [forceReload=false]
   * @returns {Observable<Application>}
   * @memberof ApplicationService
   */
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
          ].includes(ConstantUtils.getCode(CodeType.STATUS, application.status))
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
      ConstantUtils.getCode(CodeType.STATUS, application.status) === StatusCodes.ABANDONED.code &&
      (ConstantUtils.getCode(CodeType.REASON, application.reason) === ReasonCodes.AMENDMENT_APPROVED.code ||
        ConstantUtils.getCode(CodeType.REASON, application.reason) === ReasonCodes.AMENDMENT_NOT_APPROVED.code)
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
      ConstantUtils.getCode(CodeType.STATUS, application.status) === StatusCodes.ABANDONED.code &&
      ConstantUtils.getCode(CodeType.REASON, application.reason) !== ReasonCodes.AMENDMENT_APPROVED.code &&
      ConstantUtils.getCode(CodeType.REASON, application.reason) !== ReasonCodes.AMENDMENT_NOT_APPROVED.code
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
    return (
      application &&
      ConstantUtils.getCode(CodeType.STATUS, application.status) === StatusCodes.APPLICATION_UNDER_REVIEW.code
    );
  }

  /**
   *
   *
   * @param {Application} application
   * @returns {boolean} true if the application has a review complete status, false otherwise.
   * @memberof ApplicationService
   */
  isApplicationReviewComplete(application: Application): boolean {
    return (
      application &&
      ConstantUtils.getCode(CodeType.STATUS, application.status) === StatusCodes.APPLICATION_REVIEW_COMPLETE.code
    );
  }

  /**
   *
   *
   * @param {Application} application
   * @returns {boolean} true if the application has a decision approved status, false otherwise.
   * @memberof ApplicationService
   */
  isDecisionApproved(application: Application): boolean {
    return (
      application && ConstantUtils.getCode(CodeType.STATUS, application.status) === StatusCodes.DECISION_APPROVED.code
    );
  }

  /**
   *
   *
   * @param {Application} application
   * @returns {boolean} true if the application has a decision not approved status, false otherwise.
   * @memberof ApplicationService
   */
  isDecisionNotApproved(application: Application): boolean {
    return (
      application &&
      ConstantUtils.getCode(CodeType.STATUS, application.status) === StatusCodes.DECISION_NOT_APPROVED.code
    );
  }

  /**
   *
   *
   * @param {Application} application
   * @returns {boolean} true if the application has an unknown status, false otherwise.
   * @memberof ApplicationService
   */
  isUnknown(application: Application): boolean {
    return application && ConstantUtils.getCode(CodeType.STATUS, application.status) === StatusCodes.UNKNOWN.code;
  }

  /**
   * Given a status code, returns a short user-friendly status string.
   *
   * @param {string} statusCode
   * @returns {string}
   * @memberof ApplicationService
   */
  getStatusStringShort(statusCode: string): string {
    return ConstantUtils.getTextShort(CodeType.STATUS, statusCode) || StatusCodes.UNKNOWN.text.short;
  }

  /**
   * Given an application, returns a long user-friendly status string.
   *
   * @param {Application} application
   * @returns {string}
   * @memberof ApplicationService
   */
  getStatusStringLong(application: Application): string {
    if (!application) {
      return StatusCodes.UNKNOWN.text.long;
    }

    // If the application was abandoned, but the reason is due to an amendment, then return an amendment string instead
    if (this.isAmendment(application)) {
      return ConstantUtils.getTextLong(CodeType.REASON, application.reason);
    }

    return (
      (application && ConstantUtils.getTextLong(CodeType.STATUS, application.status)) || StatusCodes.UNKNOWN.text.long
    );
  }
}
