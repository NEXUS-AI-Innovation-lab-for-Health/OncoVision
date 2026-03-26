import { useState } from "react";
import { Button, Input, List, Tag, Typography, Space, Divider, Card } from "antd";
import { FaPlus, FaSignInAlt } from "react-icons/fa";
import { useRest } from "../../hooks/rest";
import { useQuery } from "@tanstack/react-query";

const { Title, Text } = Typography;

export interface RoomInfo {
    roomId: string;
    roomName: string;
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

export default function RoomSelector({ onJoinRoom }: RoomSelectorProps) {
    const { get, post } = useRest();

    const [newRoomName, setNewRoomName] = useState("");
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
        if (!newRoomName.trim() || !authorName.trim()) return;

        const room = await post<RoomInfo>({
            endpoint: "draw/rooms",
            body: { name: newRoomName.trim() },
            auth: false,
        }) as RoomInfo;

        if (room && room.roomId) {
            setNewRoomName("");
            await refetch();
            const storedAuthorId = sessionStorage.getItem(`authorId:${room.roomId}`) || null;
            onJoinRoom(room, { authorId: storedAuthorId, authorName: authorName.trim() });
        }
    };

    const handleJoinRoom = async (room: RoomInfo) => {
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
        <div style={{ maxWidth: 600, margin: "40px auto", padding: "0 16px" }}>
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

            <Card style={{ marginBottom: 16 }}>
                <Title level={5}>Create a new room</Title>
                <Space>
                    <Input
                        placeholder="Room name"
                        value={newRoomName}
                        onChange={(e) => setNewRoomName(e.target.value)}
                        onPressEnter={handleCreateRoom}
                        style={{ width: 220 }}
                    />
                    <Button
                        type="primary"
                        icon={<FaPlus />}
                        onClick={handleCreateRoom}
                        disabled={!newRoomName.trim() || !authorName.trim()}
                    >
                        Create &amp; Join
                    </Button>
                </Space>
            </Card>

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
                        </List.Item>
                    )}
                />
            )}
        </div>
    );
}
