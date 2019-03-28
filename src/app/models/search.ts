import { Feature } from './feature';

export class SearchResults {
  _id: string;
  totalFeatures: number;
  date: Date = null;
  crs: string;
  type: string;
  status: string;
  hostname: string;

  features: Feature[] = [];
  sidsFound: string[] = [];

  constructor(search?: any, hostname?: any) {
    this._id = (search && search._id) || null;
    this.totalFeatures = (search && search.totalFeatures) || 0;
    this.crs = (search && search.crs) || null;
    this.type = (search && search.type) || null;
    this.date = (search && search.date) || null;
    this.status = (search && search.status) || null;
    this.hostname = hostname;

    if (search && search.date) {
      this.date = new Date(search.date);
    }

    // copy features
    if (search && search.features) {
      for (const feature of search.features) {
        this.features.push(feature);
      }
    }

    // copy sidsFound
    if (search && search.sidsFound) {
      for (const sid of search.sidsFound) {
        this.sidsFound.push(sid);
      }
    }
  }
}
