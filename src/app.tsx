import 'isomorphic-fetch';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {Provider} from 'react-redux';
import {BrowserRouter} from 'react-router-dom';
import configureAppStore from "./store/configureAppStore";

const store = configureAppStore();

import Gun from "gun/gun";
import Dev from "./pages/Dev";
const SEA = require('gun/sea');

const gun = Gun('http://localhost:8765/gun');

SEA.pair(async (data: any) => {
    // console.log(data);
    // const pair = {
    //     pub: data.pub,
    //     priv: data.priv,
    // }
    const pair = {
        priv: "QSvV3yUHRlSICm5yokmIIj_C7QbehakGwsj1NtLt2WI",
        pub: "aZJMQ34K6ZzCZt19IbbmMZZTOPIxbQMpgUNptqKNo-s.9wCDSGD6Z6nZbDtqtTpCkox4totMY9XGzdqwgyK_4yo",
    }
    const pair2 = {
        priv: "_Q1IZBUi6IM0KRXoJ0ie3xsGj-lg_DPpUeJ_7tLoNtc",
        pub: "Q3V1zwgCjqMLRIcE5e5a9XflYXQwljMDOz5M_0PQiC0.mTwYsbZ_skKDwhz3wLqyfP1iBphrTL-KqMzVZYKutc0",
    }
    const pair3 = {
        priv: "d8JnaOhlBXyCU7ntyJDuZmEHaCsy7hk0yvbpCjrsOc0",
        pub: "UBY4X4xqba_oKtuanCQ2a8RL-xexXM6w3oSuZt6V6J8.JFokl0cvyTOTbs-N7C-hHFdsaqqA6zrVBP_7uJ_r2K4",
    }
    // @ts-ignore
    const user = gun.user().auth(pair3);

    // console.log(user);

    user.get('posts').get('0x1234567893').put({ "hello": 'i am pair 3!'});
    user.get('posts').get('0x1234567891').put({ "type": 'i am pair 3!', payload: { number: 2 }});
    gun.user(pair3.pub)
        .get('posts')
        .map(((post, id) => console.log(post, id)));
});



ReactDOM.render(
    <Provider store={store}>
        <BrowserRouter>
            <Dev />
        </BrowserRouter>
    </Provider>,
    document.getElementById('root'),
);

if ((module as any).hot) {
    (module as any).hot.accept();
}