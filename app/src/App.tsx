import { useState } from "react";
import { CookiesProvider } from "react-cookie";
import { RestProvider } from "./hooks/rest";
import ImageUploader from "./components/file/upload";
import RoomSelector from "./components/room/selector";
import type { RoomInfo, AuthorInfo } from "./components/room/selector";
import { getEnv } from "./utils/env";

const apiUrl = getEnv("API_URL");

export default function App() {
	const [currentRoom, setCurrentRoom] = useState<RoomInfo | null>(null);
	const [currentAuthor, setCurrentAuthor] = useState<AuthorInfo | null>(null);

	const handleJoinRoom = (room: RoomInfo, author: AuthorInfo) => {
		setCurrentRoom(room);
		setCurrentAuthor(author);
	};

	const handleLeaveRoom = () => {
		setCurrentRoom(null);
		setCurrentAuthor(null);
	};

    return (
		<div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
			<CookiesProvider>
				<RestProvider
					url={apiUrl}
				>
					{!currentRoom ? (
						<RoomSelector onJoinRoom={handleJoinRoom} />
					) : (
						<div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
							<ImageUploader
								room={currentRoom}
								author={currentAuthor!}
								onLeaveRoom={handleLeaveRoom}
							/>
						</div>
					)}
				</RestProvider>
			</CookiesProvider>
		</div>
	)
}

