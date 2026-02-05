import { useRest } from "./rest";
import type { Patient } from "../types/patient";

const fakePatients: Patient[] = [
  { 
    id: "1", 
    name: "Jean Dupont", 
    imageId: "fcc3533fd3aa4035a0d90d366b27fbd7",
    age: 58,
    gender: "Masculin",
    dateOfBirth: "1966-03-15",
    diagnosis: "Carcinome pulmonaire non à petites cellules",
    lastVisit: "2024-01-15",
    status: "En traitement",
    medicalHistory: "Antécédents de tabagisme. Diagnostic en 2023. Chimiothérapie en cours."
  },
  { 
    id: "2", 
    name: "Marie Curie", 
    imageId: "8de7d1d1201a44ac84e54fcf11bfdf69",
    age: 62,
    gender: "Féminin",
    dateOfBirth: "1962-11-07",
    diagnosis: "Cancer du sein triple négatif",
    lastVisit: "2024-01-20",
    status: "Rémission",
    medicalHistory: "Mastectomie partielle en 2022. Radiothérapie complétée. Suivi régulier."
  },
  { 
    id: "3", 
    name: "Pierre Curie", 
    imageId: "01bb222741904390b641354994b2abdb",
    age: 45,
    gender: "Masculin",
    dateOfBirth: "1979-05-22",
    diagnosis: "Mélanome de stade II",
    lastVisit: "2024-01-10",
    status: "Surveillance",
    medicalHistory: "Résection chirurgicale réussie. Biopsie du ganglion sentinelle négative."
  },
];

export function usePatients() {
  // const { get } = useRest();

  return useRest().useQuery<Patient[]>({
    queryKey: ["patients"],
    auth: false, // Disable auth for fake data
    queryFn: async (): Promise<Patient[] | null> => {
      // For now, return fake data since backend might not be ready
      return fakePatients;
      // Uncomment below when backend is ready
      // const result = await get<Patient[]>({ endpoint: "patients" }) as Patient[] | null;
      // return result;
    },
  });
}