import React, {MouseEventHandler, ReactElement, useCallback, useEffect, useState} from "react";
import {fetchProposal, fetchScores, useProposal, useSpace} from "../../ducks/snapshot";
import classNames from "classnames";
import Avatar from "../Avatar";
import moment from "moment";
import {getUser, useUser} from "../../ducks/users";
import {useDispatch} from "react-redux";
import {fetchNameByAddress} from "../../util/web3";
import DraftEditor from "draft-js-plugins-editor";
import Draft, {CompositeDecorator, convertFromRaw, EditorState} from "draft-js";
import Editor, {markdownConvertOptions} from "../Editor";
import {useHistory} from "react-router";
import Button from "../Button";
import {fetchPost, useMeta, usePost} from "../../ducks/posts";
import {useGunKey, useLoggedIn} from "../../ducks/web3";
import {setDraft, submitModeration, submitPost, submitRepost, useDraft, useSubmitting} from "../../ducks/drafts";
import {ModerationMessageSubType, PostMessageSubType} from "../../util/message";
import {PostButton} from "../Post";
import Modal, {ModalContent, ModalHeader} from "../Modal";
import Icon from "../Icon";
const { markdownToDraft } = require('markdown-draft-js');

type Props = {
    id: string;
    className?: string;
    onClick?: MouseEventHandler;
    expand?: boolean;
    isParent?: boolean;
    repostBy?: string;
};

export default function Proposal(props: Props): ReactElement {
    const {
        expand,
    } = props;

    const proposal = useProposal(props.id);
    const dispatch = useDispatch();

    useEffect(() => {
        if (!proposal) {
            dispatch(fetchProposal(props.id));
        }
    }, [props.id]);

    if (!proposal) return (
        <LoadingProposal {...props} />
    );

    return expand
        ? <ExpandedProposal {...props} />
        : <RegularProposal {...props} />;
}

