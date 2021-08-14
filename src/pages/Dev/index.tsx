import React, {ReactElement, useCallback, useEffect, useState} from "react";
import Web3Button from "../../components/Web3Button";
import {
    addGunKeyToTextRecord,
    generateGunKeyPair,
    useENSName,
    useGunKey,
    useWeb3,
    useWeb3Loading,
} from "../../ducks/web3";
import Button from "../../components/Button";
import {useDispatch} from "react-redux";
import Input from "../../components/Input";
import Textarea from "../../components/Textarea";
import {MessageType, Post, PostJSON, PostMessageSubType} from "../../util/message";
import gun, {authenticateGun} from "../../util/gun";
import {fetchPosts, usePostIds, usePostsMap} from "../../ducks/posts";

export default function Dev(): ReactElement {
    const ensName = useENSName();
    const web3Loading = useWeb3Loading();
    const web3 = useWeb3();
    const gunKey = useGunKey();
    const postIds = usePostIds();
    const postsMap = usePostsMap();
    const dispatch = useDispatch();

    const [genKey, setGenKey] = useState<{pub: string; priv: string}|null>(null);
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [replyId, setReplyId] = useState('');
    const [postHex, setPostHex] = useState<string|null>(null);
    const [postJson, setPostJson] = useState<PostJSON|null>(null);

    const loggedIn = !!ensName && !!genKey;

    const generateGunKeys = useCallback(async () => {
        setGenKey(null);
        const result = await dispatch(generateGunKeyPair(0));
        authenticateGun(result as any);
        setGenKey(result as any);
    }, [dispatch, web3]);

    const addGunTextRecord = useCallback(async () => {
        const result = await dispatch(generateGunKeyPair(0));
        await dispatch(addGunKeyToTextRecord((result as any).pub));
    }, [dispatch, web3, ensName]);

    const hydratePost = useCallback(async () => {
        if (!ensName) {
            setPostHex('');
            setPostJson(null);
            return;
        }

        const post = new Post({
            type: MessageType.Post,
            subtype: PostMessageSubType.Default,
            creator: ensName,
            payload: {
                title: title,
                content: body,
                reference: replyId,
            },
        });

        const newPost = Post.fromHex(await post.toHex());
        setPostHex(newPost.toHex());
        setPostJson(await newPost.toJSON());
    }, [title, body, ensName, replyId]);

    const createPost = useCallback(async () => {
        if (!genKey || !postJson) return;

        const post = new Post({
            type: MessageType.Post,
            subtype: PostMessageSubType.Default,
            creator: ensName,
            payload: {
                title: title,
                content: body,
                reference: replyId,
            },
        });

        const {
            messageId,
            hash,
            ...json
        } = await post.toJSON();

        try {
            // @ts-ignore
            await gun.user()
                .get('message')
                .get(messageId)
                // @ts-ignore
                .put(json);

            setTitle('');
            setBody('');
            setReplyId('');
            setPostHex('');
            setPostJson(null);
        } catch (e) {
            console.error(e);
        }

    }, [title, body, ensName, replyId]);

    useEffect(() => {
        hydratePost();
    }, [title, body, ensName, replyId]);

    useEffect(() => {
        dispatch(fetchPosts());
    }, []);

    return (
        <div style={{ cursor: 'default' }}>
            <Web3Button
                onConnect={generateGunKeys}
                onDisconnect={() => setGenKey(null)}
            />
            <div style={{ marginTop: '8px' }}>
                <b>ENS Name: </b>
                <span>{web3Loading ? 'Loading...' : ensName || '-'}</span>
            </div>

            <div style={{ marginTop: '8px', marginBottom: '8px' }}>
                <b>Text Record (gun.social): </b>
                <span>
                    {
                        web3Loading
                            ? 'Loading...'
                            : gunKey
                                ? gunKey
                                : (
                                    <Button
                                        onClick={addGunTextRecord}
                                        disabled={!ensName}
                                    >
                                        Add GUN pubkey
                                    </Button>
                                )
                    }
                </span>
            </div>

            <div style={{ marginTop: '8px' }}>
                <b style={{ marginRight: '8px' }}>Generated GUN Keys:</b>
            </div>

            <div style={{ fontSize: '12px', fontFamily: 'monospace', marginLeft: '8px'}}>
                <div style={{ marginTop: '8px' }}>
                    <b>Account Index: </b>
                    <span>0</span>
                </div>
                <div>
                    <b>Public Key : </b>
                    <span>{genKey?.pub || '-'}</span>
                </div>
                <div style={{ marginBottom: '8px' }}>
                    <b>Private Key: </b>
                    <span>{genKey?.priv || '-'}</span>
                </div>
            </div>

            <div style={{ marginTop: '16px' }}>
                <b style={{ marginRight: '8px' }}>Post Editor:</b>

                <div style={{ marginTop: '8px', marginLeft: '8px' }}>
                    <b style={{ marginRight: '8px' }}>Title:</b>
                    <Input
                        type="text"
                        disabled={!loggedIn}
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                    />
                </div>
                <div style={{ marginTop: '8px', marginLeft: '8px' }}>
                    <b style={{ marginRight: '8px' }}>Replying To:</b>
                    <Input
                        type="text"
                        disabled={!loggedIn}
                        value={replyId}
                        onChange={e => setReplyId(e.target.value)}
                    />
                </div>

                <div style={{ display: 'flex', flexFlow: 'row nowrap' }}>
                    <div style={{ marginTop: '8px', marginLeft: '8px' }}>
                        <b style={{ marginRight: '8px' }}>Body:</b>
                        <Textarea
                            style={{ resize: 'none', height: '120px', width: '300px' }}
                            disabled={!ensName || !genKey}
                            value={body}
                            onChange={e => setBody(e.target.value)}
                        />
                    </div>
                    <div style={{ marginTop: '8px', marginLeft: '8px' }}>
                        <b style={{ marginRight: '8px' }}>Post Hex:</b>
                        <Textarea
                            style={{ resize: 'none', height: '120px', width: '300px' }}
                            disabled={true}
                            value={postHex || ''}
                            onChange={e => setTitle(e.target.value)}
                        />
                    </div>

                    <div style={{ marginTop: '8px', marginLeft: '8px' }}>
                        <b style={{ marginRight: '8px' }}>Post JSON:</b>
                        <Textarea
                            style={{ resize: 'none', height: '120px', width: '300px' }}
                            disabled={true}
                            value={postJson ? JSON.stringify(postJson) : ''}
                            onChange={e => setTitle(e.target.value)}
                        />
                    </div>
                </div>


                <Button
                    onClick={createPost}
                    disabled={(!title && !body) || !loggedIn}
                >
                    Post
                </Button>
            </div>


            <div style={{ marginTop: '16px', width: '600px' }}>
                <b style={{ marginRight: '8px'}}>Posts Feed:</b>
                {
                    postIds.map((messageId: string) => {
                        const post = postsMap[messageId];

                        return post && (
                            <div
                                key={messageId}
                                style={{
                                    margin: '8px',
                                    backgroundColor: 'rgba(0,0,0,0.05)',
                                }}
                            >
                                <div style={{ marginTop: '8px', fontSize: '14px' }}>
                                    <b>From: </b>
                                    <span>{post.creator} at {post.createdAt.toLocaleString()}</span>
                                </div>
                                <div style={{ marginTop: '8px', fontSize: '14px'  }}>
                                    <b>Title: </b>
                                    <span>
                                        {!!post.payload.topic && <span>[{post.payload.topic}]</span> }
                                        {post.payload.title}
                                    </span>
                                </div>
                                <div style={{ marginTop: '8px' }}>
                                    {post.payload.content}
                                </div>
                                <Button
                                    disabled={!loggedIn || replyId === messageId}
                                    onClick={() => setReplyId(messageId)}
                                >
                                    {`Reply (${post.meta.replyCount})`}
                                </Button>
                                <Button
                                    disabled={!loggedIn}
                                >
                                    {`Repost (${post.meta.repostCount})`}
                                </Button>
                                <Button
                                    disabled={!loggedIn}
                                >
                                    {`Like (${post.meta.likeCount})`}
                                </Button>
                            </div>
                        )
                    })
                }
            </div>
        </div>
    );
}