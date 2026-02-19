export interface Patient {
  id: string;
  name: string;
  imageId?: string; // Associated image ID
  age?: number;
  gender?: string;
  diagnosis?: string;
  dateOfBirth?: string;
  lastVisit?: string;
  status?: string;
  medicalHistory?: string;
}