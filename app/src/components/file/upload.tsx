import { Button, Input, Divider } from "antd";
import { useEffect, useState } from "react";
import { FaUpload } from "react-icons/fa";
import { useRest } from "../../hooks/rest";
import ImageViewer from "../viewers/image";

export default function ImageUploader() {

    const [file, setFile] = useState<File | null>(null);
    const [previewId, setPreviewId] = useState<string>("");
    const [responseId, setResponseId] = useState<string>("");

    const { useQuery, post } = useRest();
    const { data, refetch } = useQuery<any>({
        queryKey: ["uploadImage"],
        queryFn: async () => {
            const formData = new FormData();
            if (file) 
                formData.append('file', file);
            console.log("FormData prepared:", formData);
            const response = await post<any>({
                endpoint: "viewer/images",
                body: formData,
            });
            return response;
        },
        enabled: false,
    });

    useEffect(() => {
        if (data && data["id"]) {
            setResponseId(data["id"]);
        }
    }, [data]);

    const upload = async () => {
        console.log("Uploading file...");
        await refetch();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0] || null;
        setFile(selectedFile);
        if (selectedFile) {
            console.log(`${selectedFile.name} file selected successfully`);
        }
    };

    return (
        <div>
            <input
                type="file"
                accept=".tiff,.dcnm,.dcm,.svs,.dzi"
                onChange={handleFileChange}
                style={{ display: 'block', marginBottom: 16 }}
            />
            {!file ? (
                <div>
                    <p className="ant-upload-drag-icon">
                        <FaUpload />
                    </p>
                    <p className="ant-upload-text">Select a file to upload</p>
                    <p className="ant-upload-hint">
                        Support for .tiff, .dicom, .svs, .dzi files.
                    </p>
                </div>
            ) : (
                <div>
                    <h3>Selected File:</h3>
                    <p>{file.name}</p>
                    {responseId && (
                        <p>Uploaded Image ID: {responseId}</p>
                    )}
                </div>
            )}
            {file && (
                <Button
                    type="primary"
                    style={{ marginTop: 16 }}
                    onClick={upload}
                >
                    Upload File
                </Button>
            )}

            <Divider />

            <div style={{ marginTop: '20px' }}>
                <h3>Aperçu Image Serveur</h3>
                <div style={{ marginBottom: '10px' }}>
                    <Input 
                        placeholder="ID de l'image" 
                        value={previewId} 
                        onChange={(e) => setPreviewId(e.target.value)}
                        style={{ width: '300px' }}
                    />
                </div>
                {previewId && (
                    <div style={{ width: '100%', height: '600px', border: '1px solid #333' }}>
                        <ImageViewer imageId={previewId} />
                    </div>
                )}
            </div>
        </div>
    );
}