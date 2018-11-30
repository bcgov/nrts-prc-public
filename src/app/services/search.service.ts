import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/catch';

import { ApiService } from './api';
import { SearchResults } from 'app/models/search';
import { Feature } from 'app/models/feature';
import { Client } from 'app/models/client';

@Injectable()
export class SearchService {
  private clients: Array<Client> = null;
  private search: SearchResults = null;
  private features: Array<Feature> = null;

  constructor(private api: ApiService) { }

  // get clients by disposition ID (transaction ID)
  getClientsByDispositionId(dispositionId: number, forceReload: boolean = false): Observable<Client[]> {
    if (!forceReload && this.clients && this.clients.length > 0 && this.clients[0].DISPOSITION_TRANSACTION_SID === dispositionId) {
      return Observable.of(this.clients);
    }

    return this.api.getClientsInfoByDispositionId(dispositionId)
      .map(res => {
        const clients = res.text() ? res.json() : [];
        clients.forEach((client, i) => {
          clients[i] = new Client(client);
        });
        return clients;
      })
      .map((clients: Client[]) => {
        if (clients.length === 0) {
          return [];
        }

        this.clients = clients;
        return this.clients;
      })
      .catch(this.api.handleError);
  }

  // get search results by CL file #
  getByCLFile(clfile: string, forceReload: boolean = false): Observable<SearchResults> {
    if (!forceReload && this.search && this.search.features && this.search.features.length > 0 && this.search.features[0].properties
      && this.search.features[0].properties.CROWN_LANDS_FILE === clfile) {
      return Observable.of(this.search);
    }

    return this.api.getBCGWCrownLands(clfile)
      .map(res => {
        return res.text() ? new SearchResults(res.json()) : null;
      })
      .map((search: SearchResults) => {
        if (!search) { return null; }

        this.search = search;
        return this.search;
      })
      .catch(this.api.handleError);
  }

  // get features by disposition ID (transaction ID)
  getByDTID(dtid: number, forceReload: boolean = false): Observable<Feature[]> {
    if (!forceReload && this.features && this.features.length > 0 && this.features[0].properties
      && this.features[0].properties.DISPOSITION_TRANSACTION_SID === dtid) {
      // console.log('cached features =', this.features);
      return Observable.of(this.features);
    }

    return this.api.getBCGWDispositionTransactionId(dtid)
      .map(res => {
        const results = res.text() ? new SearchResults(res.json()) : null;
        return results.features;
      })
      .map((features: Feature[]) => {
        if (!features) { return null; }

        // console.log('new features =', features);
        this.features = features;
        return this.features;
      })
      .catch(this.api.handleError);
  }
}
