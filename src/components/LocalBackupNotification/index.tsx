import React, {ReactElement, useCallback} from "react";
import NotificationBox from "../NotificationBox";
import Button from "../Button";
import {getIdentities, getIdentityStatus} from "../../serviceWorkers/util";
import {useHasLocal, useLoggedIn} from "../../ducks/web3";
import {useHistory} from "react-router";
import {postWorkerMessage} from "../../util/sw";
import {Identity} from "../../serviceWorkers/identity";

export default function LocalBackupNotification(): ReactElement {
    const loggedIn = useLoggedIn();
    const hasLocalBackup = useHasLocal();
    const history = useHistory();

    const onCreateLocalBackup = useCallback(async () => {
        const identities = await postWorkerMessage<Identity[]>(getIdentities());
        const {unlocked} = await postWorkerMessage<{unlocked: boolean}>(getIdentityStatus());

        if (!identities.length && !unlocked) {
            history.push('/create-local-backup');
        }
    }, []);

    if (!loggedIn || hasLocalBackup) return <></>;


    return (
        <NotificationBox className="text-center mb-2">
            You can store a secure backup of your identity locally - next time you login, you won't have to connect to your wallet and sign a message.
            <Button
                btnType="primary"
                className="p-2 mt-4 mx-auto"
                onClick={onCreateLocalBackup}
            >
                Make a local backup
            </Button>
        </NotificationBox>
    );
}