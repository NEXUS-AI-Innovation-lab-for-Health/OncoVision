import { useState, useRef } from "react";
import { Select, Typography, Space, Button } from "antd";
import { FaArrowLeft } from "react-icons/fa";
import type { RoomInfo, AuthorInfo } from "./types";
import ImageViewer from "../viewers/image";
import CanvaSocket from "../viewers/socket/canva";

const { Title } = Typography;

export interface RoomSessionViewerProps {
    room: RoomInfo;
    author: AuthorInfo;
    onLeaveRoom: () => void;
}

export default function RoomSessionViewer({ room, author, onLeaveRoom }: RoomSessionViewerProps) {
    const [selectedImageId, setSelectedImageId] = useState<string>(room.imageIds[0] || "");
    const leaveRef = useRef<(() => Promise<void>) | null>(null);

    const handleLeave = async () => {
        if (leaveRef.current) {
            await leaveRef.current();
        }
        onLeaveRoom();
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '16px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff' }}>
                <Space>
                    <Button icon={<FaArrowLeft />} onClick={handleLeave}>
                        Quitter
                    </Button>
                    <Title level={4} style={{ margin: 0 }}>{room.roomName}</Title>
                </Space>
                <Space>
                    <span>Image :</span>
                    <Select
                        style={{ width: 200 }}
                        value={selectedImageId}
                        onChange={setSelectedImageId}
                        options={room.imageIds.map(id => ({ label: `Image ${id.slice(0, 8)}...`, value: id }))}
                    />
                </Space>
            </div>
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden', backgroundColor: '#f5f5f5' }}>
                <ImageViewer
                    key={selectedImageId}
                    imageId={selectedImageId}
                    canva={{
                        type: CanvaSocket,
                        props: {
                            roomId: room.roomId,
                            authorId: author.authorId,
                            authorName: author.name,
                            imageId: selectedImageId,
                            leaveRef: leaveRef,
                        }
                    }}
                />
            </div>
        </div>
    );
}