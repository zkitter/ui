import React, {ReactElement, ReactNode, useCallback, useEffect, useState} from "react";
import "./interrep-onboarding.scss";
import {useHistory} from "react-router";
import Button from "../../components/Button";
import {useSelectedLocalId} from "../../ducks/worker";
import Icon from "../../components/Icon";
import SpinnerGif from "../../../static/icons/spinner.gif";
import config from "../../util/config";
import Input from "../../components/Input";
import {checkPath, watchPath} from "../../util/interrep";
import {postWorkerMessage} from "../../util/sw";
import {setIdentity} from "../../serviceWorkers/util";
import {disconnectWeb3, genSemaphore, useWeb3Account, useWeb3Unlocking} from "../../ducks/web3";
import {useDispatch} from "react-redux";
import {createZKPRIdentity, disconnectZKPR, useIdCommitment, useZKPR} from "../../ducks/zkpr";
import Avatar, {Username} from "../../components/Avatar";
import {findProof} from "../../util/merkle";

export enum ViewType {
    welcome,
    connect,
    joinGroup,
    done,
}

type Props = {
    viewType?: ViewType;
}

export default function InterrepOnboarding(props: Props): ReactElement {
    const [viewType, setViewType] = useState<ViewType>(props.viewType || ViewType.welcome);
    const [fetching, setFetching] = useState(true);
    const [twitterAuth, setTwitterAuth] = useState<{
        token: string;
        username: string;
        reputation: string;
    }|null>(null);
    const selected = useSelectedLocalId();
    const account = useWeb3Account();

    useEffect(() => {
        (async function() {
            try {
                if (selected?.type === 'interrep' && selected.identityPath) {
                    if (account === selected.address) {
                        setViewType(ViewType.done);
                    }
                    return;
                }

                const resp = await fetch(`${config.indexerAPI}/twitter/session`, {
                    credentials: 'include',
                });
                const json: any = await resp.json();

                if (json?.error) {
                    setViewType(ViewType.welcome);
                    return;
                }

                if (json?.payload) {
                    setViewType(ViewType.joinGroup);
                    setTwitterAuth({
                        token: json?.payload.user_token,
                        username: json?.payload.username,
                        reputation: json?.payload.reputation,
                    });
                }
            } catch (e) {
                console.error(e);
            } finally {
                setFetching(false);
            }
        })();
    }, [selected, account]);

    const onResetAuth = useCallback(async () => {
        const resp = await fetch(`${config.indexerAPI}/oauth/reset`, {
            credentials: 'include',
        });
        const json = await resp.json();

        if (!json.error) {
            setViewType(ViewType.connect);
            setTwitterAuth(null);
        }
    }, []);

    if (fetching) {
        return (
            <div className="flex flex-col flex-nowrap flex-grow my-4 mx-8 signup__content signup__welcome">
                <Icon url={SpinnerGif} size={4} />
            </div>
        )
    }

    let content;

    switch (viewType) {
        case ViewType.welcome:
            content = <WelcomeView setViewType={setViewType} />;
            break;
        case ViewType.connect:
            content = <ConnectView setViewType={setViewType} />;
            break;
        case ViewType.joinGroup:
            content = <JoinGroupView setViewType={setViewType} twitterAuth={twitterAuth} onResetAuth={onResetAuth} />;
            break;
        case ViewType.done:
            content = <DoneView setViewType={setViewType} />
            break;
    }

    return (
        <div className="flex flex-col flex-nowrap my-8 mx-auto border rounded-xl flex-grow flex-shrink w-0 signup">
            {content}
        </div>
    );
}

