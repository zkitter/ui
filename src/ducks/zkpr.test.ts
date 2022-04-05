import sinon from "sinon";
import {store, ducks, fetchStub, zkprStub, postWorkMessageStub} from "../util/testUtils";
const {
    zkpr: {
      connectZKPR,
      createZKPRIdentity,
      maybeSetZKPRIdentity,
    },
} = ducks;

describe('ZKPR duck', () => {
    it('should connect to zkpr', async () => {
        // @ts-ignore
        fetchStub.returns(Promise.resolve({
            json: async () => ({
                payload: {
                    name: 'Twitter',
                    provider: 'diamond',
                    data: {
                        siblings: ['0x1', '0x2'],
                        pathIndices: [0, 2],
                        root: ['0x3'],
                    },
                },
            }),
        }))
        // @ts-ignore
        const id = await store.dispatch(connectZKPR());
        expect(id).toStrictEqual({
            type: 'zkpr_interrep',
            provider: 'diamond',
            name: 'Twitter',
            identityPath: { path_elements: [ '1', '2' ], path_index: [ 0, 2 ], root: '3' },
            identityCommitment: '291'
        });

        const onLogout = zkprStub.on.args[0][1];
        const onIdentityChanged = zkprStub.on.args[1][1];

        expect(store.getState().zkpr.zkpr).toBeTruthy();

        onIdentityChanged('45678');
        expect(store.getState().zkpr.idCommitment).toBe('284280');

        onLogout();
        expect(store.getState().zkpr.zkpr).toBeFalsy();

        fetchStub.reset();
        postWorkMessageStub.reset();
    });
});
