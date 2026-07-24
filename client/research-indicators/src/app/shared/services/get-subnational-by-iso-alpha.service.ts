import { inject, Injectable, signal, WritableSignal } from '@angular/core';
import { ApiService } from './api.service';
import { GetSubnationalsByIsoAlpha } from '../interfaces/get-subnationals-by-iso-alpha.interface';

@Injectable({
  providedIn: 'root'
})
export class GetSubnationalByIsoAlphaService {
  api = inject(ApiService);
  results: WritableSignal<GetSubnationalsByIsoAlpha[]> = signal([]);
  loading = signal(false);
  isOpenSearch = signal(false);

  getInstance = async (endpointParams: { isoAlpha2: string }): Promise<WritableSignal<GetSubnationalsByIsoAlpha[]>> => {
    const newSignal = signal<GetSubnationalsByIsoAlpha[]>([]);
    const response = await this.api.GET_SubNationals(endpointParams.isoAlpha2);
    response.data.forEach((item: GetSubnationalsByIsoAlpha) => {
      item.sub_national_id = item.id;
    });

    newSignal.set(response.data);

    return newSignal;
  };
}
