import { Select } from "antd";
import { usePatients } from "../hooks/usePatients";
import type { Patient } from "../types/patient";

interface PatientSelectorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
}

export function PatientSelector({ value, onChange, placeholder = "Sélectionner un patient" }: PatientSelectorProps) {
  const { data: patients, isLoading, error } = usePatients();

  if (error) {
    return <div>Erreur lors du chargement des patients</div>;
  }

  const options = patients?.map((patient: Patient) => ({
    value: patient.id,
    label: patient.name,
  })) || [];

  return (
    <div>
      <p style={{ marginBottom: 8 }}>Choisir le dossier du patient</p>
      <Select
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        loading={isLoading}
        options={options}
        style={{ width: 200 }}
      />
    </div>
  );
}