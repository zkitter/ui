import React, {MouseEventHandler, ReactElement, ReactNode, useCallback, useEffect, useState} from "react";
import "./signup.scss"
import Button from "../../components/Button";
import {
    connectWeb3,
    createRecordTx, disconnectWeb3,
    loginGun, setJoinedTx,
    updateIdentity,
    useAccount,
    useGunNonce,
    usePendingCreateTx, useWeb3Account, useWeb3Loading
} from "../../ducks/web3";
import {useDispatch} from "react-redux";
import config from "../../util/config";
import {getIdentityHash, watchTx} from "../../util/arb3";
import {setUser, useUser, watchUser} from "../../ducks/users";
import Input from "../../components/Input";
import Textarea from "../../components/Textarea";
import {CoverImageEditor, ProfileImageEditor} from "../ProfileView";
import {submitProfile} from "../../ducks/drafts";
import {ProfileMessageSubType} from "../../util/message";
import {useHistory} from "react-router";
import deepEqual from "fast-deep-equal";
import {addIdentity, setIdentity, setPassphrase} from "../../serviceWorkers/util";
import {postWorkerMessage} from "../../util/sw";
import {useIdentities, useSelectedLocalId, useWorkerUnlocked} from "../../ducks/worker";
import Icon from "../../components/Icon";
import classNames from "classnames";
import {connectZKPR, disconnectZKPR, useIdCommitment, useZKPR, useZKPRLoading} from "../../ducks/zkpr";

import MetamaskSVG from "../../../static/icons/metamask-fox.svg";
import ZKPRSVG from "../../../static/icons/zkpr-logo.svg";
import SpinnerGIF from "../../../static/icons/spinner.gif";
import Avatar, {Username} from "../../components/Avatar";

export enum ViewType {
    welcome,
    chooseWallet,
    createIdentity,
    accountOptions,
    updateTx,
    setupProfile,
    localBackup,
    done,
}

type Props = {
    viewType?: ViewType;
}

export default function SignupView(props: Props): ReactElement {
    const [viewType, setViewType] = useState<ViewType>(props.viewType || ViewType.chooseWallet);
    let content;

    switch (viewType) {
        case ViewType.welcome:
            content = <WelcomeView setViewType={setViewType} />;
            break;
        case ViewType.chooseWallet:
            content = <ChooseWalletView setViewType={setViewType} />;
            break;
        case ViewType.createIdentity:
            content = <CreateIdentityView setViewType={setViewType} />;
            break;
        case ViewType.accountOptions:
            content = <AccountOptionsView setViewType={setViewType} />;
            break;
        case ViewType.updateTx:
            content = <UpdateTxView setViewType={setViewType} />;
            break;
        case ViewType.setupProfile:
            content = <SetupProfileView setViewType={setViewType} />;
            break;
        case ViewType.localBackup:
            content = <LocalBackupView setViewType={setViewType} isOnboarding />;
            break;
        case ViewType.done:
            content = <DoneView setViewType={setViewType} />;
            break;
    }

    return (
        <div className="flex flex-col flex-nowrap my-8 mx-auto border rounded-xl flex-grow flex-shrink w-0 signup">
            {content}
        </div>
    );
}

function WelcomeView(props: { setViewType: (v: ViewType) => void}): ReactElement {
    const account = useWeb3Account();
    const user = useUser(account);
    const history = useHistory();

    // useEffect(() => {
    //     if (user?.joinedTx) {
    //         history.push('/');
    //         return;
    //     }
    // }, [user]);

    return (
        <div className="flex flex-col flex-nowrap flex-grow my-4 mx-8 signup__content signup__welcome">
            <div className="flex flex-row items-center justify-center my-4">
                <div className="text-xl mr-2">👋</div>
                <div className="text-xl font-semibold">Welcome to Autism!</div>
            </div>
            <div className="my-4">
                Autism is a decentralized social network built on top of Ethereum. By signing up, you will be able to follow people on Autism and make posts.
            </div>
            <div className="my-4">
                In the next few steps, we'll guide you through the process.
            </div>
            <div className="flex-grow flex flex-row mt-8 flex-nowrap items-end justify-end">
                <Button
                    btnType="primary"
                    onClick={() => props.setViewType(ViewType.chooseWallet)}
                >
                    Next
                </Button>
            </div>
        </div>
    )
}

