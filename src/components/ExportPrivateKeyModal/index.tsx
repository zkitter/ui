import React, {ReactElement} from "react";
import Modal, {ModalContent, ModalHeader} from "../Modal";
import {useSelectedLocalId} from "../../ducks/worker";
import QRCode from 'react-qr-code';

type Props = {
    onClose: () => void;
}

export default function ExportPrivateKeyModal(props: Props): ReactElement {
    const selected = useSelectedLocalId();

    return (
        <Modal
            className="w-96"
            onClose={props.onClose}
        >
            <ModalHeader onClose={props.onClose}>
                <b>{`Export Private Key`}</b>
            </ModalHeader>
            <ModalContent className="p-4 my-4">
                <QRCode className="my-0 mx-auto" value={JSON.stringify(selected)} />
            </ModalContent>
        </Modal>
    )
}