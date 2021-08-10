import React, {ReactElement} from "react";
import {Redirect, Route, Switch} from "react-router";
import TopNav from "../../components/TopNav";
import HomeFeed from "../../components/HomeFeed";
import "./app.scss";

export default function App(): ReactElement {
    return (
        <div className="flex flex-col flex-nowrap w-screen h-screen app">
            <TopNav />
            <div className="flex flex-row flex-nowrap app__content">
                <Switch>
                    <Route path="/explore">
                        <HomeFeed />
                    </Route>
                    <Route path="/">
                        <Redirect to="/explore" />
                    </Route>
                </Switch>
            </div>
        </div>
    )
}