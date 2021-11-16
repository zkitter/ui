import React, {ReactElement, useCallback, useState} from "react";
import QrReader from "react-qr-reader";
import {Identity} from "../../serviceWorkers/identity";
import {postWorkerMessage} from "../../util/sw";
import {addIdentity, selectIdentity} from "../../serviceWorkers/util";

export default function QRScanner(): ReactElement {
    const [errorMessage, setErrorMessage] = useState('');
    const onScan = useCallback(async (data) => {
        if (!data) return;

        try {
            const identity: Identity = JSON.parse(data);
            await postWorkerMessage(addIdentity(identity));
            await postWorkerMessage(selectIdentity(identity.publicKey));
        } catch (e) {
            setErrorMessage(e.message);
        }
    }, [])

    const onError = useCallback((err) => {
        setErrorMessage(err);
    }, [])

    return (
        <div className="qr-scanner">
            <div className="text-light text-center px-3 py-2 font-semibold">
                On desktop, you can export your private key to QR code by logging in and clicking "Export Private Key"
            </div>
            <QrReader
                delay={300}
                onScan={onScan}
                onError={onError}
                style={{ width: '100%' }}
            />
            { errorMessage && <div className="error-message text-xs text-center text-red-500 m-2">{errorMessage}</div> }
        </div>
    )
}