function AccountOptionsView(props: { setViewType: (v: ViewType) => void}): ReactElement {
    const [selectedOption, selectOption] = useState<'wallet'|'incognito'>('wallet');
    const history = useHistory();
    const zkpr = useZKPR();

    useEffect(() => {
        if (zkpr) selectOption('incognito');
    }, [zkpr]);

    const onNext = useCallback(() => {
        if (zkpr || selectedOption === 'incognito') {
            history.push('/signup/interep');
        } else if (selectedOption === 'wallet') {
            props.setViewType(ViewType.createIdentity);
        }
    }, [selectedOption]);

    return (
        <div className="flex flex-col flex-nowrap flex-grow my-4 mx-8 signup__content signup__welcome">
            <div className="flex flex-row items-center justify-center my-4">
                <div className="text-xl mr-2">✨</div>
                <div className="text-xl font-semibold">Select your account type</div>
            </div>
            <WalletPanel setViewType={props.setViewType} />
            <div className="flex flex-row flex-nowrap signup__account-options">
                <AccountOption
                    title="Wallet Address"
                    description="Use your wallet address or ENS names as your username"
                    selected={selectedOption === 'wallet'}
                    onClick={() => selectOption('wallet')}
                    fa="fas fa-wallet"
                    disabled={!!zkpr}
                />
                <AccountOption
                    title="Anonymous"
                    description="Join a reputation mixer and post anonymously"
                    selected={selectedOption === 'incognito'}
                    onClick={() => selectOption('incognito')}
                    fa="fas fa-user-secret"
                />
            </div>
            <div className="flex-grow flex flex-row mt-8 flex-nowrap items-end justify-end">
                <Button
                    btnType="primary"
                    onClick={onNext}
                >
                    Next
                </Button>
            </div>
        </div>
    );
}

function WalletPanel(props: { setViewType: (v: ViewType) => void}): ReactElement {
    const web3Account = useWeb3Account();
    const zkpr = useZKPR();
    const idCommitment = useIdCommitment();
    const selected = useSelectedLocalId();
    const dispatch = useDispatch();

    const disconnect = useCallback(() => {
        dispatch(disconnectZKPR());
        dispatch(disconnectWeb3());

        if (selected?.type === 'zkpr_interrep') {
            postWorkerMessage(setIdentity(null));
        }

        props.setViewType(ViewType.chooseWallet);
    }, [selected]);

    let content;

    if (web3Account) {
        content = <div><Username address={web3Account} /></div>;
    } else if (zkpr) {
        content = idCommitment
            ? <div><Username address={idCommitment} /></div>
            : <div>ZK Keeper</div>
    }

    return (
        <div
            className="flex flex-row items-center px-4 py-2 border border-gray-200 rounded-xl w-fit self-center signup__wallet-panel"
        >
            <Avatar
                address={web3Account}
                incognito={!!zkpr}
                className="w-8 h-8"
            />
            <div className="ml-2 text-light font-roboto-mono">
                {content}
            </div>
            <Icon
                fa="fas fa-sign-out-alt ml-4 text-gray-400 hover:text-gray-800"
                onClick={disconnect}
            />
        </div>
    )
}

function AccountOption(props: {
    selected: boolean;
    title: string;
    description: string;
    onClick: () => void;
    fa: string;
    disabled?: boolean;
}) {
    return (
        <div
            className={classNames("signup__account-option", {
                'signup__account-option--selected': props.selected,
                'signup__account-option--disabled': props.disabled,
            })}
            onClick={!props.disabled ? props.onClick : undefined}
        >
            <Icon fa={props.fa} />
            <div className="signup__account-option__title">
                {props.title}
            </div>
            <div className="signup__account-option__desc">
                {props.description}
            </div>
        </div>
    )
}

