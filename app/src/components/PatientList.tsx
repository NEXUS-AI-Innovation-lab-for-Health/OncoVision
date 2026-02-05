import { Card, Table, Tag, Button, List, Space } from "antd";
import { useNavigate } from "react-router-dom";
import { usePatients } from "../hooks/usePatients";
import { getStatusColor } from "../utils/patient";
import type { Patient } from "../types/patient";
import { useState, useEffect } from "react";

export function PatientList() {
  const navigate = useNavigate();
  const { data: patients, isLoading } = usePatients();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  const renderMobileCard = (patient: Patient) => (
    <Card
      hoverable
      onClick={() => navigate(`/patient/${patient.id}`)}
      style={{ marginBottom: 12 }}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="small">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{ fontSize: 16 }}>{patient.name}</strong>
          <Tag color={getStatusColor(patient.status)}>{patient.status}</Tag>
        </div>
        <div style={{ color: '#666' }}>
          <div>{patient.age} ans • {patient.gender}</div>
          <div style={{ marginTop: 4 }}>{patient.diagnosis}</div>
          <div style={{ marginTop: 4, fontSize: 12 }}>
            Dernière visite: {patient.lastVisit ? new Date(patient.lastVisit).toLocaleDateString('fr-FR') : '-'}
          </div>
        </div>
      </Space>
    </Card>
  );

  return (
    <div style={{ 
      padding: isMobile ? "12px" : "24px", 
      minHeight: "100vh", 
      background: "#f0f2f5" 
    }}>
      <Card
        title={<h2 style={{ margin: 0, fontSize: isMobile ? 18 : 24 }}>Liste des Patients</h2>}
        style={{ 
          maxWidth: 1400, 
          margin: "0 auto"
        }}
      >
        {isMobile ? (
          <List
            loading={isLoading}
            dataSource={patients || []}
            renderItem={renderMobileCard}
          />
        ) : (
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
        )}
      </Card>
    </div>
  );
}
