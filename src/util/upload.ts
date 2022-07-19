import {Dispatch} from "redux";
import {AppRootState} from "../store/configureAppStore";
import config from "./config";
import {signWithP256} from "./crypto";

export const ipfsUploadOne = (file: File) => async (
    dispatch: Dispatch,
    getState: () => AppRootState,
) => {
    const { worker: {selected}} = getState();

    if (selected?.type !== 'gun') {
        throw new Error('user is not authenticated');
    }

    const signature = signWithP256(selected.privateKey, selected.address) + '.' + selected.address;

    const data = new FormData();

    data.append('files', file);

    const res = await fetch(`${config.indexerAPI}/ipfs/upload`, {
        method: 'POST',
        body: data,
        headers: {
            'X-SIGNED-ADDRESS': signature,
        },
    });

    const json = await res.json();

    return json;
}