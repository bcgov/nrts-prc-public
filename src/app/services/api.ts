import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';

import { Observable, of, combineLatest, merge, throwError } from 'rxjs';
import { map, mergeMap, toArray } from 'rxjs/operators';

import { Application } from 'app/models/application';
import { Comment } from 'app/models/comment';
import { CommentPeriod } from 'app/models/commentperiod';
import { Decision } from 'app/models/decision';
import { Document } from 'app/models/document';
import { Feature } from 'app/models/feature';
import { User } from 'app/models/user';

/**
 * Supported query param field modifiers used by the api to interpret the query param value.
 *
 * @export
 * @enum {number}
 */
export enum QueryParamModifier {
  Equal = 'eq', // value must be equal to this, if multiple value must match at least one
  Not_Equal = 'ne', // value must not be equal to this, if multiple value must not match any
  Since = 'since', // date must be on or after this date
  Until = 'until' // date must be before this date
}

/**
 * A complete set of query param fields used to make a single call to the api.
 *
 * @export
 * @interface IQueryParamSet
 */
export interface IQueryParamSet {
  [key: string]: IQueryParamValue;
}

/**
 * A single query param field with optional modifier.
 *
 * @export
 * @interface IQueryParamValue
 */
export interface IQueryParamValue {
  value: any;
  modifier?: QueryParamModifier;
}

/**
 * Methods for calling the API (backend server).
 *
 * @export
 * @class ApiService
 */
@Injectable()
export class ApiService {
  // public token: string;
  public isMS: boolean; // IE, Edge, etc
  public apiPath: string;
  public adminUrl: string;
  public env: 'local' | 'dev' | 'test' | 'master' | 'prod';

  constructor(private http: HttpClient) {
    // const currentUser = JSON.parse(window.localStorage.getItem('currentUser'));
    // this.token = currentUser && currentUser.token;
    this.isMS = window.navigator.msSaveOrOpenBlob ? true : false;
    const { hostname } = window.location;
    switch (hostname) {
      case 'localhost':
        // Local
        this.apiPath = 'http://localhost:3000/api/public';
        this.adminUrl = 'http://localhost:4200';
        this.env = 'local';
        break;

      case 'nrts-prc-dev.pathfinder.gov.bc.ca':
        // Dev
        this.apiPath = 'https://nrts-prc-dev.pathfinder.gov.bc.ca/api/public';
        this.adminUrl = 'https://nrts-prc-dev.pathfinder.gov.bc.ca/admin/';
        this.env = 'dev';
        break;

      case 'nrts-prc-master.pathfinder.gov.bc.ca':
        // Master
        this.apiPath = 'https://nrts-prc-master.pathfinder.gov.bc.ca/api/public';
        this.adminUrl = 'https://nrts-prc-master.pathfinder.gov.bc.ca/admin/';
        this.env = 'master';
        break;

      case 'nrts-prc-test.pathfinder.gov.bc.ca':
        // Test
        this.apiPath = 'https://nrts-prc-test.pathfinder.gov.bc.ca/api/public';
        this.adminUrl = 'https://nrts-prc-test.pathfinder.gov.bc.ca/admin/';
        this.env = 'test';
        break;

      default:
        // Prod
        this.apiPath = 'https://comment.nrs.gov.bc.ca/api/public';
        this.adminUrl = 'https://comment.nrs.gov.bc.ca/admin/';
        this.env = 'prod';
    }
  }

  /**
   * Generic error handler that logs the error before re-throwing the original error.
   *
   * @param {*} error
   * @returns {Observable<never>}
   * @memberof ApiService
   */
  handleError(error: any): Observable<never> {
    const reason = error.message
      ? error.message
      : error.status
      ? `${error.status} - ${error.statusText}`
      : 'Server error';
    console.log('API error =', reason);
    return throwError(error);
  }

