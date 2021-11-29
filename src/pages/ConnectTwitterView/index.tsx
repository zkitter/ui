import React, {ReactElement, ReactNode, useCallback, useEffect, useState} from "react";
import "./connect-twitter.scss";
import Button from "../../components/Button";
import {useSelectedLocalId} from "../../ducks/worker";
import Icon from "../../components/Icon";
import SpinnerGif from "../../../static/icons/spinner.gif";
import config from "../../util/config";
import TwitterLogo from "../../../static/icons/twitter.svg";
import {useAccount} from "../../ducks/web3";
import {setUser, useConnectedTwitter, useUser} from "../../ducks/users";
import {useDispatch} from "react-redux";
import {submitProfile} from "../../ducks/drafts";
import {ProfileMessageSubType} from "../../util/message";
import {useHistory} from "react-router";

export enum ViewType {
    welcome,
    verify,
    done,
}

type Props = {
    viewType?: ViewType;
}

export default function ConnectTwitterView(props: Props): ReactElement {
    const [viewType, setViewType] = useState<ViewType>(props.viewType || ViewType.welcome);
    const [fetching, setFetching] = useState(true);
    const [twitterAuth, setTwitterAuth] = useState<{
        token: string;
        username: string;
        reputation: string;
        profileImageUrlHttps: string;
        screenName: string;
    }|null>(null);

    useEffect(() => {
        (async function() {
            try {
                const resp = await fetch(`${config.indexerAPI}/twitter/session`, {
                    credentials: 'include',
                });
                const json: any = await resp.json();

                if (json?.error) {
                    throw new Error(json?.payload);
                }

                if (json?.payload) {
                    setViewType(ViewType.verify);
                    setTwitterAuth({
                        token: json?.payload.user_token,
                        username: json?.payload.username,
                        reputation: json?.payload.reputation,
                        profileImageUrlHttps: json?.payload.profileImageUrlHttps,
                        screenName: json?.payload.screenName,
                    });
                }
            } catch (e) {
                console.error(e);
            } finally {
                setFetching(false);
            }
        })();
    }, []);

    const onResetAuth = useCallback(async () => {
        const resp = await fetch(`${config.indexerAPI}/oauth/reset`, {
            credentials: 'include',
        });
        const json = await resp.json();

        if (!json.error) {
            setViewType(ViewType.welcome);
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
        case ViewType.verify:
            content = <VerifyView setViewType={setViewType} twitterAuth={twitterAuth} onResetAuth={onResetAuth} />;
            break;
        case ViewType.done:
            content = <DoneView />
            break;
    }

    return (
        <div className="flex flex-col flex-nowrap my-8 mx-auto border rounded-xl flex-grow flex-shrink w-0 signup">
            {content}
        </div>
    );
}

function WelcomeView(props: { setViewType: (v: ViewType) => void}): ReactElement {
    const connectTwitter = useCallback(async () => {
        const resp = await fetch(
            `${config.indexerAPI}/twitter?redirectUrl=${encodeURI('http://127.0.0.1:8080/connect/twitter')}`,
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
                <div className="text-xl mr-2">
                    <Icon url={TwitterLogo} size={1.25} />
                </div>
                <div className="text-xl font-semibold">Connect your Twitter account</div>
            </div>
            <div className="my-4">
                Connect your Twitter account to mirror your post to your Twitter feed, and allow Autism users to discover your profile by your Twitter handle.
            </div>
            <div className="flex-grow flex flex-row mt-8 flex-nowrap items-end justify-center">
                <Button
                    btnType="primary"
                    onClick={connectTwitter}
                >
                    Next
                </Button>
            </div>
        </div>
    )
}

function VerifyView(props: {
    setViewType: (v: ViewType) => void;
    onResetAuth: () => void;
    twitterAuth: {
        token: string;
        username: string;
        reputation: string;
        profileImageUrlHttps: string;
        screenName: string;
    } | null;
}): ReactElement {
    const [errorMessage, setErrorMessage] = useState('');
    const [posting, setPosting] = useState(false);
    const { twitterAuth } = props;
    const selected = useSelectedLocalId();
    const account = useAccount();
    const dispatch = useDispatch();
    const user = useUser(account);
    const status = `I am verifying my account on #autism\nhttps://auti.sm/${account}/`;

    useEffect(() => {
        if (user?.twitterVerification) {
            props.setViewType(ViewType.done);
        }
    }, [user]);

    const onVerify = useCallback(async () => {
        if (!user) return;

        setPosting(true);
        setErrorMessage('');

        try {
            const resp = await fetch(`${config.indexerAPI}/twitter/update`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    status: status,
                }),
            });
            const json = await resp.json();

            if (json?.error) {
                setErrorMessage(json.payload);
                return;
            }

            if (!json?.error && json?.payload) {
                await dispatch(submitProfile(ProfileMessageSubType.TwitterVerification, json.payload));

                dispatch(setUser({
                    ...user,
                    twitterVerification: json.payload,
                }));
            }
        } catch (e) {
            setErrorMessage(e.message);
        } finally {
            setPosting(false);
        }

    }, [account, status, user]);

    return (
        <div className="flex flex-col flex-nowrap flex-grow my-4 mx-8 signup__content signup__welcome">
            <div className="flex flex-row items-center justify-center my-4">
                <div className="text-xl mr-2">
                    <Icon url={TwitterLogo} size={1.25} />
                </div>
                <div className="text-xl font-semibold">Make a verification tweet</div>
            </div>
            <div className="my-4 text-center">
                {`Associate your Austism profile with ${twitterAuth?.username} by making a tweet!`}
            </div>
            <div className="my-4">
                <div className="border rounded-xl m-4 p-4 flex flex-row flex-nowrap">
                    <img
                        className="rounded-full w-12 h-12"
                        src={twitterAuth?.profileImageUrlHttps}
                    />
                    <div className="flex flex-col flex-nowrap ml-2">
                        <div className="flex flex-row flex-nowrap items-center">
                            <div className="font-semibold mr-2">{twitterAuth?.username}</div>
                            <div className="text-gray-500">{twitterAuth?.screenName}</div>
                        </div>
                        <div className="break-all">
                            {status}
                        </div>
                    </div>
                </div>
            </div>
            { errorMessage && <span className="text-red-500 text-sm my-2 text-center">{errorMessage}</span>}
            <div className="flex-grow flex flex-row mt-8 mb-4 flex-nowrap items-center justify-center">
                {
                    selected?.type !== 'gun'
                        ? (
                            <div>
                                {`Please first login to Autism before continuing.`}
                            </div>
                        )
                        : (
                            <>
                                <Button
                                    btnType="secondary"
                                    className="mr-4"
                                    onClick={props.onResetAuth}
                                    disabled={posting}
                                >
                                    Reset
                                </Button>
                                <Button
                                    btnType="primary"
                                    onClick={onVerify}
                                    loading={posting}
                                >
                                    Verify
                                </Button>
                            </>
                        )
                }

            </div>
        </div>
    )
}

function DoneView(): ReactElement {
    const history = useHistory();
    const account = useAccount();
    const twitterHandle = useConnectedTwitter(account);

    return (
        <div className="flex flex-col flex-nowrap flex-grow my-4 mx-8 signup__content signup__welcome">
            <div className="flex flex-row items-center justify-center my-4">
                <div className="text-xl mr-2">👋</div>
                <div className="text-xl font-semibold">Twitter Connected!</div>
            </div>
            <div className="my-4 text-center">
                {`You are connected to ${twitterHandle} on Twitter!`}
            </div>
            <div className="flex-grow flex flex-row mt-8 flex-nowrap items-end justify-center">
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