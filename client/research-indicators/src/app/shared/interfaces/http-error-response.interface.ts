import { HttpErrorResponse } from '@angular/common/http';

export interface ConflictErrorDetail {
  description: string;
  status: number;
  errors: string;
  timestamp: string;
  path: string;
}

export interface ExtendedHttpErrorResponse extends HttpErrorResponse {
  successfulRequest: false;
  errorDetail: ConflictErrorDetail;
}