function ChooseWalletView(props: { setViewType: (v: ViewType) => void}): ReactElement {
    const [selectedOption, selectOption] = useState<'wallet'|'incognito'>('wallet');
    const history = useHistory();
    const zkpr = useZKPR();
    const [walletOption, setWalletOption] = useState<string>('metamask');
    const zkprLoading = useZKPRLoading();
    const dispatch = useDispatch();
    const web3Loading = useWeb3Loading();
    const web3Account = useWeb3Account();
    const selected = useSelectedLocalId();

    const disconnect = useCallback(() => {
        dispatch(disconnectZKPR());
        dispatch(disconnectWeb3());

        if (selected?.type === 'zkpr_interrep') {
            postWorkerMessage(setIdentity(null));
        }
    }, [selected]);

    const connectWallet = useCallback(async (e) => {
        disconnect();
        await dispatch(connectWeb3());
        props.setViewType(ViewType.accountOptions);
    }, []);

    const connectKeeper = useCallback(async (e) => {
        disconnect();
        const id: any = await dispatch(connectZKPR());
        if (id) {
            history.push('/');
        } else {
            history.push('/signup/interep');
        }
    }, []);

    useEffect(() => {
        if (zkpr) selectOption('incognito');
    }, [zkpr]);

    return (
        <div className="flex flex-col flex-nowrap flex-grow my-4 mx-8 signup__content signup__welcome">
            <div className="flex flex-row items-center justify-center my-4">
                <div className="text-xl mr-2">👛</div>
                <div className="text-xl font-semibold">Select your wallet</div>
            </div>
            <div className="flex flex-col flex-nowrap signup__wallet-options p-4">
                <WalletOption
                    iconUrl={MetamaskSVG}
                    onClick={connectWallet}
                    selected={walletOption === 'metamask'}
                    loading={web3Loading}
                >
                    Metamask
                </WalletOption>
                <WalletOption
                    iconUrl={ZKPRSVG}
                    onClick={connectKeeper}
                    selected={walletOption === 'zkpr'}
                    loading={zkprLoading}
                >
                    ZKPR
                </WalletOption>
            </div>
        </div>
    );
}

function WalletOption(props: {
    iconUrl: string;
    children: ReactNode;
    onClick: MouseEventHandler;
    selected: boolean;
    loading: boolean;
}): ReactElement {
    return (
        <div
            className={classNames(
                "flex flex-row items-center p-2 rounded-xl border border-gray-200",
                "signup__wallet-option",
            )}
            onClick={props.onClick}
        >
            <Icon
                url={props.iconUrl}
                size={2}
                className="m-2"
            />
            <div className="ml-2">
                { props.loading && <Icon url={SpinnerGIF} size={3} /> }
                { props.loading ? null : props.children }
            </div>
        </div>
    )
}

function CreateIdentityView(props: { setViewType: (v: ViewType) => void}): ReactElement {
    const nonce = useGunNonce();
    const [errorMessage, setErrorMessage] = useState('');
    const [creating, setCreating] = useState(false);
    const dispatch = useDispatch();
    const account = useWeb3Account();
    const user = useUser(account);
    const history = useHistory();
    const identities = useIdentities();

    const createIdentity = useCallback(async () => {
        try {
            setCreating(true);
            await dispatch(loginGun());
            if (user?.joinedTx) {
                // history.push(`/${user?.ens || user?.username}`);
                props.setViewType(ViewType.localBackup)
            } else {
                props.setViewType(ViewType.updateTx);
            }
        } catch (e) {
            setErrorMessage(e.message);
        } finally {
            setCreating(false);
        }
    }, [user]);

    return (
        <div className="flex flex-col flex-nowrap flex-grow my-4 mx-8 signup__content signup__welcome">
            <div className="flex flex-row items-center justify-center my-4">
                <div className="text-xl mr-2">📝</div>
                <div className="text-xl font-semibold">Create Identity</div>
            </div>
            <WalletPanel setViewType={props.setViewType} />
            <div className="my-4">
                First, we will need to create your identity. Your identity is tied to your wallet address. As long as you have access to your wallet, you will be able to restore your account.
            </div>
            <div className="my-4">
                Once your click the button below, your wallet should prompt you to sign the following message:
            </div>
            <div className="my-2 font-semibold text-sm p-2 bg-gray-50 rounded">
                {`Sign this message to generate a GUN key pair with key nonce: ${nonce}`}
            </div>
            { errorMessage && <span className="text-red-500 text-sm my-2 text-center">{errorMessage}</span>}
            <div className="flex-grow flex flex-row mt-8 flex-nowrap items-end justify-end">
                <Button
                    btnType="primary"
                    onClick={createIdentity}
                    loading={creating}
                >
                    Create Identity
                </Button>
            </div>
        </div>
    )
}

