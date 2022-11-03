import React, {ReactElement, useEffect, useState} from "react";
import classNames from "classnames";
import {useSelectedLocalId} from "../../ducks/worker";
import config from "../../util/config";
import {useHistory} from "react-router";
import {parseMessageId} from "../../util/message";

export default function NotificationView(): ReactElement {
    const selected = useSelectedLocalId();
    const history = useHistory();
    const [notifications, setNotifications] = useState([]);

    useEffect(() => {
        console.log('hi');
        (async function() {
            if (selected?.type === 'gun') {
                const resp = await fetch(`${config.indexerAPI}/v1/${selected.address}/notifications`);
                const json = await resp.json();
                console.log(json);
                setNotifications(json.payload);
            }
        })();
    }, [selected]);

    return (
        <div className={classNames('notifications', 'w-full')}>
            {
                notifications.map((data: any) => {
                    const {
                        message_id,
                        timestamp,
                        type,
                    } = data;
                    const { creator, hash } = parseMessageId(message_id);

                    switch (type) {
                        case 'DIRECT':
                            return (
                                <div>
                                    <div>
                                        <span>{data.creator || 'someone'} sent you a </span>
                                        <span onClick={() => history.push(`/chat/${message_id}`)}>
                                            message
                                        </span>
                                    </div>
                                </div>
                            )
                        case 'LIKE':
                            return (
                                <div>
                                    <div>
                                        <span>{data.creator} liked your </span>
                                        <span onClick={() => history.push(`/${creator}/status/${hash}`)}>
                                            post
                                        </span>
                                    </div>
                                </div>
                            );
                        case 'REPLY':
                            return (
                                <div>
                                    <div>
                                        <span>{data.creator} replied to your </span>
                                        <span onClick={() => history.push(`/${creator}/status/${hash}`)}>
                                            post
                                        </span>
                                    </div>
                                </div>
                            );
                        default:
                            return <div>{type}</div>;
                    }
                })
            }
        </div>
    );
}