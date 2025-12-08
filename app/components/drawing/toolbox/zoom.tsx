import ToolBarController, { ToolBoxAction } from '@/types/drawing/toolbar';
import Fontisto from '@expo/vector-icons/Fontisto';
import ToolBoxButton from "./button";

export type ZoomToolBoxButtonProps = {
    controller: ToolBarController;
    action: ToolBoxAction;
}

export default function ZoomToolBoxButton(props: ZoomToolBoxButtonProps) {
    const { controller, action } = props;
    const selected = action === 'zoom';

    return (
        <ToolBoxButton
            selected={selected}
            icon={<Fontisto name="zoom" size={24} color={selected ? "white" : "#9ca3af"} />}
            onPress={() => {
                if(selected) {
                    controller.setAction('draw');
                } else {
                    controller.setAction("zoom");
                }
            }}
        />
    )
}