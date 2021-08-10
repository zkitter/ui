import 'isomorphic-fetch';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {Provider} from 'react-redux';
import {BrowserRouter} from 'react-router-dom';
import configureAppStore from "./store/configureAppStore";
// import Dev from "./pages/Dev";
import App from "./pages/App";
import "./util/gun";
const store = configureAppStore();

ReactDOM.render(
    <Provider store={store}>
        <BrowserRouter>
            <App />
        </BrowserRouter>
    </Provider>,
    document.getElementById('root'),
);

if ((module as any).hot) {
    (module as any).hot.accept();
}