function UpdateTxView(props: { setViewType: (v: ViewType) => void}): ReactElement {
    const account = useWeb3Account();
    const [errorMessage, setErrorMessage] = useState('');
    const [hash, setHash] = useState('');
    const [updating, setUpdating] = useState(false);
    const dispatch = useDispatch();
    const pendingTx = usePendingCreateTx();
    const user = useUser(account);
    const selected = useSelectedLocalId();

    useEffect(() => {
        (async () => {
            try {
                if (selected?.type !== 'gun') return;
                if (!selected?.publicKey) throw new Error('invalid public key');

                const hash = await getIdentityHash(account, selected?.publicKey);
                setHash(hash);
            } catch (e) {
                setErrorMessage(e.message);
            }
        })();
    }, [account, selected]);

    useEffect(() => {
        (async () => {
            if (!account || !pendingTx) return;
            await watchTx(pendingTx);
            const d: any = await dispatch(watchUser(account));

            dispatch(setJoinedTx(d.joinedTx));
            dispatch(createRecordTx(''));
            props.setViewType(ViewType.setupProfile);
        })();
    }, [pendingTx, account]);

    const update = useCallback(async () => {
        setUpdating(true);

        try {
            if (selected?.type !== 'gun' || !selected?.publicKey) {
                throw new Error('invalid publicKey');
            }
            await dispatch(updateIdentity(selected?.publicKey));
        } catch (e) {
            setErrorMessage(e.message);
        } finally {
            setUpdating(false);
        }
    }, [selected]);

    return (
        <div className="flex flex-col flex-nowrap flex-grow my-4 mx-8 signup__content signup__welcome">
            <div className="flex flex-row items-center justify-center my-4">
                <div className="text-xl mr-2">✍️</div>
                <div className="text-xl font-semibold">Update Identity</div>
            </div>
            <WalletPanel setViewType={props.setViewType} />
            <div className="my-4">
                Next, we will need to create an on-chain record of your identity and wallet address. We will be updating a contract on Arbitrum. Normally creating an on-chain record will require a user to pay gas, but don't worry, we will pick up the gas tab for you :)
            </div>
            <div className="my-4">
                Once your click the button below, your wallet will prompt you to create a proof that your wallet owns the new identity by signing the following message:
            </div>
            {   !!hash && (
                <div className="my-2 font-semibold text-sm p-2 bg-gray-50 rounded break-all">
                    {hash}
                </div>
            )}
            { errorMessage && <span className="text-red-500 text-sm my-2 text-center">{errorMessage}</span>}
            <div className="flex-grow flex flex-row mt-8 flex-nowrap items-end justify-end">
                {
                    pendingTx && (
                        <a
                            className="my-2 mx-4"
                            href={`${config.arbitrumExplorer}/tx/${pendingTx}`}
                            target="_blank"
                        >
                            View TX
                        </a>
                    )
                }
                <Button
                    btnType="primary"
                    onClick={update}
                    disabled={!hash || !!user?.joinedTx}
                    loading={updating || !!pendingTx}
                >
                    Update Identity
                </Button>
            </div>
        </div>
    )
}

