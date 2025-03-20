export class GeoscopeDto {
  level: string;
  sub_list: string[] | null;
}

export class ResultDto {
  indicator: string;
  title: string;
  description: string;
  keywords: string[];
  geoscope: GeoscopeDto;
}

export class MsResponseIaRoarDto {
  data: {
    results: ResultDto[];
  };
  status: number;
  description: string;
  timestamp: string;
}
