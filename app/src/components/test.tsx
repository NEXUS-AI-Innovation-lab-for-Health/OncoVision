import { useEffect, useState } from "react";
import type { AuthorInfo, RoomInfo } from "./room/types";
import { useRest } from "../lib";
import RoomSessionViewer from "./room/room-viewer";

export type CollaborativeAnnotationProps = {
    roomId: string;
};

export default function CollaborativeAnnotation(props: CollaborativeAnnotationProps) {

    const { roomId } = props;

    const [currentRoom, setCurrentRoom] = useState<RoomInfo | null>(null);
    const [currentAuthor, setCurrentAuthor] = useState<AuthorInfo | null>(null);

    const { get } = useRest();
    const [isLoading, setIsLoading] = useState<boolean>(false);

    useEffect(() => {
        const fetchRoom = async () => {
            setIsLoading(true);
            try {
                const response = await get<RoomInfo>({ endpoint: `room/rooms/${roomId}` });
                const room = response as RoomInfo;
                console.log("Room fetched:", room);
                if (!room || !room.roomId) {
                    console.error("Invalid room data received:", response);
                    return;
                }
                setCurrentRoom(room);

                // Todo: change this to the real user info once we have authentication
                const authorId = `user-${Math.random().toString(36).substr(2, 9)}`;
                setCurrentAuthor({
                    authorId,
                    name: "Utilisateur",
                    color: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`
                });
            } catch (error) {
                console.error("Error fetching room:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchRoom();
    }, [roomId]);

    return (
        <RoomSessionViewer
            room={currentRoom as RoomInfo}
            author={currentAuthor as AuthorInfo}
            onLeaveRoom={() => {
                setCurrentRoom(null);
                setCurrentAuthor(null);
            }}
        />
    )
}