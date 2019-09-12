import { TestBed, async } from '@angular/core/testing';
import { ApplicationService } from './application.service';
import { ApiService } from 'app/services/api';
import { DocumentService } from './document.service';
import { CommentPeriodService } from './commentperiod.service';
import { DecisionService } from './decision.service';
import { FeatureService } from './feature.service';
import { of } from 'rxjs';
import { Application } from 'app/models/application';
import { Document } from 'app/models/document';
import { CommentPeriod } from 'app/models/commentperiod';
import { Decision } from 'app/models/decision';
import { Feature } from 'app/models/feature';

describe('ApplicationService', () => {
  beforeEach(() => {
    const apiServiceSpy = jasmine.createSpyObj('ApiService', [
      'getApplication',
      'getApplications',
      'getCountApplications'
    ]);
    apiServiceSpy.getApplication.and.returnValue(of([{ _id: 123, status: 'ACCEPTED' }]));
    apiServiceSpy.getApplications.and.returnValue(
      of([{ _id: 'AAAA', status: 'ACCEPTED' }, { _id: 'BBBB', status: 'OFFERED' }])
    );
    apiServiceSpy.getCountApplications.and.returnValue(of(300));

    const documentServiceSpy = jasmine.createSpyObj('DocumentService', ['getAllByApplicationId']);
    documentServiceSpy.getAllByApplicationId.and.returnValue(
      of([new Document({ _id: 'DDDDD' }), new Document({ _id: 'EEEEE' })])
    );

    const decisionServiceSpy = jasmine.createSpyObj('DecisionService', ['getByApplicationId']);
    decisionServiceSpy.getByApplicationId.and.returnValue(of(new Decision({ _id: 'IIIII' })));

    const featureServiceSpy = jasmine.createSpyObj('FeatureService', ['getByApplicationId']);
    featureServiceSpy.getByApplicationId.and.returnValue(
      of([
        new Feature({ _id: 'FFFFF', properties: { TENURE_AREA_IN_HECTARES: 12 } }),
        new Feature({ _id: 'GGGGG', properties: { TENURE_AREA_IN_HECTARES: 13 } })
      ])
    );

    TestBed.configureTestingModule({
      providers: [
        ApplicationService,
        { provide: ApiService, useValue: apiServiceSpy },
        { provide: DocumentService, useValue: documentServiceSpy },
        CommentPeriodService,
        { provide: DecisionService, useValue: decisionServiceSpy },
        { provide: FeatureService, useValue: featureServiceSpy }
      ]
    });

    const commentPeriodServiceSpy = spyOn(TestBed.get(CommentPeriodService), 'getAllByApplicationId');
    commentPeriodServiceSpy.and.returnValue(
      of([
        new CommentPeriod({ _id: 'DDDDD', startDate: new Date(2016, 10, 1), endDate: new Date(2100, 11, 10) }),
        new CommentPeriod({ _id: 'EEEEE', startDate: new Date(2016, 10, 1), endDate: new Date(2100, 11, 10) })
      ])
    );
  });

  it('should be created', () => {
    const service = TestBed.get(ApplicationService);
    expect(service).toBeTruthy();
  });

  describe('getCount()', () => {
    let service;
    beforeEach(() => {
      service = TestBed.get(ApplicationService);
    });

    it('retrieves the x-total-count header', async(() => {
      service.getCount().subscribe(num => {
        expect(num).toEqual(300);
      });
    }));
  });

  describe('getAll()', () => {
    let service;
    let apiService;

    const existingApplicationsData = [
      {
        _id: 'AAAA',
        status: 'ACCEPTED',
        description: 'Wonderful application',
        cl_file: null,
        businessUnit: null
      },
      {
        _id: 'BBBB',
        status: 'ABANDONED',
        description: 'Terrible application',
        cl_file: null,
        businessUnit: null
      }
    ];

    beforeEach(() => {
      service = TestBed.get(ApplicationService);
      apiService = TestBed.get(ApiService);

      apiService.getApplications.and.returnValue(of(existingApplicationsData));
    });

    describe('with no filters', () => {
      it('returns the applications', async(() => {
        service.getAll().subscribe(applications => {
          expect(applications[0]._id).toEqual('AAAA');
          expect(applications[1]._id).toEqual('BBBB');
        });
      }));
    });
  });

  describe('getById()', () => {
    let service;
    let apiService;

    const freshApplicationData = {
      _id: 'AAAA',
      status: 'ACCEPTED',
      description: 'Hot new application',
      cl_file: null,
      businessUnit: null
    };

    beforeEach(() => {
      service = TestBed.get(ApplicationService);
      apiService = TestBed.get(ApiService);
    });

    describe('when an application has been cached', () => {
      const cachedApplication = new Application({ _id: 'AAAA', description: 'Old outdated application' });
      beforeEach(() => {
        service.application = cachedApplication;

        apiService.getApplication.and.returnValue(of([freshApplicationData]));
      });

      describe('and forceReload is false', () => {
        it('returns the cached application', async(() => {
          service.getById('AAAA', false).subscribe(application => {
            expect(application._id).toEqual('AAAA');
            expect(application.description).toEqual('Old outdated application');
          });
        }));
      });

      describe('and forceReload is true', () => {
        it('calls the api for an application', async(() => {
          service.getById('AAAA', true).subscribe(application => {
            expect(application._id).toEqual('AAAA');
            expect(application.description).toEqual('Hot new application');
          });
        }));
      });
    });

    describe('when no application has been cached', () => {
      beforeEach(() => {
        service.application = null;

        apiService.getApplication.and.returnValue(of([freshApplicationData]));
      });

      it('calls the api for an application', async(() => {
        service.getById('AAAA', false).subscribe(application => {
          expect(application._id).toEqual('AAAA');
          expect(application.description).toEqual('Hot new application');
        });
      }));

      describe('application properties', () => {
        it('clFile property is padded to be seven digits', async(() => {
          const applicationData = { ...freshApplicationData, cl_file: 7777 };
          apiService.getApplication.and.returnValue(of([applicationData]));

          service.getById('AAAA').subscribe(application => {
            expect(application.clFile).toBe('0007777');
          });
        }));

        it('clFile property is null if there is no cl_file property', async(() => {
          service.getById('AAAA').subscribe(application => {
            expect(application.clFile).toBeUndefined();
          });
        }));
      });

      it('sets the documents to the result of the document service', async(() => {
        service.getById('AAAA').subscribe(application => {
          expect(application.documents).toBeDefined();
          expect(application.documents).not.toBeNull();
          expect(application.documents[0]._id).toBe('DDDDD');
          expect(application.documents[1]._id).toBe('EEEEE');
        });
      }));

      it('gets the commentPeriods for the application, sets the current period ', async(() => {
        service.getById('AAAA').subscribe(application => {
          expect(application.currentPeriod).toBeDefined();
          expect(application.currentPeriod).not.toBeNull();
          expect(application.currentPeriod._id).toBe('DDDDD');
        });
      }));

      it('sets the decisions to the result of the decisionService', async(() => {
        service.getById('AAAA').subscribe(application => {
          expect(application.decision).toBeDefined();
          expect(application.decision).not.toBeNull();
          expect(application.decision._id).toBe('IIIII');
        });
      }));

      it('sets the features to the result of the featureService', async(() => {
        service.getById('AAAA').subscribe(application => {
          expect(application.features).toBeDefined();
          expect(application.features).not.toBeNull();
          expect(application.features[0]._id).toBe('FFFFF');
          expect(application.features[1]._id).toBe('GGGGG');
        });
      }));
    });
  });

  describe('getStatusStringShort()', () => {
    let service;
    beforeEach(() => {
      service = TestBed.get(ApplicationService);
    });

    it('with invalid code it returns "Unknown"', () => {
      expect(service.getStatusStringShort('not a real code')).toBe('Unknown');
    });

    it('with status ABANDONED code it returns "Abandoned"', () => {
      expect(service.getStatusStringShort('ABANDONED')).toBe('Abandoned');
    });

    it('with status APPLICATION UNDER REVIEW code it returns "Under Review"', () => {
      expect(service.getStatusStringShort('APPLICATION UNDER REVIEW')).toBe('Under Review');
    });

    it('with status APPLICATION REVIEW COMPLETE code it returns "Decision Pending"', () => {
      expect(service.getStatusStringShort('APPLICATION REVIEW COMPLETE')).toBe('Decision Pending');
    });

    it('with status DECISION APPROVED code it returns "Approved"', () => {
      expect(service.getStatusStringShort('DECISION APPROVED')).toBe('Approved');
    });

    it('with status DECISION NOT APPROVED code it returns "Not Approved"', () => {
      expect(service.getStatusStringShort('DECISION NOT APPROVED')).toBe('Not Approved');
    });

    it('with status UNKNOWN it returns "Unknown"', () => {
      expect(service.getStatusStringShort('UNKNOWN')).toBe('Unknown');
    });
  });

  describe('getStatusStringLong()', () => {
    let service;
    let application;
    beforeEach(() => {
      service = TestBed.get(ApplicationService);
    });

    it('with invalid code it returns "Unknown Status"', () => {
      application = new Application({ status: 'not a real code' });
      expect(service.getStatusStringLong(application)).toBe('Unknown Status');
    });

    it('with status ABANDONED and reason AMENDMENT APPROVED - APPLICATION it returns "Decision: Approved ..."', () => {
      application = new Application({ status: 'ABANDONED', reason: 'AMENDMENT APPROVED - APPLICATION' });
      expect(service.getStatusStringLong(application)).toBe('Decision: Approved - Tenure Issued');
    });

    it('with status ABANDONED it returns "Abandoned"', () => {
      application = new Application({ status: 'ABANDONED' });
      expect(service.getStatusStringLong(application)).toBe('Abandoned');
    });

    it('with status APPLICATION UNDER REVIEW it returns "Application Under Review"', () => {
      application = new Application({ status: 'APPLICATION UNDER REVIEW' });
      expect(service.getStatusStringLong(application)).toBe('Application Under Review');
    });

    it('with status APPLICATION REVIEW COMPLETE it returns "Application Review Complete - Decision Pending"', () => {
      application = new Application({ status: 'APPLICATION REVIEW COMPLETE' });
      expect(service.getStatusStringLong(application)).toBe('Application Review Complete - Decision Pending');
    });

    it('with status DECISION APPROVED it returns "Decision: Approved - Tenure Issued"', () => {
      application = new Application({ status: 'DECISION APPROVED' });
      expect(service.getStatusStringLong(application)).toBe('Decision: Approved - Tenure Issued');
    });

    it('with status DECISION NOT APPROVED it returns "Decision: Not Approved"', () => {
      application = new Application({ status: 'DECISION NOT APPROVED' });
      expect(service.getStatusStringLong(application)).toBe('Decision: Not Approved');
    });

    it('with status UNKNOWN it returns "Unknown status"', () => {
      application = new Application({ status: 'UNKNOWN' });
      expect(service.getStatusStringLong(application)).toBe('Unknown Status');
    });
  });
});
