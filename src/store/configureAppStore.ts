import {applyMiddleware, combineReducers, createStore} from "redux";
import { save, load } from 'redux-localstorage-simple';
import web3, {initialState as web3InitialState} from "../ducks/web3";
import posts from "../ducks/posts";
import users from "../ducks/users";
import drafts from "../ducks/drafts";
import thunk from "redux-thunk";
import {createLogger} from "redux-logger";
import snapshot from "../ducks/snapshot";

const rootReducer = combineReducers({
    web3,
    posts,
    users,
    drafts,
    snapshot,
});

export type AppRootState = ReturnType<typeof rootReducer>;

const createStoreWithMiddleware = process.env.NODE_ENV === 'development'
    ? applyMiddleware(
        thunk,
        createLogger({
            collapsed: true,
        }),
        save({
            states: ['web3.pending.createRecordTx'],
        })
    )(createStore)
    : applyMiddleware(
        thunk,
        save({
            states: ['web3.pending.createRecordTx'],
        })
    )(createStore);


export default function configureAppStore() {
    return createStoreWithMiddleware(
        rootReducer,
        load({
            states: ['web3.pending.createRecordTx'],
            preloadedState: {
                web3: web3InitialState,
            },
        }),
    );
}