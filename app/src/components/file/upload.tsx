import { Button, Divider, Space, Tag, Typography } from "antd";
import { useEffect, useState } from "react";
import { FaUpload, FaArrowLeft } from "react-icons/fa";
import { useRest } from "../../hooks/rest";
import ImageViewer from "../viewers/image";
import CanvaSocket from "../viewers/socket/canva";
import type { RoomInfo, AuthorInfo } from "../room/selector";

const { Text } = Typography;

interface ImageUploaderProps {
    room: RoomInfo;
    author: AuthorInfo;
    onLeaveRoom: () => void;
}

export default function ImageUploader({ room, author, onLeaveRoom }: ImageUploaderProps) {

    const [file, setFile] = useState<File | null>(null);
    const [responseId, setResponseId] = useState<string>("");
    const [authorId, setAuthorId] = useState<string | null>(author.authorId);
    const [authorColor, setAuthorColor] = useState<string>("#888888");
    const [showUpload, setShowUpload] = useState(false);

    const { useQuery, post } = useRest();
    const { data, refetch } = useQuery<any>({
        queryKey: ["uploadImage"],
        queryFn: async () => {
            const formData = new FormData();
            if (file)
                formData.append('file', file);
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
        await refetch();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0] || null;
        setFile(selectedFile);
    };

    const handleHandshaked = (newAuthorId: string, color: string) => {
        setAuthorId(newAuthorId);
        setAuthorColor(color);
        sessionStorage.setItem(`authorId:${room.roomId}`, newAuthorId);
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Room header bar */}
            <div style={{ padding: '8px 16px', background: '#f0f2f5', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                <Button icon={<FaArrowLeft />} onClick={onLeaveRoom} size="small">
                    Rooms
                </Button>
                <Text strong>{room.roomName}</Text>
                <Text type="secondary" style={{ fontSize: 11 }}>ID: {room.roomId}</Text>
                {authorId && (
                    <Tag color={authorColor} style={{ color: '#fff' }}>
                        {author.authorName}
                    </Tag>
                )}
                <div style={{ flex: 1 }} />
                <Button
                    size="small"
                    icon={<FaUpload />}
                    onClick={() => setShowUpload(v => !v)}
                >
                    Upload image
                </Button>
            </div>

            {/* Collapsible upload panel */}
            {showUpload && (
                <div style={{ padding: '12px 16px', background: '#fafafa', borderBottom: '1px solid #e8e8e8', flexShrink: 0 }}>
                    <Space align="center">
                        <input
                            type="file"
                            accept=".tiff,.dcnm,.dcm,.svs,.dzi"
                            onChange={handleFileChange}
                        />
                        {file && (
                            <Button type="primary" size="small" onClick={upload}>
                                Upload
                            </Button>
                        )}
                        {responseId && (
                            <Text type="success" style={{ fontSize: 12 }}>
                                Uploaded: {responseId}
                            </Text>
                        )}
                    </Space>
                </div>
            )}

            {/* Image viewer fills remaining space */}
            <div style={{ flex: 1, overflow: 'hidden' }}>
                <ImageViewer imageId={room.imageId} canva={{
                    type: CanvaSocket,
                    props: {
                        roomId: room.roomId,
                        authorId,
                        authorName: author.authorName,
                        onHandshaked: handleHandshaked,
                    },
                }} />
            </div>
        </div>
    );
}

