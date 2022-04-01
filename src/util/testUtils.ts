import "isomorphic-fetch";
import sinon from "sinon";
import originalStore from "../store/configureAppStore";
import * as drafts from "../ducks/drafts";
import * as posts from "../ducks/posts";
import * as worker from "../ducks/worker";
import * as users from "../ducks/users";
import * as web3 from "../ducks/web3";
import * as zkpr from "../ducks/zkpr";
import * as mods from "../ducks/mods";
import originalGun from "../util/gun";
import {Semaphore} from "@zk-kit/protocols";

export const dispatchSpy = sinon.spy(originalStore, 'dispatch');

export const store = originalStore;

// @ts-ignore
sinon.stub(Semaphore, 'genWitness').returns(Promise.resolve({}));
// @ts-ignore
sinon.stub(Semaphore, 'genProof').returns(Promise.resolve({}));

// @ts-ignore
export const fetchStub = sinon.stub(window, 'fetch').returns(Promise.resolve({
    status: 200,
    json: async () => ({ payload: 'ok' }),
    text: async () => 'ok',
}));

export const fetchReset = () => {
    fetchStub.reset();
    // @ts-ignore
    fetchStub.returns(Promise.resolve({
        status: 200,
        json: async () => ({ payload: 'ok' }),
        text: async () => 'ok',
    }));
    return fetchStub;
}

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
