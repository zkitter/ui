import {store, ducks, fetchStub} from "../util/testUtils";

const {
    users: {
        fetchAddressByName,
        fetchUsers,
        getUser,
        resetUser,
        searchUsers,
        setFollowed,
    },
} = ducks;

describe('Users Duck', () => {
   it('should initialize', async () => {
        expect(store.getState().users).toStrictEqual({
            map: {},
        });
   });

   it('should fetch address by name', async () => {
       // @ts-ignore
       await store.dispatch(fetchAddressByName('yagamilight.eth'));
       expect(store.getState().users.map['0xd44a82dD160217d46D754a03C8f841edF06EBE3c'])
           .toStrictEqual({
               ens: 'yagamilight.eth',
               username: '0xd44a82dD160217d46D754a03C8f841edF06EBE3c',
               address: '0xd44a82dD160217d46D754a03C8f841edF06EBE3c',
           });
   });

   it('should get user', async () => {
       const user = {
           address: '0xd44a82dD160217d46D754a03C8f841edF06EBE3c',
           ens: 'yagamilight.eth',
           username: '0xd44a82dD160217d46D754a03C8f841edF06EBE3c',
           name: 'yagami',
           pubkey: 'pubkey',
           bio: 'my bio',
           profileImage: 'http://profile.image',
           coverImage: 'http://cover.image',
           twitterVerification: 'http://twitter/123',
           website: '',
           joinedAt: 1,
           joinedTx: '0xjoinedtxhash',
           type: 'arbitrum',
           meta: {
               followerCount: 2,
               followingCount: 2,
               blockedCount: 2,
               blockingCount: 2,
               postingCount: 2,
               followed: 2,
               blocked: 2,
           },
       };
      // @ts-ignore
      fetchStub.returns(Promise.resolve({
          json: async () => ({ payload: user }),
      }));
      // @ts-ignore
      await store.dispatch(getUser('yagamilight.eth'));
      expect(store.getState().users.map['0xd44a82dD160217d46D754a03C8f841edF06EBE3c'])
          .toStrictEqual(user);
      fetchStub.reset();
   });

   it('should fetch users', async () => {
       const user1 = {
           address: '0x001',
           ens: '0x001.eth',
           username: '0x001',
       };
       const user2 = {
           address: '0x002',
           ens: '0x002.eth',
           username: '0x002',
       };
      // @ts-ignore
      fetchStub.returns(Promise.resolve({
          json: async () => ({ payload: [user1, user2] }),
      }));
      // @ts-ignore
      await store.dispatch(fetchUsers());
      expect(store.getState().users.map['0x001'].ens).toBe('0x001.eth');
      expect(store.getState().users.map['0x002'].ens).toBe('0x002.eth');
      fetchStub.reset();
   });

   it('should search users', async () => {
       const user3 = {
           address: '0x003',
           ens: '0x003.eth',
           username: '0x003',
       };
       const user4 = {
           address: '0x004',
           ens: '0x004.eth',
           username: '0x004',
       };
      // @ts-ignore
      fetchStub.returns(Promise.resolve({
          json: async () => ({ payload: [user3, user4] }),
      }));
      // @ts-ignore
      const users: any = await store.dispatch(searchUsers('heyo'));

      expect(fetchStub.args[0][0]).toBe('http://127.0.0.1:3000/v1/users/search/heyo?limit=5');
      expect(users[0].ens).toBe('0x003.eth');
      expect(users[1].ens).toBe('0x004.eth');

      fetchStub.reset();
   });

   it('should set followed', async () => {
       // @ts-ignore
       store.dispatch(setFollowed('0x002', '0xfollowhash'));
       expect(store.getState().users.map['0x002'].meta.followed).toBe('0xfollowhash');
   });

   it('should reset', async () => {
       // @ts-ignore
       store.dispatch(resetUser());
       expect(store.getState().users.map).toStrictEqual({});
   });
});