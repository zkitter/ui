import React, {ReactElement, useCallback, useEffect, useState} from "react";
import {generateECDHKeyPairFromhex, generateZkIdentityFromHex, sha256, signWithP256} from "../../util/crypto";
import {useSelectedLocalId} from "../../ducks/worker";
import {useDispatch} from "react-redux";
import {submitProfile} from "../../ducks/drafts";
import {ProfileMessageSubType} from "../../util/message";
import {useUser} from "../../ducks/users";
import ChatMenu from "../../components/ChatMenu";
import ChatContent from "../../components/ChatContent";
import "./chat-view.scss";
import {Route, Switch} from "react-router";
import {zkchat} from "../../ducks/chats";

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
                    zkchat.importIdentity({
                        address: selectedLocalId.address,
                        zk: zkIdentity,
                        ecdh: keyPair,
                    });
                } catch (e) {
                    console.error(e);
                }
            }
        })();

    }, [selectedLocalId, user]);

    return (
        <div className="chat-view">
            <Switch>
                <Route path="/chat/dm/:receiver/s/:senderECDH" component={ChatMenu} />
                <Route path="/chat/dm/:receiver" component={ChatMenu} />
                <Route component={ChatMenu} />
            </Switch>
            <Switch>
                <Route path="/chat/dm/:receiver/m/:messageId" component={ChatContent} />
                <Route path="/chat/dm/:receiver/s/:senderECDH" component={ChatContent} />
                <Route path="/chat/dm/:receiver" component={ChatContent} />
                <Route component={ChatContent} />
            </Switch>
        </div>
    );
}