import React, {ReactElement, useCallback, useEffect, useState} from "react";
import {generateECDHKeyPairFromhex, generateZkIdentityFromHex, sha256, signWithP256} from "../../util/crypto";
import {useSelectedLocalId} from "../../ducks/worker";
import Button from "../../components/Button";
import {useDispatch} from "react-redux";
import {submitProfile} from "../../ducks/drafts";
import {ProfileMessageSubType} from "../../util/message";
import {useUser} from "../../ducks/users";

export default function ChatView(): ReactElement {
    const selectedLocalId = useSelectedLocalId();
    const dispatch = useDispatch();
    const user = useUser(selectedLocalId?.address);
    const [idcommitment, setIdCommitment] = useState('');
    const [ecdhPub, setEcdhPub] = useState('');

    const onRegister = useCallback(async () => {
        await dispatch(submitProfile(ProfileMessageSubType.Custom, idcommitment, 'id_commitment'));
        await dispatch(submitProfile(ProfileMessageSubType.Custom, ecdhPub, 'ecdh_pubkey'));
    }, [idcommitment, ecdhPub]);

    useEffect(() => {
        (async () => {
            if (selectedLocalId?.type === 'gun') {
                const ecdhseed = await signWithP256(selectedLocalId.privateKey, 'signing for ecdh - 0');
                const zkseed = await signWithP256(selectedLocalId.privateKey, 'signing for zk identity - 0');
                const ecdhHex = await sha256(ecdhseed);
                const zkHex = await sha256(zkseed);

                try {
                    const keyPair = await generateECDHKeyPairFromhex(ecdhHex);
                    const zkIdentity = await generateZkIdentityFromHex(zkHex);
                    setEcdhPub(keyPair.pub);
                    setIdCommitment(zkIdentity.genIdentityCommitment().toString(16));
                } catch (e) {
                    console.error(e);
                }
            }
        })();

    }, [selectedLocalId, user]);

    return (
        <div className="chat-view">
            <div>{`id commitment: ${idcommitment}`}</div>
            <div>{`ecdh pub: ${ecdhPub}`}</div>
            <Button
                btnType="primary"
                onClick={onRegister}
                disabled={!!user?.ecdh && !!user?.idcommitment}
            >
                Register
            </Button>
        </div>
    );
}