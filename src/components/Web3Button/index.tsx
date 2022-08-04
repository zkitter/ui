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
    UserNotExistError, useWeb3Account, disconnectWeb3,
} from "../../ducks/web3";
import {useDispatch} from "react-redux";
import classNames from "classnames";
import Avatar, {Username} from "../Avatar";
import Icon from "../Icon";
import Menuable, {ItemProps} from "../Menuable";
import SpinnerGIF from "../../../static/icons/spinner.gif";
import MetamaskSVG from "../../../static/icons/metamask-fox.svg";
import ZKPRSVG from "../../../static/icons/zkpr-logo.svg";
import gun from "../../util/gun";
import {useHistory} from "react-router";
import {ellipsify, getHandle, getName, loginUser} from "../../util/user";
import {
    getZKGroupFromIdentity,
    useHasIdConnected,
    useIdentities,
    useSelectedLocalId,
    useSelectedZKGroup,
    useWorkerUnlocked
} from "../../ducks/worker";
import LoginModal from "../LoginModal";
import {fetchNameByAddress} from "../../util/web3";
import {useUser} from "../../ducks/users";
import {selectIdentity, setIdentity} from "../../serviceWorkers/util";
import {postWorkerMessage} from "../../util/sw";
import {Identity, InterrepIdentity, ZKPRIdentity} from "../../serviceWorkers/identity";
import QRScanner from "../QRScanner";
import Modal from "../Modal";
import ExportPrivateKeyModal from "../ExportPrivateKeyModal";
import config from "../../util/config";
import Nickname from "../Nickname";
import {
    connectZKPR,
    disconnectZKPR,
    maybeSetZKPRIdentity,
    useIdCommitment,
    useZKPR,
    useZKPRLoading
} from "../../ducks/zkpr";
import {checkPath} from "../../util/interrep";
import {generateECDHKeyPairFromhex, generateZkIdentityFromHex, sha256, sha512, signWithP256} from "../../util/crypto";
import webcrypto from "../../util/web_cryptography";

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
    const zkpr = useZKPR();
    const idCommitment = useIdCommitment();

    useEffect(() => {
        (async () => {
            if (!identities.length) {
                if (!account) return;
                setEnsName('');
                const ens = await fetchNameByAddress(account);
                setEnsName(ens);
            } else {
                let id = selectedLocalId || identities[0];

                if (id?.type !== 'zkpr_interrep') {
                    setEnsName('');
                    const ens = await fetchNameByAddress(id.address);
                    setEnsName(ens);
                }
            }
        })();
    }, [account, identities, selectedLocalId]);

    let btnContent;
    let id = selectedLocalId || identities[0];

    if (id) {
        if (id.type === 'zkpr_interrep') {
            btnContent = (
                <>
                    <div>Connected to ZKPR</div>
                    <Avatar className="ml-2" incognito />
                </>
            )
        }

        if (id.type ===  'interrep') {
            btnContent = (
                <>
                    <div>Incognito</div>
                    <Avatar className="ml-2" incognito />
                </>
            )
        }

        if (id.type === 'gun') {
            btnContent = (
                <>
                    <div><Username address={id?.address} /></div>
                    <Avatar className="ml-2 w-6 h-6" address={id?.address} />
                </>
            )
        }
    } else {
        // if (account) {
        //     btnContent = <div><Username address={account} /></div>;
        // } else if (zkpr) {
        //     btnContent = idCommitment
        //         ? <div><Username address={idCommitment} /></div>
        //         : <div>ZK Keeper</div>
        // } else {
        btnContent = <div>Add a user</div>;
        // }
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
                        'text-gray-100 bg-gray-800': ['interrep', 'zkpr_interrep'].includes(id?.type),
                        'bg-gray-100 pl-0 pr-4': !selectedLocalId && !identities.length,
                    }
                )}
                onClick={props.onClick}
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
                        "text-gray-500 hover:text-gray-800 mobile-hidden",
                        "transition-colors",
                    )}
                    fa="fas fa-ellipsis-h"
                />
                <Avatar
                    className={classNames(
                        "w-8 h-8 mx-1.5 mobile-only"
                    )}
                    address={selectedLocalId?.type === 'gun' ? selectedLocalId.address : ''}
                    incognito={['zkpr_interrep', 'interrep'].includes(selectedLocalId?.type)}
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
    const history = useHistory();

    const logout = useCallback(async () => {
        setOpened(false);

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

    if (selectedLocalId || identities.length) {
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

    items.push({
        label: 'Add a user',
        iconFA: 'fas fa-user-plus',
        onClick: () => {
            setOpened(false);
            history.push('/signup');
        },
    })

    items.push({
        label: 'Settings',
        iconFA: 'fas fa-cog',
        onClick: () => {
            setOpened(false);
            history.push('/settings');
        },
    })

    if (selectedLocalId) {
        items.push({
            label: 'Logout',
            iconFA: 'fas fa-sign-out-alt',
            onClick: logout,
        })
    }

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
    const idCommitment = useIdCommitment();
    const selected = useSelectedLocalId();
    const identities = useIdentities();
    const user = useUser(account);
    const dispatch = useDispatch();
    const history = useHistory();

    const gotoSignup = useCallback(async (e: any) => {
        e.stopPropagation();
        history.push('/signup');
        props.setOpened(false);
    }, []);

    const gotoZKSignup = useCallback(async (e: any) => {
        e.stopPropagation();

        if (idCommitment) {
            const id = await maybeSetZKPRIdentity(idCommitment);

            if (id) {
                return;
            }
        }

        history.push('/signup');
        props.setOpened(false);
    }, [idCommitment]);

    const disconnect = useCallback(() => {
        dispatch(disconnectZKPR());
        dispatch(disconnectWeb3());
        const [id] = identities;
        if (id) {
            postWorkerMessage(selectIdentity(id.type === 'gun' ? id.publicKey : id.identityCommitment));
        } else {
            postWorkerMessage(setIdentity(null));
        }
    }, [identities]);

    if (idCommitment) {
        return (
            <div
                className="wallet-menu-header__container"
                onClick={e => e.stopPropagation()}
            >
                <Icon fa="fas fa-user-secret" />
                <div className="wallet-menu-header__title">
                    <div>{ellipsify(idCommitment)}</div>
                </div>
                {
                    selected?.type !== 'zkpr_interrep' && (
                        <div className="wallet-menu-header__btn">
                            <Button onClick={gotoZKSignup}>
                                <Icon fa="fas fa-user-plus" />
                            </Button>
                        </div>
                    )
                }
                <div className="wallet-menu-header__btn">
                    <Button onClick={disconnect}>
                        <Icon fa="fas fa-sign-out-alt" />
                    </Button>
                </div>
            </div>
        )
    }

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
                    <div className="wallet-menu-header__btn">
                        <Button>
                            <Icon fa="fas fa-plug" />
                        </Button>
                    </div>
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
                    <Icon fa="fas fa-user-plus" />
                </Button>
            </div>
            <div className="wallet-menu-header__btn">
                <Button onClick={disconnect}>
                    <Icon fa="fas fa-sign-out-alt" />
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
                <CurrentUserItem
                    onShowExportPrivateKey={onShowExportPrivateKey}
                    closePopup={() => props.setOpened(false)}
                />
                {
                    !!availableIds.length && (
                        <div className="border-b w-full py-2 mb-2 local-users-menu__container">
                            {
                                availableIds.map(id => {
                                    return (
                                        <UserMenuItem
                                            key={id.type === 'gun' ? id.publicKey : id.identityCommitment}
                                            identity={id}
                                            openLogin={() => {
                                                openLogin(id);
                                                props.setOpened(false);
                                            }}
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
};

function CurrentUserItem(props: {
    onShowExportPrivateKey: () => void;
    closePopup: () => void;
}): ReactElement {
    const selectedLocalId = useSelectedLocalId();
    const selectedUser = useUser(selectedLocalId?.address);
    const group = useSelectedZKGroup();
    const history = useHistory();

    if (!selectedLocalId || !selectedUser) return <></>;

    const { ens, name, address } = selectedUser;

    const isInterep = ['interrep', 'zkpr_interrep'].includes(selectedLocalId.type);

    return (
        <div
            className={classNames(
                "local-users-menu__selected-item border-b",
            )}
        >
            <Avatar
                className="w-20 h-20 mb-2"
                address={selectedUser?.address}
                incognito={isInterep}
                group={group}
            />
            <Button
                className="my-2"
                btnType="secondary"
                onClick={() => {
                    history.push(`/${ens || address}`);
                    props.closePopup();
                }}
                small
            >
                View Profile
            </Button>
            <div className="flex flex-col flex-nowrap items-center w-full">
                <div className="text-base font-bold w-full truncate text-center">
                    <Nickname
                        className="justify-center"
                        address={isInterep ? '' : selectedUser?.address}
                        group={group}
                    />
                </div>
                <div className="text-sm">
                    {
                        selectedLocalId.type === 'zkpr_interrep'
                            ? <div className="text-xs py-1 px-2 rounded bg-gray-200 text-gray-600">EXTERNAL</div>
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
    const group = getZKGroupFromIdentity(identity);

    const isInterep = identity.type === 'interrep' || identity.type === 'zkpr_interrep';

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
                incognito={isInterep}
                group={group}
            />
            <div className="flex flex-col flex-nowrap w-0 flex-grow">
                <div className="text-sm font-bold truncate">
                    <Nickname
                        address={isInterep ? '' : user?.address}
                        group={group}
                        interepProvider={isInterep ? (identity as InterrepIdentity).provider : ''}
                        interepGroup={isInterep ? (identity as InterrepIdentity).name : ''}
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
    const { opened, setOpened } = props;
    const web3Unlocking = useWeb3Unlocking();
    const identities = useIdentities();
    const history = useHistory();

    if (web3Unlocking) {
        return <Icon url={SpinnerGIF} size={2} />;
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