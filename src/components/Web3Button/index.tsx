import React, {ReactElement, ReactNode, useCallback, useEffect, useState} from "react";
import "./web3-btn.scss";
import Button from "../Button";
import {
    setWeb3,
    connectWeb3,
    useAccount,
    useWeb3Loading,
    useGunKey,
    useLoggedIn,
    useWeb3Unlocking,
    setGunPrivateKey,
    loginGun,
    genSemaphore,
    setSemaphoreID,
    setSemaphoreIDPath,
    useGunNonce,
    UserNotExistError, useWeb3Account,
} from "../../ducks/web3";
import {useDispatch} from "react-redux";
import classNames from "classnames";
import Avatar, {Username} from "../Avatar";
import Icon from "../Icon";
import Menuable, {ItemProps} from "../Menuable";
import TwitterLogoSVG from "../../../static/icons/twitter.svg";
import SpinnerGIF from "../../../static/icons/spinner.gif";
import MetamaskSVG from "../../../static/icons/metamask-fox.svg";
import gun, {authenticateGun} from "../../util/gun";
import {useHistory} from "react-router";
import {ellipsify, getHandle, getName, loginUser} from "../../util/user";
import {useHasIdConnected, useIdentities, useSelectedLocalId, useWorkerUnlocked} from "../../ducks/worker";
import LoginModal from "../LoginModal";
import {fetchNameByAddress} from "../../util/web3";
import {useUser} from "../../ducks/users";
import {selectIdentity, setIdentity} from "../../serviceWorkers/util";
import {postWorkerMessage} from "../../util/sw";
import {Identity} from "../../serviceWorkers/identity";
import QRScanner from "../QRScanner";
import Modal from "../Modal";
import ExportPrivateKeyModal from "../ExportPrivateKeyModal";
import config from "../../util/config";
import {checkPath, getGroupName} from "../../util/interrep";
import Nickname from "../Nickname";

type Props = {
    onConnect?: () => Promise<void>;
    onDisconnect?: () => Promise<void>|void;
    onClick?: () => Promise<void>;
    className?: string;
}

