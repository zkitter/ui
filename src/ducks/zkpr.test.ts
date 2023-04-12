import { ducks, fetchStub, postWorkMessageStub, store, zkprStub } from '~/testUtils';

const {
  zkpr: { connectZKPR },
} = ducks;

describe('ZKPR duck', () => {
  it('should connect to zkpr', async () => {
    fetchStub.returns(
      // @ts-ignore
      Promise.resolve({
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
      })
    );
    // @ts-ignore
    await store.dispatch(connectZKPR());
    expect(store.getState().zkpr.idCommitment).toBe('291');

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
