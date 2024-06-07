import { Injectable, WritableSignal, inject } from '@angular/core';
import { ToPromiseService } from './to-promise.service';
import { LoginRes, MainResponse } from '../interfaces/responses.interface';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  TP = inject(ToPromiseService);

  cleanBody(body: any) {
    for (const key in body) {
      if (typeof body[key] === 'string') {
        body[key] = '';
      } else if (typeof body[key] === 'number') {
        body[key] = null;
      } else if (Array.isArray(body[key])) {
        body[key] = [];
      } else {
        body[key] = null;
      }
    }
  }

  updateSignalBody(body: WritableSignal<any>, newBody: any) {
    for (const key in newBody) {
      if (newBody[key] !== null) {
        body.update(prev => ({ ...prev, [key]: newBody[key] }));
      }
    }
  }

  login = (awsToken: string): Promise<MainResponse<LoginRes>> => {
    const url = () => `authorization/login`;
    console.log(awsToken);
    return this.TP.post(url(), {}, awsToken);
  };

  // // Overview - Summary
  // GET_SummaryTable = (): Promise<MainResponse<OverviewBody>> => {
  //   const url = () => `api/entity/${this.globalVars.currentInitiativeId()}/overview/summary`;
  //   return this.TP.get(url(), { flatten: true });
  // };

  // PATCH_SummaryTable = (body: OverviewBody): Promise<MainResponse<OverviewBody>> => {
  //   const url = () => `api/entity/${this.globalVars.currentInitiativeId()}/overview/summary/save`;
  //   return this.TP.patch(url(), body);
  // };
}
