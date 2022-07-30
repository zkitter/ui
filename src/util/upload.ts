import {AppRootState} from "../store/configureAppStore";
import config from "./config";
import {signWithP256} from "./crypto";
import {generateSemaphoreProof} from "./zk";
import {ThunkDispatch} from "redux-thunk";

export const ipfsUploadOne = (file: File) => async (
    dispatch: ThunkDispatch<any, any, any>,
    getState: () => AppRootState,
) => {
    const { worker: {selected}} = getState();

    let signature = '';
    let semaphore = '';

    if (selected?.type === 'gun') {
        signature = signWithP256(selected.privateKey, selected.address) + '.' + selected.address;
    } else {
        const fullProof = await dispatch(generateSemaphoreProof(
            'FILE_UPLOAD',
            file.name.slice(0, 16),
        ));
        semaphore = JSON.stringify(fullProof);
    }

    const data = new FormData();

    data.append('files', file);

    const res = await fetch(`${config.indexerAPI}/ipfs/upload`, {
        method: 'POST',
        body: data,
        headers: {
            'X-SIGNED-ADDRESS': signature,
            'X-SEMAPHORE-PROOF': semaphore,
        },
    });

    const json = await res.json();

    return json;
}