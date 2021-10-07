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
import TagFeed from "../../components/TagFeed";
import DiscoverTagPanel from "../../components/DiscoverTagPanel";
import Icon from "../../components/Icon";

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
                    <Route path="/tag/:tagName">
                        <TagFeed />
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
                <div className="app__meta-content mobile-hidden">
                    <Switch>
                        <Route path="/explore">
                            <DiscoverUserPanel key="discover-user" />
                            <DiscoverTagPanel key="discover-tag" />
                        </Route>
                        <Route path="/:name/status/:hash">
                            <DiscoverUserPanel key="discover-user" />
                            <DiscoverTagPanel key="discover-tag" />
                        </Route>
                        <Route path="/post/:hash">
                            <DiscoverUserPanel key="discover-user" />
                            <DiscoverTagPanel key="discover-tag" />
                        </Route>
                        <Route path="/tag/:tagName">
                            <DiscoverUserPanel key="discover-user" />
                            <DiscoverTagPanel key="discover-tag" />
                        </Route>
                        <Route path="/home">
                            <DiscoverUserPanel key="discover-user" />
                            <DiscoverTagPanel key="discover-tag" />
                        </Route>
                        <Route path="/notifications"></Route>
                        <Route path="/:name">
                            <DiscoverUserPanel key="discover-user" />
                            <DiscoverTagPanel key="discover-tag" />
                        </Route>
                        <Route path="/">
                            <Redirect to="/explore" />
                        </Route>
                    </Switch>
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
                        {/*<Icon*/}
                        {/*    className="text-gray-300 hover:text-gray-600 transition-colors cursor-pointer"*/}
                        {/*    fa="fab fa-github"*/}
                        {/*/>*/}
                    </div>
                </div>
            </div>
        </div>
    )
}