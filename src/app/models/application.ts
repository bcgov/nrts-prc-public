import { Document } from './document';
import { Organization } from './organization';
import { CommentPeriod } from './commentperiod';
import { Decision } from './decision';
import { Feature } from './feature';
import * as _ from 'lodash';

class Internal {
  notes: string;

  constructor(obj?: any) {
    this.notes = obj && obj.notes || null;
  }
}

export class Application {
  _id: string;

  agency: string;
  cl_file: number;
  client: string;
  code: string;
  description: string;
  id: string; // objectid (same as _id)
  internal: Internal;
  internalID: number;
  latitude: number;
  legalDescription: string;
  longitude: number;
  name: string;
  postID: number;
  publishDate: Date;
  tantalisID: number;

  // the following are cached from features[0].properties
  businessUnit: string;
  location: string;
  purpose: string;
  region: string;
  subpurpose: string;
  status: string;
  tenureStage: string;
  type: string;
  subtype: string;

  areaHectares: number; // calculated from all features

  isVisible = true; // whether this application is visible on map
                    // default is true - for apps without features
  isLoaded = false; // whether all related app data (comment period, shapes, etc) is loaded
  appStatus: string = null; // derived application status for app list display
  cpStatus: string = null; // derived comment period status for app list display

  // associated data
  documents: Array<Document>;
  currentPeriod: CommentPeriod;
  decision: Decision;
  features: Array<Feature>;

  constructor(obj?: any) {
    this._id                     = obj && obj._id                     || null;

    this.agency                  = obj && obj.agency                  || null;
    this.cl_file                 = obj && obj.cl_file                 || null;
    this.client                  = obj && obj.client                  || null;
    this.code                    = obj && obj.code                    || null;
    this.description             = obj && obj.description             || null;
    this.id                      = obj && obj.id                      || null;
    this.internal                = obj && obj.internal                || new Internal();
    this.internalID              = obj && obj.internalID              || 0;
    this.latitude                = obj && obj.latitude                || 0.00;
    this.legalDescription        = obj && obj.legalDescription        || null;
    this.longitude               = obj && obj.longitude               || 0.00;
    this.name                    = obj && obj.name                    || null;
    this.postID                  = obj && obj.postID                  || null;
    this.publishDate             = obj && obj.publishDate             || null;
    this.tantalisID              = obj && obj.tantalisID              || null; // not zero

    this.businessUnit            = obj && obj.businessUnit            || null;
    this.location                = obj && obj.location                || null;
    this.purpose                 = obj && obj.purpose                 || null;
    this.region                  = obj && obj.region                  || null;
    this.subpurpose              = obj && obj.subpurpose              || null;
    this.status                  = obj && obj.status                  || null;
    this.tenureStage             = obj && obj.tenureStage             || null;
    this.type                    = obj && obj.type                    || null;
    this.subtype                 = obj && obj.subtype                 || null;

    this.areaHectares            = obj && obj.areaHectares            || null;

    this.documents = [];
    this.currentPeriod = null;
    this.decision = null;
    this.features = [];
  }
}