function WalletPanel(): ReactElement {
    const web3Account = useWeb3Account();
    const zkpr = useZKPR();
    const idCommitment = useIdCommitment();
    const selected = useSelectedLocalId();
    const dispatch = useDispatch();
    const history = useHistory();

    const disconnect = useCallback(() => {
        dispatch(disconnectZKPR());
        dispatch(disconnectWeb3());

        if (selected?.type === 'zkpr_interrep') {
            postWorkerMessage(setIdentity(null));
        }

        history.push('/signup');
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

function WelcomeView(props: { setViewType: (v: ViewType) => void}): ReactElement {
    const selectedLocalId = useSelectedLocalId();
    const account = useWeb3Account();
    const history = useHistory();

    useEffect(() => {
        if (selectedLocalId?.type === 'interrep' && selectedLocalId.identityPath) {
            if (account === selectedLocalId.address) {
                history.push('/');
                return;
            }
        }
    }, [selectedLocalId, account]);

    return (
        <div className="flex flex-col flex-nowrap flex-grow my-4 mx-8 signup__content signup__welcome">
            <div className="flex flex-row items-center justify-center my-4">
                <div className="text-xl mr-2">🥸</div>
                <div className="text-xl font-semibold">Create Secret Member</div>
            </div>
            <WalletPanel />
            <div className="my-4">
                InterRep is a system which allows people to export cryptographic proofs of their reputation accrued on social networks or other services and to put these proofs on a decentralized platform (i.e. Ethereum), in order to allow decentralized applications or services to verify users' reputation efficiently and without sensitive data.
            </div>
            <div className="my-4">
                In the next few steps, we'll guide you through the process.
            </div>
            <div className="flex-grow flex flex-row mt-8 flex-nowrap items-end justify-center">
                <Button
                    btnType="primary"
                    onClick={() => props.setViewType(ViewType.connect)}
                >
                    Next
                </Button>
            </div>
        </div>
    )
}

function ConnectView(props: { setViewType: (v: ViewType) => void}): ReactElement {
    const connectTwitter = useCallback(async () => {
        const resp = await fetch(
            `${config.indexerAPI}/twitter?redirectUrl=${encodeURI(`${config.baseUrl}/signup/interep`)}`,
            {
                credentials: 'include',
            },
        );
        const json = await resp.json();

        if (!json.error && json.payload) {
            window.location.href = json.payload;
        }

    }, []);
    return (
        <div className="flex flex-col flex-nowrap flex-grow my-4 mx-8 signup__content signup__welcome">
            <div className="flex flex-row items-center justify-center my-4">
                <div className="text-xl mr-2">🌐</div>
                <div className="text-xl font-semibold">Web2 Login</div>
            </div>
            <WalletPanel />
            <div className="my-4">
                The heart of InterRep lies in the possibility to export reputation. In order to calculate your reputation, you will first need to connect to a reputation providers below.
            </div>
            <div className="flex-grow flex flex-col mt-8 mb-4 flex-nowrap items-center justify-center">
                <Button
                    btnType="primary"
                    className="mb-2 w-36 justify-center"
                    onClick={connectTwitter}
                >
                    <Icon fa="fab fa-twitter" className="mr-2" />
                    Twitter
                </Button>
            </div>
        </div>
    )
}

function JoinGroupView(props: {
    setViewType: (v: ViewType) => void;
    onResetAuth: () => void;
    twitterAuth: {
        token: string;
        username: string;
        reputation: string;
    } | null;
}): ReactElement {
    const [errorMessage, setErrorMessage] = useState('');
    const [joining, setJoining] = useState(false);
    const { twitterAuth } = props;
    const selected = useSelectedLocalId();
    const dispatch = useDispatch();
    const unlocking = useWeb3Unlocking();
    const account = useWeb3Account();
    const history = useHistory();
    const idCommitment = useIdCommitment();
    const zkpr = useZKPR();

    let username = '';
    let name: 'Twitter' | '' = '';
    let group = '';
    let reputation = '';
    let token = '';

    const noIdCommitment = zkpr
        ? !idCommitment
        : (selected?.type !== 'interrep' || selected.address !== account);

    useEffect(() => {
        if (noIdCommitment) return;

        let identityCommitment = '';

        if (zkpr) {
            identityCommitment = idCommitment;
        } else if (selected?.type === 'interrep') {
            identityCommitment = selected.identityCommitment;
        }

        const idcommitmentHex = BigInt(identityCommitment).toString(16);

        (async () => {
            const data = await findProof('', idcommitmentHex);

            if (!data) return;

            const [protocol, groupType, groupName] = data.group.split('_');

            if (zkpr) {
                await postWorkerMessage(setIdentity({
                    type: 'zkpr_interrep',
                    identityCommitment: identityCommitment,
                    provider: groupType,
                    name: groupName,
                    identityPath: {
                        path_elements: data.siblings,
                        path_index: data.pathIndices,
                        root: data.root,
                    },
                }))
            } else if (selected?.type === 'interrep') {
                await postWorkerMessage(setIdentity({
                    ...selected,
                    name: groupName,
                    identityPath: {
                        path_elements: data.siblings,
                        path_index: data.pathIndices,
                        root: data.root,
                    },
                }))
            }

            if (selected?.type === 'interrep') {
                history.push('/create-local-backup');
            } else {
                props.setViewType(ViewType.done);
            }
        })();
    }, [selected, account, idCommitment, zkpr, noIdCommitment]);

    if (twitterAuth) {
        name = 'Twitter';
        group = 'twitter';
        username = twitterAuth.username;
        reputation = twitterAuth.reputation;
        token = twitterAuth.token;
    }

    const onCreateIdentity = useCallback(() => {
        if (name) {
            if (zkpr) {
                dispatch(createZKPRIdentity());
            } else {
                dispatch(genSemaphore(name, reputation))
            }
        }
    }, [name, zkpr]);

    const onJoinGroup = useCallback(async () => {
        if (noIdCommitment) {
            setErrorMessage('not login to incognito');
            return;
        }

        let identityCommitment = '';

        if (zkpr) {
            identityCommitment = idCommitment;
        } else if (selected?.type === 'interrep') {
            identityCommitment = selected.identityCommitment;
        }

        try {
            setJoining(true);
            const resp = await fetch(`${config.indexerAPI}/interrep/groups/${group}/${reputation}/${identityCommitment}`, {
                method: 'POST',
                credentials: 'include',
            });
            const json = await resp.json();
            const idcommitmentHex = BigInt(identityCommitment).toString(16);

            if (json.error) {
                setErrorMessage(json.payload);
            } else {
                const data = await watchPath(`interrep_${group}_${reputation}`, idcommitmentHex);
                // props.setViewType(ViewType.done);
                history.push('/create-local-backup');

                const [protocol, groupType, groupName] = (data?.group || '').split('_');
                if (zkpr) {
                    await postWorkerMessage(setIdentity({
                        type: 'zkpr_interrep',
                        provider: groupType,
                        name: groupName,
                        identityPath: data ? {
                            path_elements: data?.siblings,
                            path_index: data?.siblings,
                            root: data?.root,
                        } : null,
                        identityCommitment: identityCommitment,
                    }))
                } else if (selected?.type === 'interrep') {
                    await postWorkerMessage(setIdentity({
                        ...selected,
                        provider: groupType,
                        name: groupName,
                        identityPath: data ? {
                            path_elements: data?.siblings,
                            path_index: data?.siblings,
                            root: data?.root,
                        } : null,
                    }))
                }
            }
        } catch (e) {
            setErrorMessage(e.message);
        } finally {
            setJoining(false);
        }
    }, [twitterAuth, selected, reputation, group, token, zkpr, idCommitment, noIdCommitment]);

    return (
        <div className="flex flex-col flex-nowrap flex-grow my-4 mx-8 signup__content signup__welcome">
            <div className="flex flex-row items-center justify-center my-4">
                <div className="text-xl mr-2">🌐</div>
                <div className="text-xl font-semibold">Web2 Reputation</div>
            </div>
            <WalletPanel />
            <div className="my-4">
                Based on your reputation, you can join the following group:
            </div>
            <div className="flex flex-col items-center">
                <Input label="Web2 Provider" className="relative border mt-2" value={name} readOnly />
                <Input label="Username" className="relative border mt-4" value={username} readOnly />
                <Input label="Reputation" className="relative border mt-4" value={reputation} readOnly />
            </div>
            { errorMessage && <span className="text-red-500 text-sm my-2 text-center">{errorMessage}</span>}
            <div className="flex-grow flex flex-row mt-8 mb-4 flex-nowrap items-center justify-center">
                <Button
                    btnType="secondary"
                    className="mr-4"
                    onClick={props.onResetAuth}
                    loading={joining || unlocking}
                >
                    Reset
                </Button>
                {
                    noIdCommitment
                        ? (
                            <Button
                                btnType="primary"
                                onClick={onCreateIdentity}
                                loading={unlocking}
                            >
                                Create Identity
                            </Button>
                        )
                        : (
                            <Button
                                btnType="primary"
                                onClick={onJoinGroup}
                                loading={joining}
                            >
                                Join Group
                            </Button>
                        )
                }

            </div>
        </div>
    )
}


function DoneView(props: {
    setViewType: (v: ViewType) => void;
}): ReactElement {
    const history = useHistory();

    return (
        <div className="flex flex-col flex-nowrap flex-grow my-4 mx-8 signup__content signup__welcome">
            <div className="flex flex-row items-center justify-center my-4">
                <div className="text-xl mr-2">🥷</div>
                <div className="text-xl font-semibold">We can't see you! </div>
            </div>
            <div className="my-4">
                {`Your incognito account is ready for posting!`}
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
