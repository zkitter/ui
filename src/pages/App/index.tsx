import React, {ReactElement} from "react";
import "./app.scss";
import {Route, Switch} from "react-router";
import TopNav from "../../components/TopNav";

export default function App(): ReactElement {
    return (
        <div className="flex flex-col flex-nowrap w-screen h-screen app">
            <TopNav />
            <Switch>
                <Route path="/">

                </Route>
            </Switch>
        </div>
    )
}