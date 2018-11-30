export class Organization {
  _id: string;
  _addedBy: string;
  name: string;

  // THE FOLLOWING NOT USED?
  alsoKnownAs: string;
  company: string;
  website: string;
  companyLegal: number;
  registeredIn: string;
  parentCompany: string;
  companyType: string;
  address1: string;
  address2: string;
  province: string;
  postal: string;
  country: string;

  constructor(obj?: any) {
    this._id           = obj && obj._id           || null;
    this._addedBy      = obj && obj._addedBy      || null;
    this.name          = obj && obj.name          || null;

    this.alsoKnownAs   = obj && obj.alsoKnownAs   || null;
    this.company       = obj && obj.company       || null;
    this.website       = obj && obj.website       || null;
    this.companyLegal  = obj && obj.companyLegal  || null;
    this.registeredIn  = obj && obj.registeredIn  || null;
    this.companyType   = obj && obj.companyType   || null;
    this.address1      = obj && obj.address1      || null;
    this.address2      = obj && obj.address2      || null;
    this.province      = obj && obj.province      || null;
    this.postal        = obj && obj.postal        || null;
    this.country       = obj && obj.country       || null;
    this.parentCompany = obj && obj.parentCompany || null;
  }
}
