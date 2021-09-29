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
    useWeb3Unlocking,
    useENSFetching,
    setGunPrivateKey,
    genENS, genSemaphore, setSemaphoreID, useSemaphoreID, setSemaphoreIDPath,
} from "../../ducks/web3";
import {useDispatch} from "react-redux";
import classNames from "classnames";
import Avatar from "../Avatar";
import Icon from "../Icon";
import Menuable from "../Menuable";
import ENSLogoSVG from "../../../static/icons/ens-logo.svg";
import TwitterLogoSVG from "../../../static/icons/twitter.svg";
import RedditLogoSVG from "../../../static/icons/reddit.svg";
import GithubLogoPNG from "../../../static/icons/github.png";
import SpinnerGIF from "../../../static/icons/spinner.gif";
import gun from "../../util/gun";

type Props = {
    onConnect?: () => Promise<void>;
    onDisconnect?: () => Promise<void>|void;
    onClick?: () => Promise<void>;
    className?: string;
}

export default function Web3Button(props: Props): ReactElement {
    const account = useAccount({ uppercase: true });
    const ensName = useENSName();
    const web3Loading = useWeb3Loading();
    const semaphoreId = useSemaphoreID();
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
                    props.className,
                )}
                onClick={connect}
                disabled={web3Loading}
            >
                Connect to a wallet
            </Button>
        );
    }

    let btnContent;

    if (semaphoreId.keypair.privKey) {
        btnContent = (
            <>
                <div>Incognito</div>
                <Avatar className="ml-2" incognito />
            </>
        )
    } else if (ensName) {
        btnContent = (
            <>
                <div>{ensName}</div>
                <Avatar className="ml-2" name={ensName} />
            </>
        )
    } else {
        btnContent = (
            <>
                <div>{`${account.slice(0, 6)}...${account.slice(-4)}`}</div>
                <Avatar className="ml-2" address={account} />
            </>
        )
    }

    return (
        <div
            className={classNames(
                "flex flex-row flex-nowrap items-center",
                "rounded-xl bg-gray-100",
                props.className,
            )}
        >
            <Web3ButtonAction {...props} />
            <Button
                className={classNames(
                    'text-black',
                    'bg-white',
                    'font-inter',
                    {
                        'text-gray-100 bg-gray-800': semaphoreId.keypair.privKey,
                    }
                )}
                onClick={props.onClick}
                disabled={web3Loading}
                loading={web3Loading}
            >
                {btnContent}
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

    const [opened, setOpened] = useState(false);

    const unlockENS = useCallback(async () => {
        await dispatch(genENS());
    }, []);

    const unlockSemaphore = useCallback(async (
        web2Provider: 'Twitter' | 'Github' | 'Reddit',
    ) => {
        await dispatch(genSemaphore(web2Provider));
    }, []);

    const lock = useCallback(async () => {
        gun.user().leave();
        await dispatch(setSemaphoreID({
            keypair: {
                pubKey: '',
                privKey: null,
            },
            commitment: null,
            identityNullifier: null,
            identityTrapdoor: null,
        }))
        await dispatch(setGunPrivateKey(''));
        await dispatch(setSemaphoreIDPath(null));
        setOpened(false);
    }, []);

    if (!loggedIn && !web3Loading) {
        if (!gunPair.priv) {
            return (
                <Menuable
                    menuClassName="web3-button__unlock-menu"
                    onOpen={() => setOpened(true)}
                    onClose={() => setOpened(false)}
                    items={[
                        {
                            label: 'ENS',
                            iconUrl: ensFetching ? SpinnerGIF : ENSLogoSVG,
                            onClick: unlockENS,
                            disabled: ensFetching || !ensName,
                        },
                        {
                            label: 'Incognito (Beta)',
                            iconFA: 'fas fa-user-secret',
                            children: [
                                {
                                    label: 'Twitter',
                                    iconUrl: TwitterLogoSVG,
                                    onClick: () => unlockSemaphore('Twitter'),
                                },
                                {
                                    label: 'Github',
                                    iconUrl: GithubLogoPNG,
                                    onClick: () => unlockSemaphore('Github'),
                                },
                                {
                                    label: 'Reddit',
                                    iconUrl: RedditLogoSVG,
                                    onClick: () => unlockSemaphore('Reddit'),
                                },
                            ],
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
                                : (
                                    <Icon
                                        className={classNames(
                                            "hover:text-green-500 transition-colors",
                                            {
                                                "text-green-500": opened,
                                            }
                                        )}
                                        fa={classNames({
                                            "fas fa-unlock": opened,
                                            "fas fa-lock": !opened,
                                        })}
                                    />
                                )
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
                    "transition-colors",
                    "web3-button__alt-action",
                )}
                onClick={lock}
            >
                <Icon
                    className={classNames(
                        "text-green-500 hover:text-red-500",
                        "transition-colors",
                    )}
                    fa="fas fa-unlock"
                />
            </div>
        );
    }

    return <></>;
}