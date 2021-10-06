import React, {ReactElement, useCallback, useState} from "react";
import {
    convertFromRaw,
    DraftHandleValue,
    EditorState,
    RichUtils,
} from "draft-js";
import classNames from "classnames";
import "./editor.scss";
import {useAccount, useENSName, useLoggedIn, useSemaphoreID} from "../../ducks/web3";
import Avatar from "../Avatar";
import Web3Button from "../Web3Button";
import Button from "../Button";
import {DraftEditor} from "../DraftEditor";
import Icon from "../Icon";
import Input from "../Input";

type Props = {
    messageId: string;
    editorState: EditorState;
    onChange?: (newEditorState: EditorState) => void;
    className?: string;
    disabled?: boolean;
    readOnly?: boolean;
    loading?: boolean;
    onPost?: () => Promise<void>;
}

export default function Editor(props: Props): ReactElement {
    const {
        editorState,
        disabled,
        readOnly,
        onPost,
        loading,
        onChange = () => null,
    } = props;

    const address = useAccount();
    const loggedIn = useLoggedIn();
    const ensName = useENSName();
    const semaphoreId = useSemaphoreID();

    const handleKeyCommand: (command: string) => DraftHandleValue = useCallback((command: string): DraftHandleValue => {
        const newState = RichUtils.handleKeyCommand(editorState, command);
        if (newState) {
            onChange && onChange(newState);
            return 'handled';
        }
        return 'not-handled';
    }, [editorState]);

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
                name={ensName}
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
                <div className="flex flex-row flex-nowrap border-t pt-2">
                    <div className="flex-grow pr-4 mr-4 flex flex-row flex-nowrap items-center">
                        <LinkIcon

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
                        disabled={!editorState.getCurrentContent().hasText()}
                        loading={loading}
                    >
                        Post
                    </Button>
                </div>
            </div>
        </div>
    );
};

function LinkIcon(): ReactElement {
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
                        autoFocus
                    >
                        <Icon
                            className="pr-2 text-green-500"
                            fa="fas fa-check"
                            onClick={e => e.stopPropagation()}
                        />
                    </Input>
                )
            }
        </Icon>
    );
}
