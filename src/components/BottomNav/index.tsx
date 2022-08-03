import React, {ReactElement, useEffect, useState} from "react";
import "./bottom-nav.scss";
import Web3Button from "../Web3Button";
import {useHistory, useLocation} from "react-router";
import Icon from "../Icon";
import classNames from "classnames";
import {useAccount, useGunLoggedIn} from "../../ducks/web3";
import {useSelectedLocalId} from "../../ducks/worker";
import {fetchNameByAddress} from "../../util/web3";

export default function BottomNav(): ReactElement {
    const loggedIn = useGunLoggedIn();
    const account = useAccount();
    const selectedLocalId = useSelectedLocalId();
    const [ensName, setEnsName] = useState('');

    let address = '';

    if (loggedIn) {
        address = selectedLocalId?.address || account;
    }

    useEffect(() => {
        (async () => {
            const ens = await fetchNameByAddress(address);
            setEnsName(ens);
        })();
    }, [address]);

    return (
        <div className="bottom-nav">
            <BottomNavIcon fa="fas fa-home" pathname="/home" disabled={!loggedIn} />
            {/*<BottomNavIcon fa="fas fa-envelope" pathname={`/${ensName || address}/`} disabled={!loggedIn} />*/}
            <BottomNavIcon fa="fas fa-envelope" pathname={`/chat`} disabled={!selectedLocalId} />
            <BottomNavIcon fa="fas fa-globe-asia" pathname="/explore" />
            <Web3Button className="bottom-nav__web3-icon" />
        </div>
    )
}

type BottomNavIconProps = {
    fa: string;
    pathname: string;
    disabled?: boolean;
}

function BottomNavIcon(props: BottomNavIconProps): ReactElement {
    const history = useHistory();
    const {pathname} = useLocation();

    return (
        <Icon
            className={classNames(
                'flex', 'flex-row', 'items-center', 'justify-center',
                'bottom-nav__icon',
                {
                    'bottom-nav__icon--selected': pathname === props.pathname,
                    'bottom-nav__icon--disabled': props.disabled,
                }
            )}
            onClick={(pathname !== props.pathname && !props.disabled) ? () => history.push(props.pathname) : undefined}
            fa={props.fa}
            size={1.125}
        />
    )
}