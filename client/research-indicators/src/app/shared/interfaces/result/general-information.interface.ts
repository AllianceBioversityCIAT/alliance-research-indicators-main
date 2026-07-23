export interface GeneralInformation {
  title: string;
  description: string;
  keywords: string[];
  user_id: string;
  year: string;
  main_contact_person: MainContractPerson;
}

interface MainContractPerson {
  user_id: string;
}
