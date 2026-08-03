import { UserCache } from '../../../../../interfaces/cache.interface';
import { GetMetadata } from '../../../../../interfaces/get-metadata.interface';

export interface AskForHelp {
  type: string;
  message: string;
  url: string;
  metadata: GetMetadata | null;
  userData: UserCache;
  currentResultId: number;
  currentRouteTitle: string;
  windowWidth: number;
  windowHeight: number;
  browserInfo: BrowserInfo;
}
export interface BrowserInfo {
  name: string;
  fullVersion: string;
  majorVersion: number;
}
