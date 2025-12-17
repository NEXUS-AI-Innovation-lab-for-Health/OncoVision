import { useRest } from "@/hooks/rest";
import { useEffect } from "react";

export type ImageSelectorProps = {

}

export default function ImageSelector(props: ImageSelectorProps) {

    const { useQuery, get } = useRest();
    const { data: images, isLoading } = useQuery({
        queryKey: ['images'],
        queryFn: async () => {
            const response = await get<{
                name: string;
                size: number;
                last_modified: string;
                preview: string;
            }[]>({
                endpoint: "files/list"
            });
            return response;
        }
    });

    useEffect(() => {
        console.log(images);
        console.log(isLoading);
    }, [images]);

    return (
        null
    )
}