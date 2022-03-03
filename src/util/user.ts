import {User} from "../ducks/users";
import {Identity} from "../serviceWorkers/identity";
import {authenticateGun} from "./gun";
import {postWorkerMessage} from "./sw";
import {addIdentity, selectIdentity, setIdentity} from "../serviceWorkers/util";

export const ellipsify = (str: string, start = 6, end = 4) => {
    return str.slice(0, start) + '...' + str.slice(-end);
}

export const getName = (user?: User | null, start = 6, end = 4): string => {
    if (!user) return '';
    if (!user.address) return '';
    if (user.name) return user.name;
    if (user.ens) return user.ens;
    return ellipsify(user.address, start, end);
}

export const getUsername = (user?: User | null): string => {
    if (!user) return '';
    if (!user.address) return '';
    if (user.ens) return user.ens;
    return user.address;
}

export const getHandle = (user?: User | null, start = 6, end = 4): string => {
    if (!user) return '';
    if (!user.address) return '';
    if (user.ens) return user.ens;
    if (user.address === '0x0000000000000000000000000000000000000000') return '';
    return ellipsify(user.address, start, end);
}

export async function loginUser(id: Identity | null) {
    if (id?.type === 'gun') {
        const decrypted: any = await postWorkerMessage(selectIdentity(id.publicKey));
        if (decrypted) {
            authenticateGun({
                pub: decrypted.publicKey,
                priv: decrypted.privateKey,
            });
        }
    }

    if (id?.type === 'interrep') {
        await postWorkerMessage(selectIdentity(id.identityCommitment));
    }
}