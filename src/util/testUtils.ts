import 'isomorphic-fetch';
import { TextDecoder, TextEncoder } from 'util';
import sinon from 'sinon';

import originalStore from '../store/configureAppStore';
import * as drafts from '@ducks/drafts';
import * as posts from '@ducks/posts';
import * as worker from '@ducks/worker';
import * as users from '@ducks/users';
import * as web3 from '@ducks/web3';
import * as zkpr from '@ducks/zkpr';
import * as mods from '@ducks/mods';
import originalGun from '~/gun';
import { Semaphore } from '@zk-kit/protocols';
import * as swModules from './sw';
import * as swUtilsModules from '../serviceWorkers/util';
// @ts-ignore
global.TextEncoder = TextEncoder;
// @ts-ignore
global.TextDecoder = TextDecoder;

export const pushReduxActionStub = sinon.stub(swUtilsModules, 'pushReduxAction');

export const zkprStub = {
  on: sinon.stub().returns(Promise.resolve('ok')),
  getActiveIdentity: sinon.stub().returns(Promise.resolve('0123')),
  createIdentity: sinon.stub().returns(Promise.resolve('ok')),
  semaphoreProof: sinon.stub().returns(Promise.resolve('proof')),
};

// @ts-ignore
global.zkpr = {
  connect: () => zkprStub,
};

export const postWorkMessageStub = sinon.stub(swModules, 'postWorkerMessage');

export const dispatchSpy = sinon.spy(originalStore, 'dispatch');

export const store = originalStore;

export const web3Stub = {
  eth: {
    net: {
      getNetworkType: sinon.stub().returns(Promise.resolve('main')),
    },
    personal: {
      sign: sinon.stub().returns('somesignature'),
    },
    getAccounts: sinon.stub().returns(['0x0000000000000000000000000000000000000000']),
  },
  currentProvider: {
    on: sinon.stub(),
  },
};

// @ts-ignore
sinon.stub(Semaphore, 'genWitness').returns(Promise.resolve({}));
// @ts-ignore
sinon.stub(Semaphore, 'genProof').returns(Promise.resolve({}));

export const fetchStub = sinon.stub(window, 'fetch').returns(
  // @ts-ignore
  Promise.resolve({
    status: 200,
    json: async () => ({ payload: 'ok' }),
    text: async () => 'ok',
  })
);

export const fetchReset = () => {
  fetchStub.reset();
  fetchStub.returns(
    // @ts-ignore
    Promise.resolve({
      status: 200,
      json: async () => ({ payload: 'ok' }),
      text: async () => 'ok',
    })
  );
  return fetchStub;
};

export const mockGun: any = {
  is: true,
  leave: sinon.stub(),
  auth: sinon.stub(),
  get: sinon.stub(),
  put: sinon.stub(),
};

mockGun.get.returns(mockGun);
mockGun.put.returns(Promise.resolve(mockGun));

export const gunStub = {
  user: sinon.stub(originalGun, 'user').returns(mockGun),
  get: sinon.stub(originalGun, 'get').returns(mockGun),
  put: sinon.stub(originalGun, 'put').returns(mockGun),
};

export const ducks = {
  web3,
  zkpr,
  posts,
  users,
  drafts,
  worker,
  mods,
};
