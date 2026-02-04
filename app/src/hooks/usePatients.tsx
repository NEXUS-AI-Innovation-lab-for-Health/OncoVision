import { useRest } from "./rest";
import type { Patient } from "../types/patient";

const fakePatients: Patient[] = [
  { id: "1", name: "Jean Dupont", imageId: "fcc3533fd3aa4035a0d90d366b27fbd7" },
  { id: "2", name: "Marie Curie", imageId: "8de7d1d1201a44ac84e54fcf11bfdf69" },
  { id: "3", name: "Pierre Curie", imageId: "01bb222741904390b641354994b2abdb" },
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