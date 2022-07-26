import React, {ReactElement, ReactNode, useEffect, useState} from "react";
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
import {Identity} from "../../serviceWorkers/identity";
import BottomNav from "../../components/BottomNav";
import InterrepOnboarding from "../InterrepOnboarding";
import ConnectTwitterView from "../ConnectTwitterView";
import {loginUser} from "../../util/user";
import zkpr, {connectZKPR} from "../../ducks/zkpr";
import PostModerationPanel from "../../components/PostModerationPanel";
import SettingView from "../SettingView";
import MetaPanel from "../../components/MetaPanel";
import ChatView from "../ChatView";
import {zkchat} from "../../ducks/chats";
import {generateECDHKeyPairFromhex, generateZkIdentityFromHex, sha256, signWithP256} from "../../util/crypto";

export default function App(): ReactElement {
    const dispatch = useDispatch();
    const selected = useSelectedLocalId();

    useEffect(() => {
        (async function onAppMount() {

            const id: any = await dispatch(syncWorker());

            if (id) {
                await loginUser(id);
            }

            const cachedZKPR = localStorage.getItem('ZKPR_CACHED');

            if (cachedZKPR) {
                await dispatch(connectZKPR());
            } else if (web3Modal.cachedProvider) {
                await dispatch(connectWeb3());
            }
        })();
    }, []);

    useEffect(() => {
        if (!selected || selected.type !== 'gun') return;

        (async () => {
            const ecdhseed = await signWithP256(selected.privateKey, 'signing for ecdh - 0');
            const zkseed = await signWithP256(selected.privateKey, 'signing for zk identity - 0');
            const ecdhHex = await sha256(ecdhseed);
            const zkHex = await sha256(zkseed);
            const keyPair = await generateECDHKeyPairFromhex(ecdhHex);
            const zkIdentity = await generateZkIdentityFromHex(zkHex);
            zkchat.importIdentity({
                address: selected.address,
                zk: zkIdentity,
                ecdh: keyPair,
            });
        })();
    }, [selected])

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
                    <Route path="/signup/interep">
                        <InterrepOnboarding />
                    </Route>
                    <Route path="/connect/twitter">
                        <ConnectTwitterView />
                    </Route>
                    <Route path="/signup">
                        <SignupView />
                    </Route>
                    <Route path="/settings">
                        <SettingView />
                    </Route>
                    <Route path="/chat">
                        <ChatView />
                    </Route>
                    <Route path="/:name">
                        <ProfileView />
                    </Route>
                    <Route path="/">
                        <Redirect to="/explore" />
                    </Route>
                </Switch>
                <MetaPanel className="mobile-hidden" />
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
