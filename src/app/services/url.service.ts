import { Injectable } from '@angular/core';
import { Params, ActivatedRoute, Router, NavigationEnd, Event } from '@angular/router';
import { Observable } from 'rxjs';
import { filter, share } from 'rxjs/operators';
import { debounce } from 'lodash';
import { Location } from '@angular/common';

/**
 * This service provides a centralized mechanism to save and restore query parameters to the URL.
 * This allows browser forward/back functionality as well as bookmarking and copy/pasting a URL.
 *
 * @export
 * @class UrlService
 */
@Injectable()
export class UrlService {
  public onNavEnd$: Observable<NavigationEnd>; // see details below
  private queryParams: Params = {};
  private panel: string = null;

  constructor(public route: ActivatedRoute, public router: Router, public location: Location) {
    // Create a new observable that publishes only the NavigationEnd event used for subscribers to know when to
    // refresh their parameters
    // Use share() so this fires only once each time even with multiple subscriptions
    this.onNavEnd$ = this.router.events.pipe(
      filter((event: Event): event is NavigationEnd => event instanceof NavigationEnd),
      share()
    );

    // keep url fragment up to date
    this.onNavEnd$.subscribe(event => {
      const urlTree = router.parseUrl(event.url);

      if (urlTree) {
        this.panel = urlTree.fragment;
      }
    });

    // keep query params up to date
    this.route.queryParamMap.subscribe(paramMap => {
      this.queryParams = {}; // reset query params
      paramMap.keys.forEach(key => (this.queryParams[key] = paramMap.get(key)));
    });
  }

  /**
   * Gets a query parameter from the url.
   *
   * @param {string} key query paramter url key
   * @returns {string} query paramter url value associated with the key or null if none found
   * @memberof UrlService
   */
  public getQueryParam(key: string): string {
    return this.queryParams[key] || null;
  }

  /**
   * Adds or removes a query paramter from the url.
   *
   * Note: If the query parameter key has already been used, and a null or undefined value is provided, the query
   * param will be removed.
   *
   * @param {string} key query paramter url key
   * @param {string} value query paramter url value
   * @memberof UrlService
   */
  public setQueryParam(key: string, value: string): void {
    if (value === this.getQueryParam(key)) {
      // query param exists and has not changed
      return;
    }

    if (value) {
      // add/update key
      this.queryParams[key] = value;
    } else {
      // remove key
      delete this.queryParams[key];
    }

    // update url
    this.navigate();
  }

  /**
   * Sets the url fragment.
   *
   * Example: www.domain.com/path/123#fragment
   *
   * @param {string} fragment url fragment
   * @memberof UrlService
   */
  public setFragment(fragment: string): void {
    if (fragment === this.panel) {
      // fragment exists and has not changed
      return;
    }

    this.panel = fragment;
    this.navigate();
  }

  /**
   * Get the current url fragment.
   *
   * @returns {string}
   * @memberof UrlService
   */
  public getFragment(): string {
    return this.panel;
  }

  /**
   * Update the browsers url.
   *
   * @memberof UrlService
   */
  public navigate = debounce(() => {
    this.router
      .navigate([], { relativeTo: this.route, queryParams: this.queryParams, fragment: this.panel })
      .toString();
  }, 100);
}
