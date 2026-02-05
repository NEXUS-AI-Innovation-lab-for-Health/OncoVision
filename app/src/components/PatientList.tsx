import { Card, Table, Tag, Button } from "antd";
import { useNavigate } from "react-router-dom";
import { usePatients } from "../hooks/usePatients";
import { getStatusColor } from "../utils/patient";
import type { Patient } from "../types/patient";

export function PatientList() {
  const navigate = useNavigate();
  const { data: patients, isLoading } = usePatients();

  const columns = [
    {
      title: "Nom",
      dataIndex: "name",
      key: "name",
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: "Âge",
      dataIndex: "age",
      key: "age",
    },
    {
      title: "Genre",
      dataIndex: "gender",
      key: "gender",
    },
    {
      title: "Diagnostic",
      dataIndex: "diagnosis",
      key: "diagnosis",
    },
    {
      title: "Dernière visite",
      dataIndex: "lastVisit",
      key: "lastVisit",
      render: (date?: string) => date ? new Date(date).toLocaleDateString('fr-FR') : '-',
    },
    {
      title: "Statut",
      dataIndex: "status",
      key: "status",
      render: (status?: string) => (
        <Tag color={getStatusColor(status)}>{status || "-"}</Tag>
      ),
    },
    {
      title: "Action",
      key: "action",
      render: (_: unknown, record: Patient) => (
        <Button type="primary" onClick={() => navigate(`/patient/${record.id}`)}>
          Voir dossier
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: "24px", minHeight: "100vh", background: "#f0f2f5" }}>
      <Card
        title={<h2 style={{ margin: 0 }}>Liste des Patients</h2>}
        style={{ maxWidth: 1400, margin: "0 auto" }}
      >
        <Table
          columns={columns}
          dataSource={patients || []}
          loading={isLoading}
          rowKey="id"
          pagination={false}
          onRow={(record) => ({
            style: { cursor: "pointer" },
            onClick: () => navigate(`/patient/${record.id}`),
          })}
        />
      </Card>
    </div>
  );
}
