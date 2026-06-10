import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CookiesProvider } from "react-cookie";
import { RestProvider, useRest } from "./hooks/rest";
import RoomSessionViewer from "./components/room/room-viewer";
import TestRoomCreator from "./components/test/room-creator";
import type { RoomInfo, AuthorInfo } from "./components/room/types";
import { getEnv } from "./utils/env";
import { Button, Input, Space, Typography, message } from "antd";

const { Title } = Typography;
const apiUrl = getEnv("API_URL");

function RoomJoiner() {
    const [roomId, setRoomId] = useState("");
    const [currentRoom, setCurrentRoom] = useState<RoomInfo | null>(null);
    const [currentAuthor, setCurrentAuthor] = useState<AuthorInfo | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { get } = useRest();

    const handleJoin = async () => {
        if (!roomId.trim()) {
            message.warning("Veuillez entrer un ID de room");
            return;
        }
        setIsLoading(true);
        try {
            const response = await get<RoomInfo>({ endpoint: `room/rooms/${roomId}` });
            const room = response as RoomInfo;
            console.log("Room fetched:", room);
            if (!room || !room.roomId) {
                message.error("Room introuvable (réponse vide ou invalide)");
                return;
            }
            setCurrentRoom(room);
            // Generate a mock author for now
            const authorId = `user-${Math.random().toString(36).substr(2, 9)}`;
            setCurrentAuthor({
                authorId,
                name: "Utilisateur",
                color: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`
            });
        } catch (error) {
            console.error("Error joining room:", error);
            message.error("Room introuvable ou erreur de connexion");
        } finally {
            setIsLoading(false);
        }
    };

    const handleLeaveRoom = () => {
        setCurrentRoom(null);
        setCurrentAuthor(null);
        setRoomId("");
    };

    if (currentRoom && currentAuthor) {
        return (
            <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
                <RoomSessionViewer
                    room={currentRoom}
                    author={currentAuthor}
                    onLeaveRoom={handleLeaveRoom}
                />
            </div>
        );
    }

    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
            <Title level={2}>Rejoindre une session</Title>
            <Space direction="vertical" style={{ width: '100%', maxWidth: '400px' }}>
                <Input 
                    placeholder="ID de la room (ex: 123e4567-e89b-12d3-a456-426614174000)" 
                    value={roomId} 
                    onChange={(e) => setRoomId(e.target.value)} 
                    onPressEnter={handleJoin}
                />
                <Button type="primary" onClick={handleJoin} loading={isLoading} block>
                    Rejoindre
                </Button>
            </Space>
        </div>
    );
}

export default function App() {
    return (
		<BrowserRouter>
			<CookiesProvider>
				<RestProvider url={apiUrl}>
					<Routes>
						<Route path="/" element={<RoomJoiner />} />
						<Route path="/test" element={<TestRoomCreator />} />
					</Routes>
				</RestProvider>
			</CookiesProvider>
		</BrowserRouter>
	)
}

