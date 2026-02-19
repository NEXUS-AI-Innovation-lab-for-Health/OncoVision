import { useRest } from "./rest";
import type { Patient } from "../types/patient";

export function usePatients() {
  const { get } = useRest();

  return useRest().useQuery<Patient[]>({
    queryKey: ["patients"],
    auth: false,
    queryFn: async (): Promise<Patient[] | null> => {
      // Fetch patients from backend API
      try {
        const result = await get<Patient[]>({ endpoint: "patients" }) as Patient[] | null;
        return result;
      } catch (error) {
        console.error("Error fetching patients:", error);
        return null;
      }
    },
  });
}