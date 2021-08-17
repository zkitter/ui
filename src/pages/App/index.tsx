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
                        <DiscoverUserPanel />
                    </Route>
                    <Route path="/:name/status/:hash">
                        <PostView />
                        <DiscoverUserPanel />
                    </Route>
                    <Route path="/post/:hash">
                        <PostView />
                        <DiscoverUserPanel />
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
                                    <DiscoverUserPanel />
                                </Route>
                            )
                    }

                    <Route path="/notifications"></Route>
                    <Route path="/:name">
                        <ProfileView />
                        <DiscoverUserPanel />
                    </Route>
                    <Route path="/">
                        <Redirect to="/explore" />
                    </Route>
                </Switch>
            </div>
        </div>
    )
}