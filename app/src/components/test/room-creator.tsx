import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button, Typography, Space, Card, message, Upload, List } from "antd";
import { FaUpload, FaPlus, FaCheckCircle } from "react-icons/fa";
import { useRest } from "../../hooks/rest";

const { Title, Text } = Typography;

interface UploadedImage {
    id: string;
    name: string;
}

export default function TestRoomCreator() {
    const [files, setFiles] = useState<File[]>([]);
    const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [createdRoom, setCreatedRoom] = useState<any>(null);

    const { post } = useRest();

    const onDrop = useCallback((acceptedFiles: File[]) => {
        setFiles((prev) => [...prev, ...acceptedFiles]);
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

    const handleUploadAll = async () => {
        if (files.length === 0) return;
        setIsUploading(true);
        const newUploaded: UploadedImage[] = [];

        for (const file of files) {
            try {
                const formData = new FormData();
                formData.append("file", file);

                const response = await post<any>({
                    endpoint: "viewer/images/upload",
                    body: formData,
                });

                if (response && response.id) {
                    newUploaded.push({ id: response.id, name: file.name });
                }
            } catch (error) {
                console.error(`Erreur lors de l'upload de ${file.name}:`, error);
                message.error(`Échec de l'upload de ${file.name}`);
            }
        }

        setUploadedImages((prev) => [...prev, ...newUploaded]);
        setFiles([]);
        setIsUploading(false);
        message.success(`${newUploaded.length} image(s) uploadée(s) avec succès !`);
    };

    const handleCreateRoom = async () => {
        if (uploadedImages.length === 0) {
            message.warning("Veuillez d'abord uploader au moins une image.");
            return;
        }

        setIsCreating(true);
        try {
            const response = await post<any>({
                endpoint: "room/rooms",
                body: {
                    name: `Test Room ${new Date().toLocaleTimeString()}`,
                    image_ids: uploadedImages.map((img) => img.id),
                },
            });

            if (response && response.roomId) {
                setCreatedRoom(response);
                message.success("Room créée avec succès !");
            }
        } catch (error) {
            console.error("Erreur lors de la création de la room:", error);
            message.error("Échec de la création de la room.");
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div style={{ padding: "24px", maxWidth: "800px", margin: "0 auto" }}>
            <Title level={2}>Test: Création de Room avec Upload d'Images</Title>
            
            <Card title="1. Sélectionner des images" style={{ marginBottom: "24px" }}>
                <div
                    {...getRootProps()}
                    style={{
                        border: "2px dashed #d9d9d9",
                        borderRadius: "8px",
                        padding: "32px",
                        textAlign: "center",
                        cursor: "pointer",
                        backgroundColor: isDragActive ? "#f0f5ff" : "#fafafa",
                        transition: "all 0.3s",
                    }}
                >
                    <input {...getInputProps()} />
                    <FaUpload size={32} style={{ color: "#999", marginBottom: "16px" }} />
                    <Text>
                        {isDragActive
                            ? "Déposez les fichiers ici..."
                            : "Glissez-déposez des images ici, ou cliquez pour sélectionner"}
                    </Text>
                </div>

                {files.length > 0 && (
                    <Space direction="vertical" style={{ width: "100%", marginTop: "16px" }}>
                        <Text strong>Fichiers en attente ({files.length}):</Text>
                        <List
                            size="small"
                            dataSource={files}
                            renderItem={(file) => <List.Item>{file.name}</List.Item>}
                        />
                        <Button
                            type="primary"
                            icon={<FaUpload />}
                            onClick={handleUploadAll}
                            loading={isUploading}
                            block
                        >
                            Uploader les fichiers
                        </Button>
                    </Space>
                )}
            </Card>

            <Card title="2. Images uploadées" style={{ marginBottom: "24px" }}>
                {uploadedImages.length === 0 ? (
                    <Text type="secondary">Aucune image uploadée pour le moment.</Text>
                ) : (
                    <Space direction="vertical" style={{ width: "100%" }}>
                        <List
                            dataSource={uploadedImages}
                            renderItem={(img) => (
                                <List.Item>
                                    <Space>
                                        <FaCheckCircle style={{ color: "#52c41a" }} />
                                        <Text>{img.name}</Text>
                                        <Text type="secondary" style={{ fontSize: "12px" }}>
                                            (ID: {img.id})
                                        </Text>
                                    </Space>
                                </List.Item>
                            )}
                        />
                        <Button
                            type="primary"
                            icon={<FaPlus />}
                            onClick={handleCreateRoom}
                            loading={isCreating}
                            block
                            size="large"
                        >
                            Créer une Room avec ces {uploadedImages.length} image(s)
                        </Button>
                    </Space>
                )}
            </Card>

            {createdRoom && (
                <Card title="3. Room Créée" type="inner" style={{ backgroundColor: "#f6ffed", borderColor: "#b7eb8f" }}>
                    <Space direction="vertical" style={{ width: "100%" }}>
                        <Text strong>Room ID: {createdRoom.roomId}</Text>
                        <Text>Room Name: {createdRoom.roomName}</Text>
                        <Text>Image IDs: {createdRoom.imageIds.join(", ")}</Text>
                        <Text type="success">
                            Vous pouvez maintenant utiliser cet ID pour tester la connexion WebSocket ou intégrer ce composant dans votre flux principal.
                        </Text>
                    </Space>
                </Card>
            )}
        </div>
    );
}