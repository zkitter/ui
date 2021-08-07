
import {applyMiddleware, combineReducers, createStore} from "redux";
import web3 from "../ducks/web3";
import thunk from "redux-thunk";
import {createLogger} from "redux-logger";

const rootReducer = combineReducers({
    web3,
});

export type AppRootState = ReturnType<typeof rootReducer>;

export default function configureAppStore() {
    return createStore(
        rootReducer,
        process.env.NODE_ENV === 'development'
            ? applyMiddleware(thunk, createLogger({
                collapsed: (getState, action) => [''].includes(action.type),
            }))
            : applyMiddleware(thunk),
    );
}