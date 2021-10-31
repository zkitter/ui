import React, {ReactElement, useCallback, useEffect, useState} from "react";
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
    loginGun, genSemaphore, setSemaphoreID, useSemaphoreID, setSemaphoreIDPath, useGunNonce, UserNotExistError,
} from "../../ducks/web3";
import {useDispatch} from "react-redux";
import classNames from "classnames";
import Avatar from "../Avatar";
import Icon from "../Icon";
import Menuable, {ItemProps} from "../Menuable";
import ENSLogoSVG from "../../../static/icons/ens-logo.svg";
import TwitterLogoSVG from "../../../static/icons/twitter.svg";
import RedditLogoSVG from "../../../static/icons/reddit.svg";
import GithubLogoPNG from "../../../static/icons/github.png";
import SpinnerGIF from "../../../static/icons/spinner.gif";
import gun from "../../util/gun";
import {useHistory} from "react-router";
import {ellipsify} from "../../util/user";
import {useIdentities, useSelectedLocalId, useWorkerUnlocked} from "../../ducks/worker";
import LoginModal from "../LoginModal";
import {fetchNameByAddress} from "../../util/web3";

type Props = {
    onConnect?: () => Promise<void>;
    onDisconnect?: () => Promise<void>|void;
    onClick?: () => Promise<void>;
    className?: string;
}

export default function Web3Button(props: Props): ReactElement {
    const account = useAccount({ uppercase: true });
    // const ensName = useENSName();
    const web3Loading = useWeb3Loading();
    const semaphoreId = useSemaphoreID();
    const dispatch = useDispatch();
    const ids = useIdentities();
    const selectedLocalId = useSelectedLocalId();
    const [ensName, setEnsName] = useState('');

    useEffect(() => {
        (async () => {
            const address = selectedLocalId?.address || account;
            const ens = await fetchNameByAddress(address);
            setEnsName(ens);
        })();
    }, [account, selectedLocalId]);

    const disconnect = useCallback(async () => {
        await dispatch(setWeb3(null, ''));
        return props.onDisconnect && props.onDisconnect();
    }, []);

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
    } else if (selectedLocalId) {
        btnContent = (
            <>
                <div>{ellipsify(selectedLocalId.address)}</div>
                <Avatar className="ml-2" address={selectedLocalId.address} />
            </>
        )
    } else if (account) {
        btnContent = (
            <>
                <div>{ellipsify(account)}</div>
                <Avatar className="ml-2" address={account} />
            </>
        )
    } else {
        btnContent = (
            <>
                <div>Connect to a wallet</div>
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
            <Web3ButtonLeft {...props} />
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

function Web3ButtonLeft(props: Props): ReactElement {
    const web3Loading = useWeb3Loading();
    const gunPair = useGunKey();
    const loggedIn = useLoggedIn();
    const dispatch = useDispatch();
    const [opened, setOpened] = useState(false);

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


    if (!loggedIn) {
        return (
            <UnauthButton
                {...props}
                opened={opened}
                setOpened={setOpened}
            />
        );
    }

    if (loggedIn || !gunPair.joinedTx) {
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

function UnauthButton(props: {
    onConnect?: () => Promise<void>;
    opened: boolean;
    setOpened: (opened: boolean) => void;
}): ReactElement {
    const { opened, setOpened } = props;
    const account = useAccount();
    const gunNonce = useGunNonce();
    const web3Loading = useWeb3Loading();
    const web3Unlocking = useWeb3Unlocking();
    const gunPair = useGunKey();
    const dispatch = useDispatch();
    const history = useHistory();
    const selectedLocalId = useSelectedLocalId();
    const [showingLogin, setShowingLogin] = useState(false);

    const connectWallet = useCallback(async () => {
        await dispatch(connectWeb3());
        return props.onConnect && props.onConnect();
    }, []);

    const genGunKey = useCallback(async () => {
        try {
            await dispatch(loginGun(gunNonce));
        } catch (e) {
            if (e === UserNotExistError) {
                history.push('/signup');
                setOpened(false);
            }
        }
    }, [gunNonce]);

    const gotoSignup = useCallback(async () => {
        history.push('/signup');
        setOpened(false);
    }, []);

    const unlockSemaphore = useCallback(async (
        web2Provider: 'Twitter' | 'Github' | 'Reddit',
    ) => {
        await dispatch(genSemaphore(web2Provider));
    }, []);

    let items: ItemProps[] = [];

    if (selectedLocalId) {
        items.push({
            label: 'Local Storage',
            iconFA: 'fas fa-folder',
            onClick: () => setShowingLogin(true),
        });
    }

    if (account) {
        items = items.concat([
            {
                label: 'Wallet',
                iconFA: 'fas fa-wallet',
                onClick: !gunPair.joinedTx ? gotoSignup : genGunKey,
                disabled: web3Loading,
            },
            {
                label: 'Incognito (Beta)',
                iconFA: 'fas fa-user-secret',
                disabled: web3Loading,
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
        ]);
    }

    if (!account && !selectedLocalId) {
        return (
            <div
                className={classNames(
                    "flex flex-row flex-nowrap items-center",
                    "web3-button__alt-action",
                )}
                onClick={connectWallet}
            >
                {
                    !web3Loading && (
                        <Icon
                            className={classNames(
                                "hover:text-green-500 transition-colors",
                            )}
                            fa="fas fa-plug"
                        />
                    )
                }
            </div>
        )
    }

    return (
        <>
            { showingLogin && (
                <LoginModal
                    onClose={() => {
                        setShowingLogin(false);
                        setOpened(false);
                    }}
                />
            )}
            <Menuable
                menuClassName="web3-button__unlock-menu"
                onOpen={() => setOpened(true)}
                onClose={() => setOpened(false)}
                opened={opened}
                items={items}
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
        </>
    );
}