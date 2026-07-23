export interface DateFormatJsonValue {
  locale: string;
  timezone: {
    iana: string;
    displayName: string;
    abbreviationMode: string;
  };
  date: {
    style: string;
    order: 'DMY' | 'MDY' | 'YMD';
    separator: string;
    twoDigitDay: boolean;
    twoDigitMonth: boolean;
    fourDigitYear: boolean;
    monthName: {
      enabled: boolean;
      format: 'long' | 'short';
      uppercase: boolean;
    };
  };
  time: {
    hour12: boolean;
    twoDigitMinute: boolean;
  };
  display: {
    order: string;
    separator: string;
    suffix: {
      enabled: boolean;
      style: string;
      fallback: string;
      wrap: 'PAREN' | 'NONE';
    };
  };
}

export interface DateFormatApiResponse {
  key: string;
  description?: string;
  simple_value: string | null;
  json_value: DateFormatJsonValue;
}