function RegularProposal(props: Props): ReactElement {
    const [name, setName] = useState('');
    const proposal = useProposal(props.id);
    const user = useUser(name);
    const dispatch = useDispatch();
    const history = useHistory();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const space = useUser(proposal?.spaceId);

    const loadResult = useCallback(async (e) => {
        e.stopPropagation();
        if (!proposal?.id) {
            return;
        }
        setLoading(true);
        try {
            await dispatch(fetchScores(proposal.id));
        } catch (e) {
            setError(e);
        }
        setLoading(false);
    }, [proposal?.id]);

    const gotoAuthor = useCallback(e => {
        e.stopPropagation();

        if (user?.ens) {
            history.push(`/${user.ens}/`);
        } else if (proposal?.author) {
            window.open(`https://etherscan.io/address/${proposal?.author}`);
        }
    }, [user?.ens, proposal?.author]);

    const gotoSpace = useCallback(e => {
        e.stopPropagation();

        if (space?.ens) {
            history.push(`/${space.ens}/proposals`);
        }
    }, [space]);

    useEffect(() => {
        (async function onProposalMount() {
            if (!proposal?.author) {
                return;
            }

            const name = await fetchNameByAddress(proposal.author);

            if (name) {
                dispatch(getUser(name));
                setName(name);
            }
        })()
    }, [proposal?.author]);

    if (!proposal) return <></>;

    let body = proposal.body.split('\n').join(' ').slice(0, 250);
    body = body.length === 250 ? body + '...' : body;

    const editorState = EditorState.createWithContent(
        convertFromRaw(markdownToDraft(body, markdownConvertOptions)),
    );

    const total = proposal.scores.reduce((sum, s) => sum + s, 0);

    return (
        <div
            className={classNames(
                'flex flex-col flex-nowrap',
                'py-3 px-4',
                'bg-white',
                'post',
                props.className,
            )}
            onClick={e => {
                e.stopPropagation();
                props.onClick && props.onClick(e);
            }}
        >
            <div className="flex flex-col flex-nowrap">
                {
                    !!props.repostBy && (
                        <div className="flex flex-row flex-nowrap mb-2 items-center text-xs text-gray-500 font-bold">
                            <Icon className="mr-2" fa="fas fa-retweet" size={.75}/>
                            {props.repostBy} Reposted
                        </div>
                    )
                }
                <div className="flex flex-row flex-nowrap items-center text-xs w-full">
                    <div className="flex flex-row flex-nowrap items-center text-gray-400 mr-1">
                        <span>Proposed by</span>
                        <Avatar
                            address={(name && user) ? '' : proposal.author}
                            name={(name && user) ? name : ''}
                            className="mx-1 w-4 h-4 border"
                        />
                        <span className="cursor-pointer hover:underline">
                            <span onClick={gotoAuthor}>
                                { user?.ens
                                    ? `@${user.ens}`
                                    : `${proposal.author.slice(0, 6)}..${proposal.author.slice(-4)}`
                                }
                            </span>
                        </span>
                        <span className="flex flex-row flex-nowrap items-center ml-1">
                            <span>in</span>
                            <Avatar
                                name={proposal?.spaceId}
                                address={!space?.name ? space?.address : undefined}
                                className="mx-1 w-4 h-4 border"
                            />
                            <span
                                className="cursor-pointer hover:underline"
                                onClick={gotoSpace}
                            >
                                {`@${proposal?.spaceId}`}
                            </span>
                        </span>
                    </div>
                    <div className="text-gray-400 mr-1">•</div>
                    <div className="text-gray-400 hover:underline">
                        {moment(proposal.created).fromNow()}
                    </div>
                    <div className="flex flex-row flex-nowrap flex-grow flex-shrink justify-end">
                    </div>
                </div>

                <div className="flex flex-col flex-nowrap items-start flex-grow flex-shrink">
                    <div className="mt-2 mb-2 text-md font-semibold">
                        {proposal.title}
                    </div>
                    <div className="bg-gray-200 text-gray-400 text-xs py-1 px-2 rounded">
                        {
                            proposal.end.getTime() < Date.now()
                                ? `Ended ${moment(proposal.end).fromNow()}`
                                : `Ending ${moment(proposal.end).toNow()}`
                        }
                    </div>
                    <div className="mt-2 mb-2 text-light w-full text-gray-900">
                        <DraftEditor
                            editorState={editorState}
                            onChange={() => null}
                            customStyleMap={{
                                CODE: {
                                    backgroundColor: '#f6f6f6',
                                    color: '#1c1e21',
                                    padding: '2px 4px',
                                    margin: '0 2px',
                                    borderRadius: '2px',
                                    fontFamily: 'Roboto Mono, monospace',
                                },
                            }}
                            readOnly
                        />
                    </div>
                    <div
                        className={classNames(
                            "flex flex-col flex-nowrap items-center",
                            "w-full pr-2 mb-2",
                            {
                                "bg-gray-50": !proposal.scores.length,
                            }
                        )}
                    >
                        <div className="flex flex-col w-full px-4 py-3 border border-gray-200 rounded-sm ">
                            {proposal.choices.map((choice: string, i: number) => {
                                const score = total ? (proposal.scores[i] || 0) / total : 0;
                                const percentage = total ? `${Math.round(score * 10000)/100}%` : '';

                                return (
                                    <div key={i} className="text-sm my-2 w-full">
                                        <div className="flex flex-row flex-nowrap items-center">
                                            <div className="flex-grow">
                                                {choice}
                                            </div>
                                            <div>{percentage}</div>
                                        </div>
                                        <div className="h-2 w-full bg-gray-100 my-2">
                                            <div
                                                className="h-full bg-green-500 transition-all"
                                                style={{ width: `${score*100}%` }}
                                            />
                                        </div>
                                    </div>
                                )
                            })}
                            { error && <div className="text-sm text-red-500 pb-2">{error}</div>}
                            {!proposal.scores.length && (
                                <div className="flex flex-row flex-nowrap items-center justify-center">
                                    <Button
                                        className="text-sm"
                                        btnType="primary"
                                        onClick={loadResult}
                                        loading={loading}
                                    >
                                        Load Result
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <ProposalFooter
                    proposalId={proposal.id}
                    className="mt-2 pt-3 border-t border-gray-200 w-full"
                />
            </div>
        </div>
    );
}


function ExpandedProposal(props: Props): ReactElement {
    const [name, setName] = useState('');
    const proposal = useProposal(props.id);
    const user = useUser(name);
    const dispatch = useDispatch();
    const history = useHistory();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const space = useUser(proposal?.spaceId);

    const loadResult = useCallback(async (e) => {
        e.stopPropagation();
        if (!proposal?.id) {
            return;
        }
        setLoading(true);
        try {
            await dispatch(fetchScores(proposal.id));
        } catch (e) {
            setError(e);
        }
        setLoading(false);
    }, [proposal?.id]);

    const gotoAuthor = useCallback(e => {
        e.stopPropagation();

        if (user?.ens) {
            history.push(`/${user.ens}/`);
        } else if (proposal?.author) {
            window.open(`https://etherscan.io/address/${proposal?.author}`);
        }
    }, [user?.ens, proposal?.author]);

    const gotoSpace = useCallback(e => {
        e.stopPropagation();

        if (space?.ens) {
            history.push(`/${space.ens}/proposals`);
        }
    }, [space]);

    useEffect(() => {
        (async function onProposalMount() {
            if (!proposal?.author) {
                return;
            }

            const name = await fetchNameByAddress(proposal.author);

            if (name) {
                dispatch(getUser(name));
                setName(name);
            }
        })()
    }, [proposal?.author]);

    if (!proposal) return <></>;

    const editorState = EditorState.createWithContent(
        convertFromRaw(markdownToDraft(proposal.body, markdownConvertOptions)),
    );

    return (
        <div
            className={classNames(
                'flex flex-col flex-nowrap',
                'py-3 px-4',
                'bg-white',
                'post',
                props.className,
            )}
            onClick={e => {
                e.stopPropagation();
                props.onClick && props.onClick(e);
            }}
        >
            <div className="flex flex-col flex-nowrap">
                {
                    !!props.repostBy && (
                        <div className="flex flex-row flex-nowrap mb-2 items-center text-xs text-gray-500 font-bold">
                            <Icon className="mr-2" fa="fas fa-retweet" size={.75}/>
                            {props.repostBy} Reposted
                        </div>
                    )
                }
                <div className="flex flex-row flex-nowrap items-center text-xs w-full">
                    <div className="flex flex-row flex-nowrap items-center text-gray-400 mr-1">
                        <span>Proposed by</span>
                        <Avatar
                            address={(name && user) ? '' : proposal.author}
                            name={(name && user) ? name : ''}
                            className="mx-1 w-4 h-4 border"
                        />
                        <span className="cursor-pointer hover:underline">
                            <span onClick={gotoAuthor}>
                                { user?.ens
                                    ? `@${user.ens}`
                                    : `${proposal.author.slice(0, 6)}..${proposal.author.slice(-4)}`
                                }
                            </span>
                        </span>
                        <span className="flex flex-row flex-nowrap items-center ml-1">
                            <span>in</span>
                            <Avatar
                                name={proposal?.spaceId}
                                address={!space?.name ? space?.address : undefined}
                                className="mx-1 w-4 h-4 border"
                            />
                            <span
                                className="cursor-pointer hover:underline"
                                onClick={gotoSpace}
                            >
                                {`@${proposal?.spaceId}`}
                            </span>
                        </span>
                    </div>
                    <div className="text-gray-400 mr-1">•</div>
                    <div className="text-gray-400 hover:underline">
                        {moment(proposal.created).fromNow()}
                    </div>
                    <div className="flex flex-row flex-nowrap flex-grow flex-shrink justify-end">
                    </div>
                </div>

                <div className="flex flex-col flex-nowrap items-start flex-grow flex-shrink">
                    <div className="mt-2 mb-2 text-md font-semibold">
                        {proposal.title}
                    </div>
                    <div className="bg-gray-200 text-gray-400 text-xs py-1 px-2 rounded">
                        {
                            proposal.end.getTime() < Date.now()
                                ? `Ended ${moment(proposal.end).fromNow()}`
                                : `Ending ${moment(proposal.end).toNow()}`
                        }
                    </div>
                    <div className="mt-2 mb-2 text-light w-full text-gray-900">
                        <DraftEditor
                            editorState={editorState}
                            onChange={() => null}
                            customStyleMap={{
                                CODE: {
                                    backgroundColor: '#f6f6f6',
                                    color: '#1c1e21',
                                    padding: '2px 4px',
                                    margin: '0 2px',
                                    borderRadius: '2px',
                                    fontFamily: 'Roboto Mono, monospace',
                                },
                            }}
                            readOnly
                        />
                    </div>
                </div>
                <ProposalFooter
                    proposalId={proposal.id}
                    className="mt-2 pt-3 border-t border-gray-200 w-full"
                    large
                />
            </div>
        </div>
    );
}

function LoadingProposal(props: Props): ReactElement {
    return (
        <div
            className={classNames(
                'flex flex-col flex-nowrap',
                'py-3 px-4',
                'bg-white',
                'post',
                props.className,
            )}
        >
            <div className="flex flex-col flex-nowrap">
                <div
                    className="flex flex-row flex-nowrap items-center text-sm w-full"
                >
                    <div className="flex flex-row flex-nowrap items-center text-gray-400 mr-1 w-24 h-6 bg-gray-50">
                        <span className="cursor-pointer hover:underline w-24 h-6 bg-gray-50" />
                    </div>
                    <div className="text-gray-400 mr-1">•</div>
                    <div className="text-gray-400 hover:underline w-24 h-6 bg-gray-50" />
                    <div className="flex flex-row flex-nowrap flex-grow flex-shrink justify-end">
                    </div>
                </div>

                <div className="flex flex-col flex-nowrap items-start flex-grow flex-shrink">
                    <div className="mt-4 mb-2 text-md font-semibold" />
                    <div className="mt-2 mb-2 text-light w-full text-gray-900 w-24 h-6 bg-gray-50" />
                    <div
                        className={classNames(
                            "flex flex-col flex-nowrap items-center",
                            "w-full rounded-sm px-4 py-3",
                            "bg-gray-50 h-20",
                        )}
                    />
                </div>
            </div>
        </div>
    );
}

function ProposalFooter(props: {
    className?: string;
    proposalId: string;
    large?: boolean;
}): ReactElement {
    const {large, className, proposalId} = props;
    const meta = useMeta(proposalId);
    const proposal = useProposal(proposalId)
    const loggedIn = useLoggedIn();
    const gunKey = useGunKey();
    const dispatch = useDispatch();
    const [showReply, setShowReply] = useState(false);
    const linkReference = proposal && `https://snapshot.org/#/${proposal.spaceId}/proposal/${proposal.id}`;

    const onLike = useCallback(() => {
        if (!linkReference) return;
        dispatch(submitModeration(linkReference, ModerationMessageSubType.Like));
    }, [linkReference]);

    const onRepost = useCallback(() => {
        if (!linkReference) return;
        dispatch(submitRepost(linkReference));
    }, [linkReference]);

    return (
        <div
            className={classNames(
                "flex flex-row flex-nowrap items-center",
                "post__footer",
                className,
            )}
        >
            { showReply && (
                <ReplyEditorModal
                    onClose={() => setShowReply(false)}
                    proposalId={proposalId}
                />
            )}
            <PostButton
                iconClassName="hover:bg-blue-50 hover:text-blue-400"
                fa="far fa-comments"
                count={meta.replyCount}
                onClick={() => setShowReply(true)}
                large={large}
            />
            <PostButton
                textClassName={classNames({
                    "text-green-400": meta.reposted,
                })}
                iconClassName={classNames(
                    {
                        "hover:bg-green-50 hover:text-green-400": loggedIn,
                        "text-green-400": meta.reposted,
                    },
                )}
                fa="fas fa-retweet"
                count={meta.repostCount}
                onClick={meta.reposted ? undefined : onRepost}
                disabled={!loggedIn || !gunKey.priv}
                large={large}
            />
            <PostButton
                textClassName={classNames({
                    "text-red-400": meta.liked,
                })}
                iconClassName={classNames(
                    {
                        "hover:bg-red-50 hover:text-red-400": loggedIn,
                        "text-red-400": meta.liked,
                    },
                )}
                fa={classNames({
                    "far fa-heart": !meta.liked,
                    "fas fa-heart": meta.liked,
                })}
                count={meta.likeCount}
                onClick={meta.liked ? undefined : onLike}
                disabled={!loggedIn || !gunKey.priv}
                large={large}
            />
        </div>
    );
}

type ReplyEditorModalProps = {
    onClose: () => void;
    proposalId: string;
}

function ReplyEditorModal(props: ReplyEditorModalProps): ReactElement {
    const { proposalId, onClose } = props;
    const dispatch = useDispatch();
    const proposal = useProposal(props.proposalId);
    const linkReference = proposal && `https://snapshot.org/#/${proposal.spaceId}/proposal/${proposal.id}`;
    const draft = useDraft(linkReference || '');
    const submitting = useSubmitting();

    const updateDraft = useCallback((newEditorState) => {
        if (!linkReference) return;
        dispatch(setDraft(newEditorState, linkReference));
    }, [linkReference]);

    const submitReply = useCallback(async () => {
        if (!linkReference) return;
        await dispatch(submitPost(linkReference));
        dispatch(setDraft(EditorState.createEmpty(), linkReference));
        onClose();
    }, [linkReference, draft.editorState]);

    return (
        <Modal
            className="w-144"
            onClose={props.onClose}
        >
            <ModalHeader onClose={props.onClose}>
                <b>{`Re: ${proposal?.title}`}</b>
            </ModalHeader>
            <ModalContent className="min-h-64">
                <Editor
                    className="reply-editor"
                    editorState={draft.editorState}
                    onChange={updateDraft}
                    onPost={submitReply}
                    loading={submitting}
                />
            </ModalContent>
        </Modal>
    );
}