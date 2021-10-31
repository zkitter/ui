import React, {ReactElement, useCallback, useState} from "react";
import Modal, {ModalContent, ModalFooter, ModalHeader} from "../Modal";
import Input from "../Input";
import Button from "../Button";
import {postWorkerMessage} from "../../util/sw";
import {setPassphrase} from "../../serviceWorkers/util";

type Props = {
    onClose: () => void;
}

export default function LoginModal(props: Props): ReactElement {
    const [password, setPassword] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const onUnlock = useCallback(async () => {
        try {
            setErrorMessage('');
            await postWorkerMessage(setPassphrase(password));
            props.onClose();
        } catch (e) {
            setErrorMessage(e.message);
        }
    }, [password]);

    return (
        <Modal
            className="w-96"
            onClose={props.onClose}
        >
            <ModalHeader onClose={props.onClose}>
                <b>{`Unlock with password`}</b>
            </ModalHeader>
            <ModalContent className="p-4 my-4">
                <Input
                    className="border relative"
                    label="Enter password"
                    type="password"
                    value={password}
                    onChange={e => {
                        setPassword(e.target.value);
                    }}
                />
            </ModalContent>
            { errorMessage && <div className="error-message text-xs text-center text-red-500 m-2">{errorMessage}</div> }
            <ModalFooter>
                <Button
                    btnType="primary"
                    onClick={onUnlock}
                >
                    Unlock
                </Button>
            </ModalFooter>
        </Modal>
    )
}