function SetupProfileView(props: { setViewType: (v: ViewType) => void}): ReactElement {
    const account = useAccount();
    const user = useUser(account);
    const [coverImageUrl, setCoverImageUrl] = useState('');
    const [coverImageFile, setCoverImageFile] = useState<File|null>(null);
    const [profileImageUrl, setProfileImageUrl] = useState('');
    const [profileImageFile, setProfileImageFile] = useState<File|null>(null);
    const [name, setName] = useState('');
    const [bio, setBio] = useState('');
    const [website, setWebsite] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const dispatch = useDispatch();

    const dirty = !deepEqual(
    {
        name: user?.name,
        bio: user?.bio,
        website: user?.website,
        coverImage: user?.coverImage,
        profileImage: user?.profileImage,
    },
    {
        name: name || account,
        bio,
        website,
        coverImage: coverImageUrl,
        profileImage: profileImageUrl,
    });

    useEffect(() => {
        setName(user?.ens || user?.name || account);
        setBio(user?.bio || '');
        setWebsite(user?.website || '');
        setCoverImageUrl(user?.coverImage || '');
        setProfileImageUrl(user?.profileImage || '');
    }, [user, account]);

    const onSaveProfile = useCallback(async () => {
        if (!user) return;

        try {
            if (name !== user?.name) {
                await dispatch(submitProfile(ProfileMessageSubType.Name, name));
            }

            if (coverImageUrl !== user?.coverImage) {
                await dispatch(submitProfile(ProfileMessageSubType.CoverImage, coverImageUrl));
            }

            if (profileImageUrl !== user?.profileImage) {
                await dispatch(submitProfile(ProfileMessageSubType.ProfileImage, profileImageUrl));
            }

            if (website !== user?.website) {
                await dispatch(submitProfile(ProfileMessageSubType.Website, website));
            }

            if (bio !== user?.bio) {
                await dispatch(submitProfile(ProfileMessageSubType.Bio, bio));
            }

            dispatch(setUser({
                ...user,
                name: name,
                coverImage: coverImageUrl,
                profileImage: profileImageUrl,
                website: website,
                bio: bio,
            }));

            props.setViewType(ViewType.localBackup);
        } catch (e) {
            setErrorMessage(e.message);
        }

    }, [
        coverImageUrl,
        profileImageUrl,
        name,
        bio,
        website,
        coverImageFile,
        profileImageFile,
        user,
    ]);

    return (
        <div className="flex flex-col flex-nowrap flex-grow my-4 signup__content signup__welcome">
            <div className="flex flex-row items-center justify-center my-2">
                <div className="text-xl mr-2">🎉</div>
                <div className="text-xl font-semibold">Setup Profile</div>
            </div>
            <div className="my-2 border-t border-b border-gray-200 signup__profile-content">
                <CoverImageEditor
                    url={coverImageUrl}
                    onUrlChange={setCoverImageUrl}
                    onFileChange={setCoverImageFile}
                />
                <ProfileImageEditor
                    url={profileImageUrl}
                    onUrlChange={setProfileImageUrl}
                    onFileChange={setProfileImageFile}
                />
                <Input
                    className="border relative mx-4 mt-4 mb-8"
                    label="Name"
                    onChange={e => setName(e.target.value)}
                    value={name}
                />
                <Textarea
                    className="border relative mx-4 mt-4 mb-8"
                    label="Bio"
                    rows={4}
                    onChange={e => setBio(e.target.value)}
                    value={bio}
                />
                <Input
                    className="border relative mx-4 mt-4 mb-8"
                    label="Website"
                    onChange={e => setWebsite(e.target.value)}
                    value={website}
                />
            </div>
            { errorMessage && <span className="text-red-500 text-sm my-2 text-center">{errorMessage}</span>}
            <div className="flex-grow flex flex-row mt-2 mx-8 flex-nowrap items-end justify-end">
                <Button
                    btnType="secondary"
                    className="mr-4"
                    onClick={() => props.setViewType(ViewType.localBackup)}
                >
                    Skip
                </Button>
                <Button
                    btnType="primary"
                    onClick={onSaveProfile}
                    disabled={!dirty}
                >
                    Next
                </Button>
            </div>
        </div>
    )
}

