import React from "react";
import ReactDOM from "react-dom";
import {act} from "react-dom/test-utils";
import {Provider} from "react-redux";
import {ducks, store} from "../../util/testUtils";
import Web3Button from "./index";
import {setSelectedId} from "../../ducks/worker";
import {ZkIdentity} from "@zk-kit/identity";

describe('<Web3Button>', () => {
    const root = document.createElement('div');

    it ('should mount', async () => {
        act(() => {
            ReactDOM.render(
                <Provider store={store}>
                    <Web3Button />
                </Provider>,
                root,
            )
        });

        expect(root.textContent).toBe('Add a user');
    });

    it ('should render gun identity', async () => {
        await store.dispatch(ducks.worker.setSelectedId({
            type: "gun",
            address: '0xgunuser',
            privateKey: '0xpriv',
            publicKey: '0xpub',
            nonce: 1,
        }));
        expect(root.textContent).toBe('0xgunu...user');
    });

    it ('should render gun identity', async () => {
        const id = new ZkIdentity();
        await store.dispatch(ducks.worker.setSelectedId({
            type: "interrep",
            nonce: 0,
            address: '0xinterrep',
            identityCommitment: id.genIdentityCommitment().toString(16),
            serializedIdentity: id.serializeIdentity(),
            provider: 'twitter',
            name: 'gold',
            identityPath: null,
        }));
        expect(root.textContent).toBe('Incognito');
    });

    it ('should render zkpr identity', async () => {
        const id = new ZkIdentity();
        await store.dispatch(ducks.worker.setSelectedId({
            type: "zkpr_interrep",
            identityCommitment: id.genIdentityCommitment().toString(16),
            provider: 'twitter',
            name: 'gold',
            identityPath: null,
        }));
        expect(root.textContent).toBe('Connected to ZKPR');
    });


});
