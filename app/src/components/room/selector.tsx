import { useEffect, useRef, useState } from "react";
import { Button, Input, List, Tag, Typography, Space, Divider, Card, Modal } from "antd";
import { FaPlus, FaSignInAlt } from "react-icons/fa";
import { useRest } from "../../hooks/rest";
import { useQuery } from "@tanstack/react-query";
import ImagePicker from "./image-picker";

const { Title, Text } = Typography;

export interface RoomInfo {
    roomId: string;
    roomName: string;
    imageId: string;
    participantCount: number;
    participants: Array<{ authorId: string; name: string; color: string }>;
}

export interface AuthorInfo {
    authorId: string | null;
    authorName: string;
}

interface RoomSelectorProps {
    onJoinRoom: (room: RoomInfo, author: AuthorInfo) => void;
}

/** Small inline thumbnail shown in the room list */
function RoomThumb({ imageId, get }: { imageId: string; get: ReturnType<typeof useRest>["get"] }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const W = 60, H = 40;

    useEffect(() => {
        let cancelled = false;
        get({ endpoint: `viewer/images/${imageId}/level/0.webp`, blob: true, auth: false })
            .then((blob) => {
                if (cancelled || !(blob instanceof Blob)) return;
                const url = URL.createObjectURL(blob);
                const img = new Image();
                img.onload = () => {
                    if (cancelled) { URL.revokeObjectURL(url); return; }
                    const canvas = canvasRef.current;
                    const ctx = canvas?.getContext("2d");
                    if (!ctx || !canvas) return;
                    const scale = Math.min(W / img.naturalWidth, H / img.naturalHeight);
                    const dw = img.naturalWidth * scale;
                    const dh = img.naturalHeight * scale;
                    ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
                    URL.revokeObjectURL(url);
                };
                img.onerror = () => URL.revokeObjectURL(url);
                img.src = url;
            })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [imageId]);

    return (
        <canvas
            ref={canvasRef}
            width={W}
            height={H}
            style={{ borderRadius: 4, background: "#f0f0f0", flexShrink: 0 }}
        />
    );
}

export default function RoomSelector({ onJoinRoom }: RoomSelectorProps) {
    const { get, post } = useRest();

    const [createOpen, setCreateOpen] = useState(false);
    const [newRoomName, setNewRoomName] = useState("");
    const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
    const [joinRoomId, setJoinRoomId] = useState("");
    const [authorName, setAuthorName] = useState(() => {
        return sessionStorage.getItem("authorName") || "";
    });

    const { data: rooms = [], refetch } = useQuery<RoomInfo[]>({
        queryKey: ["rooms"],
        queryFn: async () => {
            const result = await get<RoomInfo[]>({ endpoint: "draw/rooms", auth: false });
            return (result as RoomInfo[]) ?? [];
        },
        refetchInterval: 5000,
    });

    const saveAuthorName = (name: string) => {
        setAuthorName(name);
        sessionStorage.setItem("authorName", name);
    };

    const handleCreateRoom = async () => {
        if (!newRoomName.trim() || !authorName.trim() || !selectedImageId) return;

        const room = await post<RoomInfo>({
            endpoint: "draw/rooms",
            body: { name: newRoomName.trim(), imageId: selectedImageId },
            auth: false,
        }) as RoomInfo;

        if (room && room.roomId) {
            setNewRoomName("");
            setSelectedImageId(null);
            setCreateOpen(false);
            await refetch();
            const storedAuthorId = sessionStorage.getItem(`authorId:${room.roomId}`) || null;
            onJoinRoom(room, { authorId: storedAuthorId, authorName: authorName.trim() });
        }
    };

    const handleJoinRoom = (room: RoomInfo) => {
        if (!authorName.trim()) return;
        const storedAuthorId = sessionStorage.getItem(`authorId:${room.roomId}`) || null;
        onJoinRoom(room, { authorId: storedAuthorId, authorName: authorName.trim() });
    };

    const handleJoinById = async () => {
        if (!joinRoomId.trim() || !authorName.trim()) return;
        const result = await get<RoomInfo>({
            endpoint: `draw/rooms/${joinRoomId.trim()}`,
            auth: false,
        }) as RoomInfo;
        if (result && result.roomId) {
            const storedAuthorId = sessionStorage.getItem(`authorId:${result.roomId}`) || null;
            onJoinRoom(result, { authorId: storedAuthorId, authorName: authorName.trim() });
        }
    };

    return (
        <div style={{ maxWidth: 700, margin: "40px auto", padding: "0 16px" }}>
            <Title level={2}>Collaborative Drawing Rooms</Title>

            <Card style={{ marginBottom: 16 }}>
                <Title level={5}>Your name</Title>
                <Input
                    placeholder="Enter your name"
                    value={authorName}
                    onChange={(e) => saveAuthorName(e.target.value)}
                    style={{ maxWidth: 300 }}
                />
            </Card>

            <Space style={{ marginBottom: 16 }}>
                <Button
                    type="primary"
                    icon={<FaPlus />}
                    onClick={() => setCreateOpen(true)}
                    disabled={!authorName.trim()}
                >
                    Create a room
                </Button>
            </Space>

            <Modal
                title="Create a new room"
                open={createOpen}
                onCancel={() => { setCreateOpen(false); setSelectedImageId(null); }}
                onOk={handleCreateRoom}
                okText="Create & Join"
                okButtonProps={{ disabled: !newRoomName.trim() || !selectedImageId }}
                width={700}
            >
                <Space direction="vertical" style={{ width: "100%" }}>
                    <div>
                        <Text strong>Room name</Text>
                        <Input
                            placeholder="Room name"
                            value={newRoomName}
                            onChange={(e) => setNewRoomName(e.target.value)}
                            style={{ marginTop: 4 }}
                        />
                    </div>
                    <div>
                        <Text strong>Select an image</Text>
                        <div style={{ marginTop: 8 }}>
                            <ImagePicker value={selectedImageId} onChange={setSelectedImageId} />
                        </div>
                    </div>
                </Space>
            </Modal>

            <Card style={{ marginBottom: 16 }}>
                <Title level={5}>Join by room ID</Title>
                <Space>
                    <Input
                        placeholder="Room UUID"
                        value={joinRoomId}
                        onChange={(e) => setJoinRoomId(e.target.value)}
                        onPressEnter={handleJoinById}
                        style={{ width: 300 }}
                    />
                    <Button
                        icon={<FaSignInAlt />}
                        onClick={handleJoinById}
                        disabled={!joinRoomId.trim() || !authorName.trim()}
                    >
                        Join
                    </Button>
                </Space>
            </Card>

            <Divider>Available Rooms</Divider>

            {rooms.length === 0 ? (
                <Text type="secondary">No rooms available. Create one to get started.</Text>
            ) : (
                <List
                    dataSource={rooms}
                    renderItem={(room) => (
                        <List.Item
                            key={room.roomId}
                            actions={[
                                <Button
                                    type="primary"
                                    icon={<FaSignInAlt />}
                                    onClick={() => handleJoinRoom(room)}
                                    disabled={!authorName.trim()}
                                    key="join"
                                >
                                    Join
                                </Button>,
                            ]}
                        >
                            <Space align="start" size={12}>
                                <RoomThumb imageId={room.imageId} get={get} />
                                <List.Item.Meta
                                    title={room.roomName}
                                    description={
                                        <Space direction="vertical" size={2}>
                                            <Text type="secondary" style={{ fontSize: 11 }}>
                                                ID: {room.roomId}
                                            </Text>
                                            <Space>
                                                <Tag color="blue">
                                                    {room.participantCount} online
                                                </Tag>
                                                {room.participants.map((p) => (
                                                    <Tag
                                                        key={p.authorId}
                                                        color={p.color}
                                                        style={{ color: "#fff" }}
                                                    >
                                                        {p.name}
                                                    </Tag>
                                                ))}
                                            </Space>
                                        </Space>
                                    }
                                />
                            </Space>
                        </List.Item>
                    )}
                />
            )}
        </div>
    );
}

