import 'isomorphic-fetch';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {Provider} from 'react-redux';
import {BrowserRouter} from 'react-router-dom';
import configureAppStore from "./store/configureAppStore";

const store = configureAppStore();

import Dev from "./pages/Dev";
import "./util/gun";



// SEA.pair(async (data: any) => {
//     // console.log(data);
//     // const pair = {
//     //     pub: data.pub,
//     //     priv: data.priv,
//     // }
//     const pair = {
//         priv: "QSvV3yUHRlSICm5yokmIIj_C7QbehakGwsj1NtLt2WI",
//         pub: "aZJMQ34K6ZzCZt19IbbmMZZTOPIxbQMpgUNptqKNo-s.9wCDSGD6Z6nZbDtqtTpCkox4totMY9XGzdqwgyK_4yo",
//     }
//     const pair2 = {
//         priv: "_Q1IZBUi6IM0KRXoJ0ie3xsGj-lg_DPpUeJ_7tLoNtc",
//         pub: "Q3V1zwgCjqMLRIcE5e5a9XflYXQwljMDOz5M_0PQiC0.mTwYsbZ_skKDwhz3wLqyfP1iBphrTL-KqMzVZYKutc0",
//     }
//     const pair3 = {
//         priv: "nNaFrnq7QHqebPkYR1pVEgE4FYVnBXAGXoM00vEr1yg",
//         pub: "dBgXJATrP4KeE6zfuR4_arauMIeT_86MrQg6JbbnuxM.yJXykCW6qjB54B29by8vIWoMwk8T5NG_3awHdKC9Bgc",
//     }
//     // console.log(gun);
//     // @ts-ignore
//     const user = gun.user().auth(pair2);
//
//     // console.log(user);
//
//     // user.get('posts').get('0x1234567893').put({ "hello": 'i am pair 3!'});
//     // user.get('posts').get('0x1234567891').put({ "type": 'i am pair 3!', payload: { number: 2 }});
//     // gun.user(pair3.pub)
//     //     .get('posts')
//     //     .map(((post, id) => console.log(post, id)));
// });

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