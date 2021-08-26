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

type Props = {
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
                    <div className="flex-grow pr-4 mr-4">

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