function LocalBackupView(props: {
    setViewType: (v: ViewType) => void;
    isOnboarding?: boolean;
}): ReactElement {
    const dispatch = useDispatch();
    const [pw, setPw] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [confirmPw, setConfirmPw] = useState('');
    const history = useHistory();
    const selected = useSelectedLocalId();
    const unlocked = useWorkerUnlocked();
    const identities = useIdentities();

    let valid = false;

    if (unlocked) {
        valid = true;
    } else if (identities.length) {
        valid = !!pw;
    } else {
        valid = !!pw && pw === confirmPw
    }

    const create = useCallback(async () => {
        try {
            if (!valid || !selected) return;

            if (!unlocked) {
                await postWorkerMessage(setPassphrase(pw));
            }

            await postWorkerMessage(addIdentity(selected));

            if (!props.isOnboarding) {
                history.push('/');
            } else {
                props.setViewType(ViewType.done);
            }
        } catch (e) {
            setErrorMessage(e.message);
        }
    }, [pw, confirmPw, selected, props.isOnboarding, unlocked]);

    const onSkip = useCallback(() => {
        if (!props.isOnboarding) {
            history.goBack();
        } else {
            props.setViewType(ViewType.done);
        }
    }, [props.isOnboarding]);

    return (
        <div className="flex flex-col flex-nowrap flex-grow my-4 mx-8 signup__content signup__welcome">
            <div className="flex flex-row items-center justify-center my-4">
                <div className="text-xl mr-2">🗄️</div>
                <div className="text-xl font-semibold">Local Backup</div>
            </div>
            <div className="my-4">
                Create an encrypted copy of your identity locally. Next time you login on this device, you won't need to connect to your wallet and sign a message.
            </div>
            <div className="my-4">
                Your identity is encrypted using your password, and is stored in a separate local process. Never is ever shared with anyone.
            </div>
            {
                !!identities.length && !unlocked && (
                    <div className="my-2">
                        <Input
                            className="border relative mx-4 mt-4 mb-8"
                            type="password"
                            label="Enter Password"
                            onChange={e => setPw(e.target.value)}
                            value={pw}
                        />
                    </div>
                )
            }
            {
                (!identities.length && !unlocked) &&  (
                    <div className="my-2">
                        <Input
                            className="border relative mx-4 mt-4 mb-8"
                            type="password"
                            label="Password"
                            onChange={e => setPw(e.target.value)}
                            value={pw}
                        />
                        <Input
                            className="border relative mx-4 mt-4 mb-8"
                            type="password"
                            label="Confirm Password"
                            onChange={e => setConfirmPw(e.target.value)}
                            value={confirmPw}
                        />
                    </div>
                )
            }
            { errorMessage && <span className="text-red-500 text-sm my-2 text-center">{errorMessage}</span>}
            <div className="flex-grow flex flex-row mt-2 flex-nowrap items-end justify-end">
                <Button
                    btnType="secondary"
                    className="mr-4"
                    onClick={onSkip}
                >
                    Skip
                </Button>
                <Button
                    btnType="primary"
                    disabled={!valid}
                    onClick={create}
                >
                    Create Backup
                </Button>
            </div>
        </div>
    )
}



function DoneView(props: { setViewType: (v: ViewType) => void}): ReactElement {
    const history = useHistory();

    return (
        <div className="flex flex-col flex-nowrap flex-grow my-4 mx-8 signup__content signup__welcome">
            <div className="flex flex-row items-center justify-center my-4">
                <div className="text-xl mr-2">👋</div>
                <div className="text-xl font-semibold">Signup is completed! </div>
            </div>
            <div className="my-4">
                If you have any suggestions or issues, please join and report in our <a href="https://discord.com/invite/GVP9MghwXc" target="_blank">Discord</a>. Hope you enjoy using Auti.sm :)
            </div>
            <div className="flex-grow flex flex-row mt-8 flex-nowrap items-end justify-end">
                <Button
                    btnType="primary"
                    onClick={() => history.push(`/`)}
                >
                    Done
                </Button>
            </div>
        </div>
    )
}
