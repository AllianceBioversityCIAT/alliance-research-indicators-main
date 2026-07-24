export interface CetFormatted {
  date: string;
  time: string;
}

export type DateInput = string | Date | null | undefined;

export interface DateAndTime {
  date: Date;
  time: Date;
}
