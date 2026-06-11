import { Button, Space, Typography } from "antd";
import { useState } from "react";
import { FaUpload } from "react-icons/fa";
import { useRest } from "../../hooks/rest";

const { Text } = Typography;

export default function ImageUploader() {
    const [file, setFile] = useState<File | null>(null);
    const [responseId, setResponseId] = useState<string>("");
    const [isUploading, setIsUploading] = useState(false);

    const { post } = useRest();

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0] || null;
        setFile(selectedFile);
        setResponseId(""); // Reset response ID when a new file is selected
    };

    const handleUpload = async () => {
        if (!file) return;
        
        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            
            const response = await post<any>({
                endpoint: "viewer/images",
                body: formData,
            });
            
            if (response && response["id"]) {
                setResponseId(response["id"]);
            }
        } catch (error) {
            console.error("Erreur lors de l'upload :", error);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <Space direction="vertical" align="center" size="large">
                <input
                    type="file"
                    accept="image/*,.tiff,.dcnm,.dcm,.svs,.dzi"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                    id="image-upload-input"
                />
                <label htmlFor="image-upload-input">
                    <Button 
                        icon={<FaUpload />} 
                        size="large"
                        style={{ height: '48px', fontSize: '16px' }}
                    >
                        Sélectionner une image
                    </Button>
                </label>
                
                {file && (
                    <Space direction="vertical" align="center">
                        <Text type="secondary">Fichier sélectionné : {file.name}</Text>
                        <Button 
                            type="primary" 
                            onClick={handleUpload} 
                            loading={isUploading}
                        >
                            Uploader
                        </Button>
                    </Space>
                )}
                
                {responseId && (
                    <Text type="success" strong style={{ fontSize: 14, marginTop: 8 }}>
                        Image uploadée avec succès ! ID : {responseId}
                    </Text>
                )}
            </Space>
        </div>
    );
}

