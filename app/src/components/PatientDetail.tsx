import { Card, Descriptions, Button, Tag, Divider } from "antd";
import { useNavigate, useParams } from "react-router-dom";
import { usePatients } from "../hooks/usePatients";
import ImageViewer from "./viewers/image";

export function PatientDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: patients } = usePatients();

  const patient = patients?.find((p) => p.id === id);

  if (!patient) {
    return (
      <div style={{ padding: "24px", minHeight: "100vh", background: "#f0f2f5" }}>
        <Card>
          <p>Patient non trouvé</p>
          <Button onClick={() => navigate("/")}>Retour à la liste</Button>
        </Card>
      </div>
    );
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "En traitement":
        return "processing";
      case "Rémission":
        return "success";
      case "Surveillance":
        return "warning";
      default:
        return "default";
    }
  };

  return (
    <div style={{ padding: "24px", minHeight: "100vh", background: "#f0f2f5" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <Button 
          onClick={() => navigate("/")} 
          style={{ marginBottom: 16 }}
        >
          ← Retour à la liste
        </Button>
        
        <Card
          title={<h2 style={{ margin: 0 }}>Dossier Patient: {patient.name}</h2>}
          extra={
            <Tag color={getStatusColor(patient.status)} style={{ fontSize: 14 }}>
              {patient.status}
            </Tag>
          }
        >
          <Descriptions bordered column={2}>
            <Descriptions.Item label="Nom">{patient.name}</Descriptions.Item>
            <Descriptions.Item label="Âge">{patient.age} ans</Descriptions.Item>
            <Descriptions.Item label="Genre">{patient.gender}</Descriptions.Item>
            <Descriptions.Item label="Date de naissance">
              {patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString('fr-FR') : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Diagnostic" span={2}>
              {patient.diagnosis}
            </Descriptions.Item>
            <Descriptions.Item label="Dernière visite">
              {patient.lastVisit ? new Date(patient.lastVisit).toLocaleDateString('fr-FR') : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="ID Image">
              {patient.imageId || "Non disponible"}
            </Descriptions.Item>
            <Descriptions.Item label="Historique médical" span={2}>
              {patient.medicalHistory || "Aucun historique disponible"}
            </Descriptions.Item>
          </Descriptions>

          {patient.imageId && (
            <>
              <Divider orientation="left">Imagerie Médicale</Divider>
              <div style={{ width: '100%', height: '600px', border: '1px solid #d9d9d9', borderRadius: 8, overflow: 'hidden' }}>
                <ImageViewer imageId={patient.imageId} />
              </div>
            </>
          )}

          {!patient.imageId && (
            <>
              <Divider orientation="left">Imagerie Médicale</Divider>
              <div style={{ 
                width: '100%', 
                height: '400px', 
                border: '2px dashed #d9d9d9', 
                borderRadius: 8, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: '#999'
              }}>
                <p>Aucune image disponible pour ce patient</p>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