  /**
   * Fetches the count of applications that match the given query parameter filters.
   *
   * @param {IQueryParamSet} params query parameters to filter applications.
   * @returns {Observable<number>}
   * @memberof ApiService
   */
  getCountApplications(params: IQueryParamSet): Observable<number> {
    let queryString = 'application?';

    if (params['cpStartSince'] && params['cpStartSince'].value) {
      queryString += `cpStart[since]=${params['cpStartSince'].value}&`;
    }
    if (params['cpStartUntil'] && params['cpStartUntil'].value) {
      queryString += `cpStart[until]=${params['cpStartUntil'].value}&`;
    }
    if (params['cpEndSince'] && params['cpEndSince'].value) {
      queryString += `cpEnd[since]=${params['cpEndSince'].value}&`;
    }
    if (params['cpEndUntil'] && params['cpEndUntil'].value) {
      queryString += `cpEnd[until]=${params['cpEndUntil'].value}&`;
    }
    if (params['appStatuses']) {
      params['appStatuses'].value.forEach((status: string) => (queryString += `status[eq]=${status}&`));
    }
    if (params['appReasons']) {
      params['appReasons'].value.forEach(
        (reason: string) => (queryString += `reason[${params['appReasons'].modifier}]=${encodeURIComponent(reason)}&`)
      );
    }
    if (params['applicant']) {
      queryString += `client=${encodeURIComponent(params['applicant'].value)}&`;
    }
    if (params['purposes']) {
      params['purposes'].value.forEach(
        (purpose: string) => (queryString += `purpose[eq]=${encodeURIComponent(purpose)}&`)
      );
    }
    if (params['subpurposes']) {
      params['subpurposes'].value.forEach(
        (subpurpose: string) => (queryString += `subpurpose[eq]=${encodeURIComponent(subpurpose)}&`)
      );
    }
    if (params['publishSince'] && params['publishSince'].value) {
      queryString += `publishDate[since]=${params['publishSince'].value}&`;
    }
    if (params['publishUntil'] && params['publishUntil'].value) {
      queryString += `publishDate[until]=${params['publishUntil'].value}&`;
    }
    if (params['coordinates'] && params['coordinates'].value) {
      queryString += `centroid=${params['coordinates'].value}&`;
    }

    if (!params['clidDtid'] || !params['clidDtid'].value) {
      // trim the last ? or &
      queryString = queryString.slice(0, -1);

      // retrieve the count from the response headers
      return this.http
        .head<HttpResponse<object>>(`${this.apiPath}/${queryString}`, { observe: 'response' })
        .pipe(map(res => parseInt(res.headers.get('x-total-count'), 10)));
    } else {
      // query for both CLID and DTID
      const clid = this.http
        .head<HttpResponse<object>>(`${this.apiPath}/${queryString}cl_file=${params['clidDtid'].value}`, {
          observe: 'response'
        })
        .pipe(map(res => parseInt(res.headers.get('x-total-count'), 10)));
      const dtid = this.http
        .head<HttpResponse<object>>(`${this.apiPath}/${queryString}tantalisId=${params['clidDtid'].value}`, {
          observe: 'response'
        })
        .pipe(map(res => parseInt(res.headers.get('x-total-count'), 10)));

      // return sum of counts
      return combineLatest(clid, dtid, (v1, v2) => v1 + v2);
    }
  }

