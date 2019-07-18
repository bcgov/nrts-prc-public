import * as _ from 'lodash';

/**
 * Contains a date or string type filter, which can have one value.
 *
 * @export
 * @class Filter
 * @template T Date or string
 */
export class Filter<T extends Date | string> {
  public filter: IFilterOption<T>;

  constructor({ filter }: { filter: IFilterOption<T> }) {
    this.filter = filter;
  }

  /**
   * Returns the filter as a query string of the form `'queryParam=value'`
   * Returns empty string if the filter value is null, undefined, or empty.
   *
   * @returns {string}
   * @memberof Filter
   */
  public getQueryParamsString(): string {
    if (!this.filter.value) {
      return '';
    }

    return `${this.filter.queryParam}=${this.filter.value}`;
  }

  /**
   * Returns true if filter value is set (not null, undefined, or empty), false otherwise.
   *
   * @returns {boolean}
   * @memberof Filter
   */
  public isFilterSet(): boolean {
    return !!this.filter.value;
  }

  /**
   * Sets the filter value to null.
   *
   * @memberof Filter
   */
  public reset(): void {
    this.filter.value = null;
  }
}

/**
 * Minimal fields necessary for the string or date type filter.
 *
 * @export
 * @interface IFilterOption
 * @template T Date or string
 */
export interface IFilterOption<T extends Date | string> {
  queryParam: string;
  value: T;
}

/**
 * Contains a string filter, which can have many values.
 *
 * @export
 * @class MultiStringFilter
 */
export class MultiStringFilter {
  public queryParamsKey: string;
  public filters: IMultiStringFilterOption[];

  constructor({ queryParamsKey, filters }: { queryParamsKey: string; filters: IMultiStringFilterOption[] }) {
    this.queryParamsKey = queryParamsKey;
    this.filters = filters;
  }

  /**
   * Returns the string filters as an array of params
   *
   * Example: ['bird', 'dog', 'cat']
   *
   * @returns {string[]}
   * @memberof MultiStringFilter
   */
  public getQueryParamsArray(): string[] {
    return this.filters.filter(filter => filter.isSelected).map(filter => filter.queryParam);
  }

  /**
   * Returns the string filters as a query string where each filter param is separated by a '|' symbol.
   *
   * Example: queryParam=bird|dog|cat
   *
   * @returns {string}
   * @memberof MultiStringFilter
   */
  public getQueryParamsString(): string {
    const selectedFilters: IMultiStringFilterOption[] = this.filters.filter(filter => filter.isSelected);

    let queryParamString = '';
    _.each(selectedFilters, filter => {
      queryParamString += filter.queryParam + '|';
    });

    // trim the last |
    return queryParamString.replace(/\|$/, '');
  }

  /**
   * Returns true if at least one filter has been set, false otherwise.
   *
   * @returns {boolean}
   * @memberof MultiStringFilter
   */
  public areFiltersSet(): boolean {
    return this.filters.filter(filter => filter.isSelected).length > 0;
  }

  /**
   * Sets all string filters isSelected to false.
   *
   * @memberof MultiStringFilter
   */
  public reset(): void {
    this.filters.forEach(filter => (filter.isSelected = false));
  }
}

/**
 * Minimal fields necessary for the multi string type filter.
 *
 * @export
 * @interface IMultiStringFilterOption
 */
export interface IMultiStringFilterOption {
  queryParam: string;
  displayString: string;
  isSelected: boolean;
}
