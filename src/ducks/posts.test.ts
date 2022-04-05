import {ducks, fetchStub, gunStub, store} from '../util/testUtils';
import {MessageType, Post, PostMessageSubType} from "../util/message";

const {
    posts: {
        fetchPosts,
        fetchMeta,
        fetchPost,
        fetchReplies,
        fetchTagFeed,
        fetchHomeFeed,
        fetchLikedBy,
        fetchRepliedBy,
        setPost,
        setLiked,
        setReposted,
        setBlockedPost,
        incrementRepost,
        incrementReply,
        incrementLike,
        decrementRepost,
        decrementLike,
        unsetPost,
    }
} = ducks;

describe('Posts Duck', () => {
    it('should return initial state', async () => {
        expect(store.getState().posts).toStrictEqual({ map: {}, meta: {}});
    });

    it('should fetch meta', async () => {
        const messageId = '0xmeta/0000000000000000000000000000000000000000000000000000000000000000';
        // @ts-ignore
        fetchStub.returns(Promise.resolve({
            json: async () => ({
                payload: {
                    messageId: messageId,
                    meta: {
                        likeCounts: 11,
                    },
                },
            }),
        }))
        // @ts-ignore
        await store.dispatch(fetchMeta(messageId));
        expect(fetchStub.args[0][0])
            .toBe('http://127.0.0.1:3000/v1/post/0000000000000000000000000000000000000000000000000000000000000000');
        expect(store.getState().posts.meta[messageId])
            .toStrictEqual({likeCounts: 11});
        fetchStub.reset();
    });

    it('should fetch post', async () => {
        const messageId = 'e6789d8ea65b57efd365ada389924246e4bd7be9c109a7fe294646831f67db8b';
        gunStub.get.withArgs('message/e6789d8ea65b57efd365ada389924246e4bd7be9c109a7fe294646831f67db8b')
            // @ts-ignore
            .returns(Promise.resolve({
                type: 'POST',
                'subtype': 'REPLY',
                createdAt: 1,
                payload: {
                    '#': 'payload',
                },
            }))
            // @ts-ignore
            .withArgs('payload').returns(Promise.resolve({ content: 'fetch post' }));
        // @ts-ignore
        fetchStub.returns(Promise.resolve({
            json: async () => ({
                payload: {
                    name: '',
                },
            })
        }));
        // @ts-ignore
        await store.dispatch(fetchPost(messageId));
        expect(store.getState().posts.map[messageId].hash())
            .toBe(messageId);
        fetchStub.reset();
    });

    it('should fetch posts', async () => {
        // @ts-ignore
        fetchStub.returns(Promise.resolve({
            json: async () => ({
                payload: [
                    { messageId: '0000000000000000000000000000000000000000000000000000000000000000', type: MessageType.Post, subtype: PostMessageSubType.Default, payload: { content: 'test 1' }, createdAt: 1, meta: { likeCount: 12 } },
                    { messageId: '0000000000000000000000000000000000000000000000000000000000000000', type: MessageType.Post, subtype: PostMessageSubType.Default, payload: { content: 'test 2' }, createdAt: 1, meta: { likeCount: 13 } },
                ],
            })
        }));
        // @ts-ignore
        await store.dispatch(fetchPosts());
        const map = store.getState().posts.map;
        expect(fetchStub.args[0][0])
            .toBe('http://127.0.0.1:3000/v1/posts?limit=10&offset=0');
        expect(map['0657166868848f6b37debc5833112be36266dbfc8ec4f45c235372306fdfe965'].payload.content)
            .toBe('test 1');
        expect(map['5775c1181556da4a0f1a1f378006ec71a131f3cd5f759bc852df97748b1d9935'].payload.content)
            .toBe('test 2');
        fetchStub.reset();
    });

    it('should fetch liked by', async () => {
        // @ts-ignore
        fetchStub.returns(Promise.resolve({
            json: async () => ({
                payload: [
                    { messageId: '0000000000000000000000000000000000000000000000000000000000000000', type: MessageType.Post, subtype: PostMessageSubType.Reply, payload: { content: 'like 1' }, createdAt: 1, meta: { likeCount: 17 } },
                    { messageId: '0000000000000000000000000000000000000000000000000000000000000000', type: MessageType.Post, subtype: PostMessageSubType.MirrorPost, payload: { content: 'like 2' }, createdAt: 1, meta: { likeCount: 17 } },
                ],
            })
        }));
        // @ts-ignore
        await store.dispatch(fetchLikedBy('0xuser'));
        const map = store.getState().posts.map;

        expect(fetchStub.args[0][0])
            .toBe('http://127.0.0.1:3000/v1/0xuser/likes?limit=10&offset=0');
        expect(map['67b5f4334815476783316977c9608633219705a3eceb00c39a88ce173705f67f'].payload.content)
            .toBe('like 1');
        expect(map['20d0bcb1b075de4e49d0adb7efd10becbf547ce2c46a2ddf01d48c83964fdfc5'].payload.content)
            .toBe('like 2');
        fetchStub.reset();
    });

    it('should fetch replied by', async () => {
        // @ts-ignore
        fetchStub.returns(Promise.resolve({
            json: async () => ({
                payload: [
                    { messageId: '0000000000000000000000000000000000000000000000000000000000000000', type: MessageType.Post, subtype: PostMessageSubType.Reply, payload: { content: 'reply 1' }, createdAt: 1, meta: { likeCount: 17 } },
                    { messageId: '0000000000000000000000000000000000000000000000000000000000000000', type: MessageType.Post, subtype: PostMessageSubType.MirrorReply, payload: { content: 'reply 2' }, createdAt: 1, meta: { likeCount: 17 } },
                ],
            })
        }));
        // @ts-ignore
        await store.dispatch(fetchRepliedBy('0xuser'));
        const map = store.getState().posts.map;

        expect(fetchStub.args[0][0])
            .toBe('http://127.0.0.1:3000/v1/0xuser/replies?limit=10&offset=0');
        expect(map['86e976c49fcdb572e95bdb58ecb4c38b6a4e6e6d132fda8cb910c8a627a8de87'].payload.content)
            .toBe('reply 1');
        expect(map['6c190cc667449d4867391c2bf6c4c17839143b036e92ed04dd07379d01b9bf7e'].payload.content)
            .toBe('reply 2');
        fetchStub.reset();
    });

    it('should fetch homefed', async () => {
        // @ts-ignore
        fetchStub.returns(Promise.resolve({
            json: async () => ({
                payload: [
                    { messageId: '0000000000000000000000000000000000000000000000000000000000000000', type: MessageType.Post, subtype: PostMessageSubType.Default, payload: { content: 'homefeed 1' }, createdAt: 1, meta: { likeCount: 17 } },
                    { messageId: '0000000000000000000000000000000000000000000000000000000000000000', type: MessageType.Post, subtype: PostMessageSubType.Default, payload: { content: 'homefeed 2' }, createdAt: 1, meta: { likeCount: 17 } },
                ],
            })
        }));
        // @ts-ignore
        await store.dispatch(fetchHomeFeed());
        const map = store.getState().posts.map;

        expect(fetchStub.args[0][0])
            .toBe('http://127.0.0.1:3000/v1/homefeed?limit=10&offset=0');
        expect(map['04475753c11b8a9a1e9b8fd63d822e416c963b611ef7e09acf74583d4ca32f79'].payload.content)
            .toBe('homefeed 1');
        expect(map['b5ccff8a5d242605599e182a29c08932d99bda45b8d0b149c8ddee19bb2ba6bf'].payload.content)
            .toBe('homefeed 2');
        fetchStub.reset();
    });

    it('should fetch tagfeed', async () => {
        // @ts-ignore
        fetchStub.returns(Promise.resolve({
            json: async () => ({
                payload: [
                    { messageId: '0000000000000000000000000000000000000000000000000000000000000000', type: MessageType.Post, subtype: PostMessageSubType.Default, payload: { content: '#tagfeed 1' }, createdAt: 1, meta: { likeCount: 17 } },
                    { messageId: '0000000000000000000000000000000000000000000000000000000000000000', type: MessageType.Post, subtype: PostMessageSubType.Default, payload: { content: '#tagfeed 2' }, createdAt: 1, meta: { likeCount: 17 } },
                ],
            })
        }));
        // @ts-ignore
        await store.dispatch(fetchTagFeed('#tagfeed'));
        const map = store.getState().posts.map;

        expect(fetchStub.args[0][0])
            .toBe('http://127.0.0.1:3000/v1/tags/%23tagfeed?limit=10&offset=0');
        expect(map['0a8a52534ffaf357dd35061f127fa3c2628e29f4e0a7939e0c503a467130128a'].payload.content)
            .toBe('#tagfeed 1');
        expect(map['b30fa8424d3db0889ddb39d968f5a8b7df4b4b847b0ed1e5df1f74f834cba463'].payload.content)
            .toBe('#tagfeed 2');
        fetchStub.reset();
    });

    it('should fetch replies', async () => {
        // @ts-ignore
        fetchStub.returns(Promise.resolve({
            json: async () => ({
                payload: [
                    { messageId: '0000000000000000000000000000000000000000000000000000000000000000', type: MessageType.Post, subtype: PostMessageSubType.Default, payload: { content: 'replies 3' }, createdAt: 1, meta: { likeCount: 17 } },
                    { messageId: '0000000000000000000000000000000000000000000000000000000000000000', type: MessageType.Post, subtype: PostMessageSubType.Default, payload: { content: 'replies 4' }, createdAt: 1, meta: { likeCount: 17 } },
                ],
            })
        }));
        // @ts-ignore
        await store.dispatch(fetchReplies('0xparent'));
        const map = store.getState().posts.map;

        expect(fetchStub.args[0][0])
            .toBe('http://127.0.0.1:3000/v1/replies?limit=10&offset=0&parent=0xparent');
        expect(map['4a524cdf0239a6fc465ada54fa1d0b568c186ca03054607b7463f16c14c56f2d'].payload.content)
            .toBe('replies 3');
        expect(map['997c84ed80660c89403b530b2e3fc8a8af061de6609415375ccbc4adb34f12e3'].payload.content)
            .toBe('replies 4');
        fetchStub.reset();
    });

    it('should handle meta', async () => {
        await store.dispatch(incrementLike('0xtestmeta'));
        await store.dispatch(incrementReply('0xtestmeta'));
        await store.dispatch(incrementRepost('0xtestmeta'));
        await store.dispatch(setLiked('0xtestmeta', '0xlikedtestmeta'));
        await store.dispatch(setReposted('0xtestmeta', '0xrepostedtestmeta'));
        await store.dispatch(setBlockedPost('0xtestmeta', '0xblockedtestmeta'));
        expect(store.getState().posts.meta['0xtestmeta'])
            .toStrictEqual({
                likeCount: 1,
                replyCount: 1,
                repostCount: 1,
                liked: '0xlikedtestmeta',
                reposted: '0xrepostedtestmeta',
                blocked: '0xblockedtestmeta'
            });
        await store.dispatch(decrementLike('0xtestmeta'));
        await store.dispatch(decrementRepost('0xtestmeta'));
        await store.dispatch(setLiked('0xtestmeta', null));
        await store.dispatch(setReposted('0xtestmeta', null));
        await store.dispatch(setBlockedPost('0xtestmeta', null));
        expect(store.getState().posts.meta['0xtestmeta'])
            .toStrictEqual({
                likeCount: 0,
                replyCount: 1,
                repostCount: 0,
                liked: null,
                reposted: null,
                blocked: null,
            });
    });
});