  /**
   * Fetch all applications that match the given query parameters filters.
   *
   * @param {IQueryParamSet} params query parameters to filter applications.
   * @returns {Observable<Application[]>}
   * @memberof ApiService
   */
  getApplications(params: IQueryParamSet): Observable<Application[]> {
    // requested application fields
    const fields = [
      'agency',
      'areaHectares',
      'businessUnit',
      'centroid',
      'cl_file',
      'client',
      'description',
      'legalDescription',
      'location',
      'name',
      'publishDate',
      'purpose',
      'status',
      'reason',
      'statusHistoryEffectiveDate',
      'subpurpose',
      'subtype',
      'tantalisID',
      'tenureStage',
      'type'
    ];

    let queryString = 'application?';

    if (params['pageNum'] && params['pageNum'].value) {
      queryString += `pageNum=${params['pageNum'].value}&`;
    }
    if (params['pageSize'] && params['pageSize'].value) {
      queryString += `pageSize=${params['pageSize'].value}&`;
    }
    if (params['cpStartSince'] && params['cpStartSince'].value) {
      queryString += `cpStart[since]=${params['cpStartSince'].value}&`;
    }
    if (params['cpStartUntil'] && params['cpStartUntil'].value) {
      queryString += `cpStart[until]=${params['cpStartUntil'].value}&`;
    }
    if (params['cpEndSince'] && params['cpEndSince'].value) {
      queryString += `cpEnd[since]=${params['cpEndSince'].value}&`;
    }
    if (params['cpEndUntil'] && params['cpEndUntil'].value) {
      queryString += `cpEnd[until]=${params['cpEndUntil'].value}&`;
    }
    if (params['appStatuses']) {
      params['appStatuses'].value.forEach((status: string) => (queryString += `status[eq]=${status}&`));
    }
    if (params['appReasons']) {
      params['appReasons'].value.forEach(
        (reason: string) => (queryString += `reason[${params['appReasons'].modifier}]=${encodeURIComponent(reason)}&`)
      );
    }
    if (params['applicant'] && params['applicant'].value) {
      queryString += `client=${encodeURIComponent(params['applicant'].value)}&`;
    }
    if (params['purposes']) {
      params['purposes'].value.forEach(
        (purpose: string) => (queryString += `purpose[eq]=${encodeURIComponent(purpose)}&`)
      );
    }
    if (params['subpurposes']) {
      params['subpurposes'].value.forEach(
        (subpurpose: string) => (queryString += `subpurpose[eq]=${encodeURIComponent(subpurpose)}&`)
      );
    }
    if (params['publishSince'] && params['publishSince'].value) {
      queryString += `publishDate[since]=${params['publishSince'].value}&`;
    }
    if (params['publishUntil'] && params['publishUntil'].value) {
      queryString += `publishDate[until]=${params['publishUntil'].value}&`;
    }
    if (params['coordinates'] && params['coordinates'].value) {
      queryString += `centroid=${params['coordinates'].value}&`;
    }

    queryString += `fields=${this.convertArrayIntoPipeString(fields)}`;

    if (!params['clidDtid'] || !params['clidDtid'].value) {
      return this.http.get<Application[]>(`${this.apiPath}/${queryString}`);
    } else {
      // query for both CLID and DTID
      const clid = this.http.get<Application[]>(`${this.apiPath}/${queryString}&cl_file=${params['clidDtid'].value}`);
      const dtid = this.http.get<Application[]>(
        `${this.apiPath}/${queryString}&tantalisId=${params['clidDtid'].value}`
      );

      // return merged results, using toArray to wait for all results (ie, single emit)
      // this is fine performance-wise because there should be no more than a few results
      return merge(clid, dtid).pipe(
        toArray(),
        mergeMap(items => of(...items))
      );
    }
  }

  /**
   * Fetch a single application by its unique id.
   *
   * @param {string} id
   * @returns {Observable<Application[]>}
   * @memberof ApiService
   */
  getApplication(id: string): Observable<Application[]> {
    // requested application fields
    const fields = [
      'agency',
      'areaHectares',
      'businessUnit',
      'centroid',
      'cl_file',
      'client',
      'description',
      'legalDescription',
      'location',
      'name',
      'publishDate',
      'purpose',
      'status',
      'reason',
      'statusHistoryEffectiveDate',
      'subpurpose',
      'subtype',
      'tantalisID',
      'tenureStage',
      'type'
    ];
    const queryString = 'application/' + id + '?fields=' + this.convertArrayIntoPipeString(fields);
    return this.http.get<Application[]>(`${this.apiPath}/${queryString}`);
  }

  //
  // Features
  //
  getFeaturesByTantalisId(tantalisID: number): Observable<Feature[]> {
    const fields = ['applicationID', 'geometry', 'properties', 'type'];
    const queryString = `feature?tantalisId=${tantalisID}&fields=${this.convertArrayIntoPipeString(fields)}`;
    return this.http.get<Feature[]>(`${this.apiPath}/${queryString}`);
  }

  getFeaturesByApplicationId(applicationId: string): Observable<Feature[]> {
    const fields = ['applicationID', 'geometry', 'properties', 'type'];
    const queryString = `feature?applicationId=${applicationId}&fields=${this.convertArrayIntoPipeString(fields)}`;
    return this.http.get<Feature[]>(`${this.apiPath}/${queryString}`);
  }

  //
  // Decisions
  //
  getDecisionByAppId(appId: string): Observable<Decision[]> {
    const fields = ['_addedBy', '_application', 'name', 'description'];
    const queryString = 'decision?_application=' + appId + '&fields=' + this.convertArrayIntoPipeString(fields);
    return this.http.get<Decision[]>(`${this.apiPath}/${queryString}`);
  }

  getDecision(id: string): Observable<Decision[]> {
    const fields = ['_addedBy', '_application', 'name', 'description'];
    const queryString = 'decision/' + id + '?fields=' + this.convertArrayIntoPipeString(fields);
    return this.http.get<Decision[]>(`${this.apiPath}/${queryString}`);
  }

  //
  // Comment Periods
  //
  getPeriodsByAppId(appId: string): Observable<CommentPeriod[]> {
    const fields = ['_addedBy', '_application', 'startDate', 'endDate'];
    const queryString = 'commentperiod?_application=' + appId + '&fields=' + this.convertArrayIntoPipeString(fields);
    return this.http.get<CommentPeriod[]>(`${this.apiPath}/${queryString}`);
  }

