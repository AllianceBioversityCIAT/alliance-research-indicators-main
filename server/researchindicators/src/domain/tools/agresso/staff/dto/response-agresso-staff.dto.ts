export class ResponseAgressoStaffDto<T> {
  public content: T;
  public pageNumber: number;
  public pageSize: number;
  public totalElements: number;
  public totalPages: number;
  public nextUrl: string;
  public prevUrl: string;
}
