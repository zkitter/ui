import { applyMiddleware, combineReducers, createStore } from 'redux';
import { load, save } from 'redux-localstorage-simple';
import { createLogger } from 'redux-logger';
import thunk from 'redux-thunk';

import app from '../ducks/app';
import chats from '../ducks/chats';
import drafts from '../ducks/drafts';
import mods from '../ducks/mods';
import posts from '../ducks/posts';
import users from '../ducks/users';
import web3, { initialState as web3InitialState } from '../ducks/web3';
import worker from '../ducks/worker';
import zkpr from '../ducks/zkpr';

const rootReducer = combineReducers({
  app,
  web3,
  zkpr,
  posts,
  users,
  drafts,
  worker,
  mods,
  chats,
});

export type AppRootState = ReturnType<typeof rootReducer>;

const createStoreWithMiddleware =
  process.env.NODE_ENV === 'development'
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

function configureAppStore() {
  return createStoreWithMiddleware(
    rootReducer,
    load({
      states: ['web3.pending.createRecordTx'],
      preloadedState: {
        web3: web3InitialState,
      },
      disableWarnings: true,
    })
  );
}

const store = configureAppStore();

export default store;