  getPeriod(id: string): Observable<CommentPeriod[]> {
    const fields = ['_addedBy', '_application', 'startDate', 'endDate'];
    const queryString = 'commentperiod/' + id + '?fields=' + this.convertArrayIntoPipeString(fields);
    return this.http.get<CommentPeriod[]>(`${this.apiPath}/${queryString}`);
  }

  //
  // Comments
  //
  getCommentsByPeriodId(periodId: string): Observable<Comment[]> {
    // requested application fields
    const fields = [
      '_addedBy',
      '_commentPeriod',
      'commentNumber',
      'comment',
      'commentAuthor',
      'review',
      'dateAdded',
      'commentStatus'
    ];
    const queryString = 'comment?_commentPeriod=' + periodId + '&fields=' + this.convertArrayIntoPipeString(fields);
    return this.http.get<Comment[]>(`${this.apiPath}/${queryString}`);
  }

  getComment(id: string): Observable<Comment[]> {
    // requested application fields
    const fields = [
      '_addedBy',
      '_commentPeriod',
      'commentNumber',
      'comment',
      'commentAuthor',
      'review',
      'dateAdded',
      'commentStatus'
    ];
    const queryString = 'comment/' + id + '?fields=' + this.convertArrayIntoPipeString(fields);
    return this.http.get<Comment[]>(`${this.apiPath}/${queryString}`);
  }

  addComment(comment: Comment): Observable<Comment> {
    const fields = ['comment', 'commentAuthor'];
    const queryString = 'comment?fields=' + this.convertArrayIntoPipeString(fields);
    return this.http.post<Comment>(`${this.apiPath}/${queryString}`, comment, {});
  }

  //
  // Documents
  //
  getDocumentsByAppId(appId: string): Observable<Document[]> {
    const fields = ['_application', 'documentFileName', 'displayName', 'internalURL', 'internalMime'];
    const queryString = 'document?_application=' + appId + '&fields=' + this.convertArrayIntoPipeString(fields);
    return this.http.get<Document[]>(`${this.apiPath}/${queryString}`);
  }

  getDocumentsByCommentId(commentId: string): Observable<Document[]> {
    const fields = ['_comment', 'documentFileName', 'displayName', 'internalURL', 'internalMime'];
    const queryString = 'document?_comment=' + commentId + '&fields=' + this.convertArrayIntoPipeString(fields);
    return this.http.get<Document[]>(`${this.apiPath}/${queryString}`);
  }

  getDocumentsByDecisionId(decisionId: string): Observable<Document[]> {
    const fields = ['_decision', 'documentFileName', 'displayName', 'internalURL', 'internalMime'];
    const queryString = 'document?_decision=' + decisionId + '&fields=' + this.convertArrayIntoPipeString(fields);
    return this.http.get<Document[]>(`${this.apiPath}/${queryString}`);
  }

  getDocument(id: string): Observable<Document[]> {
    const queryString = 'document/' + id;
    return this.http.get<Document[]>(`${this.apiPath}/${queryString}`);
  }

  uploadDocument(formData: FormData): Observable<Document> {
    const fields = ['documentFileName', 'displayName', 'internalURL', 'internalMime'];
    const queryString = 'document/?fields=' + this.convertArrayIntoPipeString(fields);
    return this.http.post<Document>(`${this.apiPath}/${queryString}`, formData, { reportProgress: true });
  }

  getDocumentUrl(document: Document): string {
    return document ? this.apiPath + '/document/' + document._id + '/download' : '';
  }

  //
  // Users
  //
  getAllUsers(): Observable<User[]> {
    const fields = ['displayName', 'username', 'firstName', 'lastName'];
    const queryString = 'user?fields=' + this.convertArrayIntoPipeString(fields);
    return this.http.get<User[]>(`${this.apiPath}/${queryString}`);
  }

  /**
   * Converts an array of strings into a single string whose values are separated by a pipe '|' symbol.
   *
   * Example: ['bird','dog','cat'] -> 'bird|dog|cat'
   *
   * @private
   * @param {string[]} collection
   * @returns {string}
   * @memberof ApiService
   */
  private convertArrayIntoPipeString(collection: string[]): string {
    if (!collection || collection.length <= 0) {
      return '';
    }

    return collection.join('|');
  }
}
