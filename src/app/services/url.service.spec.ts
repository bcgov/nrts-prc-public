import { TestBed, inject } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { UrlService } from './url.service';
import { of } from 'rxjs';
import { ActivatedRoute } from '@angular/router';

describe('UrlService', () => {
  const activatedRouteStub = { queryParamMap: of() };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      providers: [{ provide: ActivatedRoute, useValue: activatedRouteStub }, UrlService]
    });
  });

  it('should be created', inject([UrlService], (service: UrlService) => {
    expect(service).toBeTruthy();
  }));
});
