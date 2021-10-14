import React, {ReactElement, useCallback, useState} from "react";
import {
    convertFromRaw,
    DraftHandleValue,
    EditorState,
    RichUtils,
} from "draft-js";
import classNames from "classnames";
import "./editor.scss";
import {useAccount, useENSName, useGunKey, useLoggedIn, useSemaphoreID} from "../../ducks/web3";
import Avatar from "../Avatar";
import Web3Button from "../Web3Button";
import Button from "../Button";
import {DraftEditor} from "../DraftEditor";
import Icon from "../Icon";
import Input from "../Input";
import drafts, {setDraft, useDraft} from "../../ducks/drafts";
import {useDispatch} from "react-redux";
import URLPreview from "../URLPreview";
import SpinnerGif from "../../../static/icons/spinner.gif";
import {useUser} from "../../ducks/users";

type Props = {
    messageId: string;
    editorState: EditorState;
    className?: string;
    disabled?: boolean;
    readOnly?: boolean;
    loading?: boolean;
    onPost?: () => Promise<void>;
}

export default function Editor(props: Props): ReactElement {
    const {
        messageId,
        editorState,
        disabled,
        readOnly,
        onPost,
        loading,
    } = props;

    const address = useAccount();
    const loggedIn = useLoggedIn();
    const semaphoreId = useSemaphoreID();
    const draft = useDraft(messageId);
    const dispatch = useDispatch();
    const gun = useGunKey();

    const isEmpty = !editorState.getCurrentContent().hasText() && !draft.attachment;

    const onChange = useCallback((newEditorState: EditorState) => {
        if (readOnly) return;

        dispatch(setDraft({
            editorState: newEditorState,
            reference: messageId,
            attachment: draft.attachment,
        }));
    }, [messageId, readOnly, draft]);

    const onAddLink = useCallback((url: string) => {
        if (readOnly) return;

        dispatch(setDraft({
            editorState: draft.editorState,
            reference: draft.reference,
            attachment: url,
        }));
    }, [messageId, readOnly, draft]);

    const handleKeyCommand: (command: string) => DraftHandleValue = useCallback((command: string): DraftHandleValue => {
        const newState = RichUtils.handleKeyCommand(editorState, command);
        if (newState) {
            onChange && onChange(newState);
            return 'handled';
        }
        return 'not-handled';
    }, [editorState]);

    if (!disabled && gun.priv && gun.pub && !gun.joinedTx) {
        return (
            <div
                className={classNames(
                    'flex flex-col flex-nowrap items-center',
                    'p-4',
                    'bg-white',
                    'rounded-xl',
                    props.className,
                )}
            >
                <Icon className="opacity-50" url={SpinnerGif} size={4} />
            </div>
        )
    }

    if (!disabled && !loggedIn) {
        return (
            <div
                className={classNames(
                    'flex flex-col flex-nowrap items-center',
                    'p-4',
                    'bg-white',
                    'rounded-xl',
                    props.className,
                )}
            >
                <div className="mt-2 mb-4 text-gray-800">
                    Connect to a wallet to make a post
                </div>
                <Web3Button
                    className={classNames("rounded-xl", {
                        'border border-gray-100': address,
                    })}
                />
            </div>
        )
    }

    if (semaphoreId.commitment && !semaphoreId.identityPath) {
        return (
            <div
                className={classNames(
                    'flex flex-col flex-nowrap items-center',
                    'p-4',
                    'bg-white',
                    'rounded-xl',
                    props.className,
                )}
            >
                <div className="mt-2 mb-4 text-gray-800">
                    Register with InterRep
                </div>
                <Button
                    className="mr-2 border border-yellow-300 bg-yellow-50 text-yellow-500"
                    onClick={() => window.open(`https://kovan.interrep.link`)}
                >
                    Register with InterRep
                </Button>
            </div>
        )
    }

    return (
        <div
            className={classNames(
                'flex flex-row flex-nowrap',
                'pt-3 pb-2 px-4',
                'bg-white',
                'rounded-xl',
                'text-lg',
                'editor',
                props.className,
            )}
        >
            <Avatar
                className="w-12 h-12 mr-3"
                address={address}
                incognito={!!semaphoreId.keypair.privKey}
            />
            <div className="flex flex-col flex-nowrap w-full h-full editor__wrapper">
                <DraftEditor
                    editorState={editorState}
                    onChange={onChange}
                    handleKeyCommand={handleKeyCommand}
                    placeholder={readOnly ? '' : "Write here..."}
                    readOnly={readOnly || disabled}
                />

                {
                    draft.attachment && (
                        <div className="editor__attachment py-2">
                            <URLPreview
                                url={draft.attachment}
                                onRemove={() => onAddLink('')}
                                editable
                            />
                        </div>
                    )
                }

                <div className="flex flex-row flex-nowrap border-t pt-2">
                    <div className="flex-grow pr-4 mr-4 flex flex-row flex-nowrap items-center">
                        <LinkIcon
                            onAddLink={onAddLink}
                            link={draft.attachment}
                        />
                        {/*<Icon*/}
                        {/*    className={classNames("editor__button w-8 h-8",*/}
                        {/*        "hover:bg-blue-50 hover:text-blue-400",*/}
                        {/*    )}*/}
                        {/*    fa="far fa-image"*/}
                        {/*/>*/}
                        {/*<Icon*/}
                        {/*    className={classNames("editor__button w-8 h-8",*/}
                        {/*        "hover:bg-blue-50 hover:text-blue-400",*/}
                        {/*    )}*/}
                        {/*    fa="far fa-smile"*/}
                        {/*/>*/}
                    </div>
                    <Button
                        btnType="primary"
                        onClick={onPost}
                        disabled={isEmpty}
                        loading={loading}
                    >
                        Post
                    </Button>
                </div>
            </div>
        </div>
    );
};

function LinkIcon(props: {
    onAddLink: (url: string) => void;
    link?: string;
}): ReactElement {
    const [showingInput, showInput] = useState(false);

    return (
        <Icon
            className={classNames("editor__button text-gray-400 w-8 h-8 relative",
                {
                    'bg-red-50 text-red-400': showingInput,
                    'hover:bg-blue-50 hover:text-blue-400': !showingInput,
                }
            )}
            fa={showingInput ? "fas fa-times" : "fas fa-link"}
            onClick={() => showInput(!showingInput)}
        >
            {
                showingInput && (
                    <Input
                        className="absolute w-80 bottom-10 left-0 z-200 border-2 text-black"
                        onClick={e => e.stopPropagation()}
                        onChange={e => props.onAddLink(e.target.value)}
                        value={props.link}
                        autoFocus
                    >
                        <Icon
                            className="pr-2 text-green-500"
                            fa="fas fa-check"
                            onClick={e => {
                                e.stopPropagation();
                                showInput(false);
                            }}
                        />
                    </Input>
                )
            }
        </Icon>
    );
}
