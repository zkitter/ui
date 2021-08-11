import React, {ReactElement, useCallback, useState} from "react";
import "./web3-btn.scss";
import Button from "../Button";
import {
    setWeb3,
    connectWeb3,
    useAccount,
    useWeb3Loading,
    useENSName,
    useGunKey,
    useLoggedIn,
    unlockENS as _unlockENS, useWeb3Unlocking, useENSFetching, setGunPrivateKey,
} from "../../ducks/web3";
import {useDispatch} from "react-redux";
import classNames from "classnames";
import Avatar from "../Avatar";
import Icon from "../Icon";
import Menuable from "../Menuable";
import ENSLogoSVG from "../../../static/icons/ens-logo.svg";
import SpinnerGIF from "../../../static/icons/spinner.gif";

type Props = {
    onConnect?: () => Promise<void>;
    onDisconnect?: () => Promise<void>|void;
    onClick?: () => Promise<void>;
}

export default function Web3Button(props: Props): ReactElement {
    const account = useAccount({ uppercase: true });
    const ensName = useENSName();
    const web3Loading = useWeb3Loading();
    const web3Unlocking = useWeb3Unlocking();
    const ensFetching = useENSFetching();
    const loggedIn = useLoggedIn();
    const gunKeyPair = useGunKey();
    const dispatch = useDispatch();

    const disconnect = useCallback(async () => {
        await dispatch(setWeb3(null, ''));
        return props.onDisconnect && props.onDisconnect();
    }, []);

    const connect = useCallback(async () => {
        await dispatch(connectWeb3());
        return props.onConnect && props.onConnect();
    }, []);

    if (!account) {
        return (
            <Button
                className={classNames(
                    'font-semibold',
                    'web3-button',
                )}
                onClick={connect}
                disabled={web3Loading}
            >
                Connect to a wallet
            </Button>
        );
    }

    return (
        <div
            className={classNames(
                "flex flex-row flex-nowrap items-center",
                "rounded-xl bg-gray-100",
            )}
        >
            <Web3ButtonAction {...props} />
            <Button
                className={classNames(
                    'text-black',
                    'bg-white',
                    'font-inter',
                )}
                onClick={props.onClick}
                disabled={web3Loading}
                loading={web3Loading}
            >
                <div>{ensName ? ensName : `${account.slice(0, 6)}...${account.slice(-4)}`}</div>
                <Avatar className="ml-2" address={account} />
            </Button>
        </div>
    )
}

function Web3ButtonAction(props: Props): ReactElement {
    const account = useAccount({ uppercase: true });
    const ensName = useENSName();
    const web3Loading = useWeb3Loading();
    const web3Unlocking = useWeb3Unlocking();
    const ensFetching = useENSFetching();
    const gunPair = useGunKey();
    const loggedIn = useLoggedIn();
    const dispatch = useDispatch();

    const unlockENS = useCallback(async () => {
        await dispatch(_unlockENS());
    }, []);

    const lock = useCallback(async () => {
        await dispatch(setGunPrivateKey(''));
    }, []);

    if (!loggedIn && !web3Loading) {
        if (!gunPair.priv) {
            console.log(ensFetching);
            return (
                <Menuable
                    className="web3-button__unlock-menu"
                    items={[
                        {
                            label: 'ENS',
                            iconUrl: ensFetching ? SpinnerGIF : ENSLogoSVG,
                            onClick: unlockENS,
                            disabled: ensFetching,
                        },
                        {
                            label: 'Incognito',
                            iconFA: 'fas fa-user-secret',
                            onClick: () => null,
                        }
                    ]}
                >
                    <div
                        className={classNames(
                            "flex flex-row flex-nowrap items-center",
                            "web3-button__alt-action",
                        )}
                    >
                        {
                            web3Unlocking
                                ? <Icon url={SpinnerGIF} size={2} />
                                : <Icon fa="fas fa-lock" />
                        }
                    </div>
                </Menuable>
            )
        }
    }

    if (loggedIn) {
        return (
            <div
                className={classNames(
                    "flex flex-row flex-nowrap items-center",
                    "web3-button__alt-action",
                )}
                onClick={lock}
            >
                <Icon fa="fas fa-unlock" />
            </div>
        );
    }

    return <></>;
}