export default function Web3Button(props: Props): ReactElement {
    const account = useAccount();
    const web3Loading = useWeb3Loading();
    const identities = useIdentities();
    const dispatch = useDispatch();
    const selectedLocalId = useSelectedLocalId();
    const [ensName, setEnsName] = useState('');

    useEffect(() => {
        (async () => {
            if (!identities.length) {
                if (!account) return;
                setEnsName('');
                const ens = await fetchNameByAddress(account);
                setEnsName(ens);
            } else {
                let id = selectedLocalId || identities[0];
                setEnsName('');
                const ens = await fetchNameByAddress(id.address);
                setEnsName(ens);
            }
        })();
    }, [account, identities, selectedLocalId]);

    let btnContent;
    let id = selectedLocalId || identities[0];

    if (id) {
        if (id?.type ===  'interrep') {
            btnContent = (
                <>
                    <div>Incognito</div>
                    <Avatar className="ml-2" incognito />
                </>
            )
        } else if (id) {
            btnContent = (
                <>
                    <div><Username address={id?.address} /></div>
                    <Avatar className="ml-2 w-6 h-6" address={id?.address} />
                </>
            )
        }
    } else {
        if (account) {
            btnContent = <div><Username address={account} /></div>;
        } else {
            btnContent = <div>Connect to a wallet</div>;
        }
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
                    'web3-button__content',
                    {
                        'text-gray-100 bg-gray-800': id?.type ===  'interrep',
                        'bg-gray-100 pl-0 pr-4': !selectedLocalId && !identities.length,
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
    const selectedLocalId = useSelectedLocalId();
    const [opened, setOpened] = useState(false);

    if (selectedLocalId) {
        return (
            <UserMenuable
                opened={opened}
                setOpened={setOpened}
            >
                <Icon
                    className={classNames(
                        "text-gray-500 hover:text-gray-800",
                        "transition-colors",
                    )}
                    fa="fas fa-ellipsis-h"
                />
            </UserMenuable>
        );
    }

    return (
        <UnauthButton
            {...props}
            opened={opened}
            setOpened={setOpened}
        />
    );
}


function UserMenuable(props: {
    onConnect?: () => Promise<void>;
    opened: boolean;
    setOpened: (opened: boolean) => void;
    children: ReactNode;
}): ReactElement {
    const { opened, setOpened } = props;
    const dispatch = useDispatch();
    const identities = useIdentities();
    const selectedLocalId = useSelectedLocalId();
    const [showingScanner, showScanner] = useState(false);

    const connectWallet = useCallback(async (e, reset) => {
        await dispatch(connectWeb3());
        reset();
        return props.onConnect && props.onConnect();
    }, []);

    const logout = useCallback(async () => {
        // @ts-ignore
        if (gun.user().is) {
            gun.user().leave();
        }

        await dispatch(setSemaphoreID({
            commitment: null,
            identityNullifier: null,
            identityTrapdoor: null,
        }))
        await dispatch(setGunPrivateKey(''));
        await dispatch(setSemaphoreIDPath(null));
        await postWorkerMessage(setIdentity(null));
        await fetch(`${config.indexerAPI}/oauth/reset`, {
            credentials: 'include',
        });
    }, []);

    let items: ItemProps[] = [];

    items.push({
        label: '',
        className: 'wallet-menu-header',
        children: [
            {
                label: 'Metamask',
                iconUrl: MetamaskSVG,
                onClick: connectWallet,
            },
        ],
        component: <WalletHeader setOpened={setOpened} />,
    });

    if (identities.length) {
        items.push({
            label: '',
            className: 'local-users-menu',
            component: (
                <UserMenu
                    setOpened={setOpened}
                />
            )
        });
    }

    if (selectedLocalId) {
        items.push({
            label: 'Logout',
            iconFA: 'fas fa-sign-out-alt',
            onClick: logout,
        })
    }

    // if (!account && !selectedLocalId && !identities.length) {
    //     return (
    //         <div
    //             className={classNames(
    //                 "flex flex-row flex-nowrap items-center",
    //                 "web3-button__alt-action",
    //             )}
    //             onClick={connectWallet}
    //         >
    //             {
    //                 !web3Loading && (
    //                     <Icon
    //                         className={classNames(
    //                             "hover:text-green-500 transition-colors",
    //                         )}
    //                         fa="fas fa-plug"
    //                     />
    //                 )
    //             }
    //         </div>
    //     )
    // }

    return (
        <>
            {
                showingScanner && (
                    <Modal onClose={() => showScanner(false)}>
                        <QRScanner onSuccess={() => showScanner(false)} />
                    </Modal>
                )
            }
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
                    { props.children }
                </div>
            </Menuable>
        </>
    );
}

function WalletHeader(props: {
    setOpened: (opened: boolean) => void;
}): ReactElement {
    const account = useWeb3Account();
    const user = useUser(account);
    const dispatch = useDispatch();
    const history = useHistory();

    const gotoSignup = useCallback(async (e) => {
        e.stopPropagation();
        history.push('/signup');
        props.setOpened(false);
    }, []);

    if (!user) {
        return (
            <div
                className="wallet-menu-header__container"
            >
                <Icon fa="fas fa-wallet" />
                <div className="wallet-menu-header__title">
                    Not connected
                </div>
                <div className="wallet-menu-header__btn">
                    <Button>
                        Connect wallet
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div
            className="wallet-menu-header__container"
            onClick={e => e.stopPropagation()}
        >
            <Icon fa="fas fa-wallet" />
            <div className="wallet-menu-header__title">
                <Username address={account} />
            </div>
            <div className="wallet-menu-header__btn">
                <Button onClick={gotoSignup}>
                    Add new user
                </Button>
            </div>
        </div>
    )
}

function UserMenu(props: {
    setOpened: (opened: boolean) => void;
}): ReactElement {
    const identities = useIdentities();
    const selectedLocalId = useSelectedLocalId();
    const unlocked = useWorkerUnlocked();
    const [showingLogin, setShowingLogin] = useState(false);
    const [showingExportPrivateKey, showExportPrivateKey] = useState(false);
    const [identity, setIdentity] = useState<Identity|null>(null);
    const selectedUser = useUser(selectedLocalId?.address);

    const openLogin = useCallback(async (id: Identity) => {
        if (unlocked) {
            await fetch(`${config.indexerAPI}/oauth/reset`, {
                credentials: 'include',
            });
            await loginUser(id);
            return;
        }
        setShowingLogin(true);
        setIdentity(id);
    }, [unlocked]);

    const onClose = useCallback(async () => {
        setShowingLogin(false);
        setIdentity(null);
    }, []);

    const onShowExportPrivateKey = useCallback(() => {
        showExportPrivateKey(true);
        setShowingLogin(true);
    }, []);

    const onSuccess = useCallback(async () => {
        if (showingExportPrivateKey) {
            return;
        }

        await fetch(`${config.indexerAPI}/oauth/reset`, {
            credentials: 'include',
        });

        await loginUser(identity);
        props.setOpened(false);
    }, [identity, showingExportPrivateKey]);

    const availableIds = identities.filter(id => {
        if (id.type === 'gun' && selectedLocalId?.type === 'gun') {
            return id.publicKey !== selectedLocalId?.publicKey;
        }

        if (id.type === 'interrep' && selectedLocalId?.type === 'interrep') {
            return id.identityCommitment !== selectedLocalId?.identityCommitment;
        }

        return id.type !== selectedLocalId?.type;
    })

    return (
        <>
            { showingLogin && <LoginModal onClose={onClose} onSuccess={onSuccess} /> }
            { !showingLogin && showingExportPrivateKey && (
                <ExportPrivateKeyModal onClose={() => showExportPrivateKey(false)} />
            )}
            <div className="flex flex-col flex-nowrap w-full">
                <CurrentUserItem onShowExportPrivateKey={onShowExportPrivateKey} />
                {
                    !!availableIds.length && (
                        <div className="border-b w-full py-2 mb-2 local-users-menu__container">
                            {
                                availableIds.map(id => {
                                    return (
                                        <UserMenuItem
                                            key={id.type === 'gun' ? id.publicKey : id.identityCommitment}
                                            identity={id}
                                            openLogin={() => openLogin(id)}
                                        />
                                    );
                                })
                            }
                        </div>
                    )
                }
            </div>
        </>
    )
}

function CurrentUserItem(props: {
    onShowExportPrivateKey: () => void;
}): ReactElement {
    const selectedLocalId = useSelectedLocalId();
    const selectedUser = useUser(selectedLocalId?.address);

    if (!selectedLocalId) return <></>;

    return (
        <div
            className={classNames(
                "local-users-menu__selected-item border-b",
            )}
        >
            <Avatar
                className="w-20 h-20 mb-2"
                address={selectedUser?.address}
                incognito={selectedLocalId.type === 'interrep'}
            />
            <Button
                className="my-2"
                btnType="secondary"
                onClick={props.onShowExportPrivateKey}
                small
            >
                Link Device
            </Button>
            <div className="flex flex-col flex-nowrap items-center w-full">
                <div className="text-base font-bold w-full truncate text-center">
                    <Nickname
                        className="justify-center"
                        address={selectedLocalId.type === 'interrep' ? '' : selectedUser?.address}
                        interepProvider={selectedLocalId.type === 'interrep' ? selectedLocalId.provider : ''}
                        interepGroup={selectedLocalId.type === 'interrep' ? selectedLocalId.name : ''}
                    />
                </div>
                <div className="text-sm">
                    {
                        selectedLocalId.type === 'interrep'
                            ? `@${getHandle(selectedUser)}`
                            : `@${getHandle(selectedUser)}`
                    }

                </div>
            </div>
        </div>
    )
}

function UserMenuItem(props: {
    identity: Identity;
    openLogin: () => void;
}) {
    const {identity, openLogin} = props;
    const user = useUser(identity.address);

    return (
        <div
            className={classNames(
                "flex flex-row flex-nowrap items-center",
                "hover:bg-gray-50 cursor-pointer",
                "local-users-menu__item",
            )}
            onClick={openLogin}
        >
            <Avatar
                className="w-9 h-9 mr-2"
                address={user?.username}
                incognito={identity.type === 'interrep'}
            />
            <div className="flex flex-col flex-nowrap w-0 flex-grow">
                <div className="text-sm font-bold truncate">
                    <Nickname
                        address={identity.type === 'interrep' ? '' : user?.address}
                        interepProvider={identity.type === 'interrep' ? identity.provider : ''}
                        interepGroup={identity.type === 'interrep' ? identity.name : ''}
                    />
                </div>
                <div className="text-xs text-gray-400">
                    {
                        identity.type === 'interrep'
                            ? `@${getHandle(user)}`
                            : `@${getHandle(user)}`
                    }
                </div>
            </div>
        </div>
    );
}

function UnauthButton(props: {
    onConnect?: () => Promise<void>;
    opened: boolean;
    setOpened: (opened: boolean) => void;
}): ReactElement {
    const { opened, setOpened, onConnect } = props;
    const account = useAccount();
    const web3Loading = useWeb3Loading();
    const web3Unlocking = useWeb3Unlocking();
    const dispatch = useDispatch();
    const selectedLocalId = useSelectedLocalId();
    const [showingScanner, showScanner] = useState(false);
    const identities = useIdentities();
    const history = useHistory();

    const connectWallet = useCallback(async (e, reset) => {
        setOpened(false);
        await dispatch(connectWeb3());
        history.push('/signup');
        return onConnect && onConnect();
    }, [setOpened, onConnect, opened]);

    if (web3Unlocking) {
        return <Icon url={SpinnerGIF} size={2} />;
    }

    if (!account && !identities.length) {
        return (
            <>
                <Menuable
                    opened={opened}
                    onOpen={() => setOpened(true)}
                    onClose={() => setOpened(false)}
                    className={classNames(
                        "flex flex-row flex-nowrap items-center",
                        "web3-button__alt-action",
                    )}
                    items={[
                        {
                            label: 'Metamask',
                            iconUrl: MetamaskSVG,
                            onClick: connectWallet,
                        },
                    ]}
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
                </Menuable>
            </>
        )
    }

    if (identities.length) {
        return (
            <UserMenuable
                opened={opened}
                setOpened={setOpened}
            >
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
            </UserMenuable>
        )
    }

    return (
        <div
            className={classNames(
                "flex flex-row flex-nowrap items-center",
                "web3-button__alt-action",
            )}
            onClick={() => history.push('/signup')}
        >
            <Icon
                className={classNames(
                    "hover:text-green-500 transition-colors",
                )}
                fa="fas fa-user-plus"
            />
        </div>
    );
}