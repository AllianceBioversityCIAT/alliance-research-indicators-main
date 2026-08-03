export interface GeneralReportItem {
  Code: number;
  'Platform Code': string;
  Title: string;
  Projects: string;
  Indicator: string;
  Levers: string;
  'Live version': number;
  'Approved versions': number | null;
  Creator: string;
  'Main contact person': string | null;
  'Creation date': string;
  'Project title': string;
  'Project principal investigator': string;
  'Result desciption': string | null;
  Evidences: string | null;
  'Geographic scope': string;
  'Countries specified': string | null;
  'Regions specified': string | null;
  'Partners involved': string | null;
  'Were the trainees attending on behalf of an organization? (CapSha)': string | null;
  'Policy stage': string | null;
  'Policy type': string | null;
  'Innovation type': string | null;
  'Innovation nature': string | null;
  'Innovation readiness level': string | null;
  'Number people trained TOTAL': number | null;
  'Number people trained FEMALE': number | null;
  'Number people trained MALE': number | null;
  'Number people trained NON BINARY': number | null;
  'Length training': string | null;
  'Delivery modality': string | null;
  [key: string]: string | number | null;
}

