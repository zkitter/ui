import React, {ReactElement, useEffect} from "react";
import {Redirect, Route, Switch} from "react-router";
import TopNav from "../../components/TopNav";
import GlobalFeed from "../../components/GlobalFeed";
import "./app.scss";
import {connectWeb3, useENSLoggedIn, web3Modal} from "../../ducks/web3";
import {useDispatch} from "react-redux";
import PostView from "../../components/PostView";
import ProfileView from "../../components/ProfileView";
import HomeFeed from "../../components/HomeFeed";
import DiscoverUserPanel from "../../components/DiscoverUserPanel";
import {SnapshotAdminPanel, SnapshotMemberPanel} from "../../components/SnapshotPanels";

export default function App(): ReactElement {
    const dispatch = useDispatch();
    const loggedIn = useENSLoggedIn();

    useEffect(() => {
        (async function onAppMount() {
            if (web3Modal.cachedProvider) {
                await dispatch(connectWeb3());
            }
        })();
    }, []);

    return (
        <div className="flex flex-col flex-nowrap w-screen h-screen overflow-hidden app">
            <TopNav />
            <div className="flex flex-row flex-nowrap app__content">
                <Switch>
                    <Route path="/explore">
                        <GlobalFeed />
                    </Route>
                    <Route path="/:name/status/:hash">
                        <PostView />
                    </Route>
                    <Route path="/post/:hash">
                        <PostView />
                    </Route>
                    {
                        !loggedIn
                            ? (
                                <Route path="/home">
                                    <Redirect to="/" />
                                </Route>
                            )
                            : (
                                <Route path="/home">
                                    <HomeFeed />
                                </Route>
                            )
                    }

                    <Route path="/notifications"></Route>
                    <Route path="/:name">
                        <ProfileView />
                    </Route>
                    <Route path="/">
                        <Redirect to="/explore" />
                    </Route>
                </Switch>
                <div className="app__meta-content">
                    <Switch>
                        <Route path="/explore">
                            <DiscoverUserPanel key="discover-user" />
                        </Route>
                        <Route path="/:name/status/:hash">
                            <DiscoverUserPanel key="discover-user" />
                        </Route>
                        <Route path="/post/:hash">
                            <DiscoverUserPanel key="discover-user" />
                        </Route>
                        <Route path="/home">
                            <DiscoverUserPanel key="discover-user" />
                        </Route>
                        <Route path="/notifications"></Route>
                        <Route path="/:name">
                            <SnapshotAdminPanel />
                            <SnapshotMemberPanel />
                            <DiscoverUserPanel key="discover-user" />
                        </Route>
                        <Route path="/">
                            <Redirect to="/explore" />
                        </Route>
                    </Switch>
                </div>
            </div>
        </div>
    )
}