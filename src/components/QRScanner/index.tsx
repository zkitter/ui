import React, { ReactElement, useCallback, useState } from 'react';
import QrReader from 'react-qr-reader';
import { Identity } from '../../serviceWorkers/identity';
import { addIdentity, selectIdentity, setIdentity } from '../../serviceWorkers/util';
import { postWorkerMessage } from '~/sw';

export default function QRScanner(props: { onSuccess?: () => void }): ReactElement {
  const [errorMessage, setErrorMessage] = useState('');
  const [scannedData, setScannedData] = useState('');

  const onScan = useCallback(async (data: string | null) => {
    if (!data) return;

    setScannedData(data);

    try {
      const identity: Identity = JSON.parse(data);
      if (identity.type === 'gun' && !identity.privateKey) return;
      if (identity.type === 'interrep' && !identity.serializedIdentity) return;
      await postWorkerMessage(setIdentity(identity));
      // await postWorkerMessage(selectIdentity(identity.publicKey));
      if (props.onSuccess) props.onSuccess();
    } catch (e) {
      setErrorMessage(e.message);
    }
  }, []);

  const onError = useCallback((err: string) => {
    setErrorMessage(err);
  }, []);

  return (
    <div className="qr-scanner">
      <div className="text-light text-center px-3 py-2 font-semibold">
        On desktop, you can export your private key to QR code by logging in and clicking "Export
        Private Key"
      </div>
      <QrReader delay={300} onScan={onScan} onError={onError} style={{ width: '100%' }} />
      {errorMessage && (
        <div className="error-message text-xs text-center text-red-500 m-2">{errorMessage}</div>
      )}
    </div>
  );
}
