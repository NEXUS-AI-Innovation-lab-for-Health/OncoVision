import { useState } from "react";
import { TextInput } from "react-native";
import Labeler from "../ui/labeler";
import AuthForm from "./form";

export type AuthLoginProps = {

}

export default function AuthLogin(props: AuthLoginProps) {

    const [mail, setMail] = useState<string>("");
    const [password, setPassword] = useState<string>("");

    return (
        <AuthForm
            title="Connexion"
        >
            <Labeler
                title="Adresse e-mail"
            >
                <TextInput
                />
            </Labeler>
        </AuthForm>
    )
}