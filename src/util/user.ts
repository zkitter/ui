import { getUser, resetUser, User } from '@ducks/users';
import { Identity } from '../serviceWorkers/identity';
import { authenticateGun } from './gun';
import { postWorkerMessage } from './sw';
import { selectIdentity } from '../serviceWorkers/util';
import store, { AppRootState } from '../store/configureAppStore';
import {
  generateECDHKeyPairFromhex,
  generateZkIdentityFromHex,
  sha256,
  signWithP256,
} from './crypto';
import { submitProfile } from '@ducks/drafts';
import { ProfileMessageSubType } from './message';

export const ellipsify = (str: string, start = 6, end = 4) => {
  return str.slice(0, start) + '...' + str.slice(-end);
};

export const getName = (user?: User | null, start = 6, end = 4): string => {
  if (!user) return '';
  if (!user.address) return '';
  if (user.name) return user.name;
  if (user.ens) return user.ens;
  return ellipsify(user.address, start, end);
};

export const getUsername = (user?: User | null): string => {
  if (!user) return '';
  if (!user.address) return '';
  if (user.ens) return user.ens;
  return user.address;
};

export const getHandle = (user?: User | null, start = 6, end = 4): string => {
  if (!user) return '';
  if (!user.address) return '';
  if (user.ens) return user.ens;
  if (user.address === '0x0000000000000000000000000000000000000000') return '';
  return ellipsify(user.address, start, end);
};

export async function loginUser(id: Identity | null) {
  if (id?.type === 'gun') {
    const decrypted: any = await postWorkerMessage(selectIdentity(id.publicKey));
    if (decrypted) {
      authenticateGun({
        pub: decrypted.publicKey,
        priv: decrypted.privateKey,
      });
    }
    await checkChat();
  }

  if (id?.type === 'interrep' || id?.type === 'taz') {
    await postWorkerMessage(selectIdentity(id.identityCommitment));
  }

  store.dispatch(resetUser());
}

async function checkChat() {
  const state: AppRootState = store.getState();
  const {
    worker: { selected },
    users: { map },
  } = state;

  if (selected?.type !== 'gun') return;

  let selectedUser = map[selected?.address];

  if (!selectedUser) {
    // @ts-ignore
    selectedUser = await store.dispatch(getUser(selected?.address));
  }

  (async () => {
    if (!selectedUser.ecdh) {
      const ecdhseed = await signWithP256(selected.privateKey, 'signing for ecdh - 0');
      const ecdhHex = await sha256(ecdhseed);
      const keyPair = await generateECDHKeyPairFromhex(ecdhHex);
      const ecdhPub = keyPair.pub;
      // @ts-ignore
      await store.dispatch(submitProfile(ProfileMessageSubType.Custom, ecdhPub, 'ecdh_pubkey'));
    }

    if (!selectedUser.idcommitment) {
      const zkseed = await signWithP256(selected.privateKey, 'signing for zk identity - 0');
      const zkHex = await sha256(zkseed);
      const zkIdentity = await generateZkIdentityFromHex(zkHex);
      const idcommitment = zkIdentity.genIdentityCommitment().toString(16);
      await store.dispatch(
        // @ts-ignore
        submitProfile(ProfileMessageSubType.Custom, idcommitment, 'id_commitment')
      );
    }
  })();
}
