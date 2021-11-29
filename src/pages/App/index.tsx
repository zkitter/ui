import React, {ReactElement, useEffect, useState} from "react";
import {Redirect, Route, RouteProps, Switch} from "react-router";
import TopNav from "../../components/TopNav";
import GlobalFeed from "../GlobalFeed";
import "./app.scss";
import {connectWeb3, useGunLoggedIn, web3Modal} from "../../ducks/web3";
import {useDispatch} from "react-redux";
import PostView from "../PostView";
import ProfileView from "../ProfileView";
import HomeFeed from "../HomeFeed";
import DiscoverUserPanel from "../../components/DiscoverUserPanel";
import TagFeed from "../../components/TagFeed";
import DiscoverTagPanel from "../../components/DiscoverTagPanel";
import Icon from "../../components/Icon";
import SignupView, {ViewType} from "../SignupView";
import {syncWorker, useSelectedLocalId} from "../../ducks/worker";
import gun, {authenticateGun} from "../../util/gun";
import {Identity} from "../../serviceWorkers/identity";
import BottomNav from "../../components/BottomNav";
import InterrepOnboarding from "../InterrepOnboarding";
import ConnectTwitterButton from "../../components/ConnectTwitterButton";
import ConnectTwitterView from "../ConnectTwitterView";

export default function App(): ReactElement {
    const dispatch = useDispatch();
    const selected = useSelectedLocalId();
    const [lastSelected, setLastSelected] = useState<Identity | null>(null);

    useEffect(() => {
        (async function onAppMount() {

            dispatch(syncWorker());

            if (web3Modal.cachedProvider) {
                await dispatch(connectWeb3());
            }
        })();
    }, []);

    useEffect(() => {
        if (!selected) {
            //@ts-ignore
            if (gun.user().is) {
                gun.user().leave();
            }
            return;
        }

        // @ts-ignore
        if (selected?.type === 'gun' && lastSelected?.privateKey !== selected?.privateKey) {
            authenticateGun({
                pub: selected.publicKey,
                priv: selected.privateKey,
            });
            setLastSelected(selected);
        }

    }, [selected, lastSelected])

    useEffect(() => {
        navigator.serviceWorker.addEventListener('message', event => {
            const data = event.data;

            if (!data) return;

            if (data.target === 'redux') {
                const action = data.action;
                dispatch(action);
            }
        });
    }, []);

    return (
        <div className="flex flex-col flex-nowrap w-screen h-screen overflow-hidden app">
            <TopNav />
            <div className="flex flex-row flex-nowrap app__content">
                <Switch>
                    <Route path="/explore">
                        <GlobalFeed />
                    </Route>
                    <Route path="/tag/:tagName">
                        <TagFeed />
                    </Route>
                    <Route path="/:name/status/:hash">
                        <PostView />
                    </Route>
                    <Route path="/post/:hash">
                        <PostView />
                    </Route>
                    <AuthRoute path="/home">
                        <HomeFeed />
                    </AuthRoute>
                    <Route path="/notifications" />
                    <Route path="/create-local-backup">
                        <SignupView viewType={ViewType.localBackup} />
                    </Route>
                    <Route path="/onboarding/interrep">
                        <InterrepOnboarding />
                    </Route>
                    <Route path="/connect/twitter">
                        <ConnectTwitterView />
                    </Route>
                    <Route path="/signup">
                        <SignupView />
                    </Route>
                    <Route path="/:name">
                        <ProfileView />
                    </Route>
                    <Route path="/">
                        <Redirect to="/explore" />
                    </Route>
                </Switch>
                <Switch>
                    <Route path="/explore" component={DefaultMetaPanels} />
                    <Route path="/:name/status/:hash" component={DefaultMetaPanels} />
                    <Route path="/post/:hash" component={DefaultMetaPanels} />
                    <Route path="/tag/:tagName" component={DefaultMetaPanels} />
                    <Route path="/home" component={DefaultMetaPanels} />
                    <Route path="/notifications" />
                    <Route path="/create-local-backup" />
                    <Route path="/onboarding/interrep" />
                    <Route path="/connect/twitter" />
                    <Route path="/signup" />
                    <Route path="/:name" component={DefaultMetaPanels} />
                </Switch>
            </div>
            <BottomNav />
        </div>
    )
}

function AuthRoute(props: {
    redirect?: string;
} & RouteProps): ReactElement {
    const { redirect = '/', ...routeProps} = props;
    const loggedIn = useGunLoggedIn();

    if (loggedIn) {
        return (
            <Route {...routeProps} />
        )
    }

    return (
        <Route {...routeProps}>
            <Redirect to={redirect} />
        </Route>
    )
}

function DefaultMetaPanels(): ReactElement {
    return (
        <div className="app__meta-content mobile-hidden">
            <DiscoverUserPanel key="discover-user" />
            <DiscoverTagPanel key="discover-tag" />
            <div className="app__meta-content__footer p-2 my-2 flex flex-row">
                <div className="text-gray-500 text-xs flex flex-row flex-nowrap mr-4 items-center">
                    <Icon className="mr-2" fa="fab fa-github" />
                    <a
                        className="text-gray-500"
                        href="https://github.com/autism-org"
                        target="_blank"
                    >
                        Github
                    </a>
                </div>
                <div className="text-gray-500 text-xs flex flex-row flex-nowrap mr-4 items-center">
                    <Icon className="mr-2" fa="fab fa-twitter" />
                    <a
                        className="text-gray-500"
                        href="https://twitter.com/AutismDev"
                        target="_blank"
                    >
                        Twitter
                    </a>
                </div>
                <div className="text-gray-500 text-xs flex flex-row flex-nowrap items-center">
                    <Icon className="mr-2" fa="fab fa-discord" />
                    <a
                        className="text-gray-500"
                        href="https://discord.com/invite/GVP9MghwXc"
                        target="_blank"
                    >
                        Discord
                    </a>
                </div>
            </div>
        </div>
    );
}