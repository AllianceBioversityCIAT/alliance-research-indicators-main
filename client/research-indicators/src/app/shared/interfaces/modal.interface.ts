import { ContactPersonFormData } from './contact-person.interface';

export type ModalAction = () => void;

export type ModalActionWithData = (data: ContactPersonFormData) => void;

export type ModalDisabledAction = () => boolean;

export interface ModalData {
  contactPersonModalData?: ContactPersonFormData;
}
