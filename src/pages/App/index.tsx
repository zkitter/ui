import React, {ReactElement, useEffect} from "react";
import {Redirect, Route, Switch} from "react-router";
import TopNav from "../../components/TopNav";
import HomeFeed from "../../components/HomeFeed";
import "./app.scss";
import {connectWeb3, web3Modal} from "../../ducks/web3";
import {useDispatch} from "react-redux";
import PostView from "../../components/PostView";

export default function App(): ReactElement {
    const dispatch = useDispatch();

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
                        <HomeFeed />
                    </Route>
                    <Route path="/:name/status/:hash">
                        <PostView />
                    </Route>
                    <Route path="/">
                        <Redirect to="/explore" />
                    </Route>
                </Switch>
            </div>
        </div>
    )
}