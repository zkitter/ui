import React, {ReactElement, useCallback, useState} from "react";
import {
    convertToRaw,
    DraftHandleValue,
    EditorState,
    RichUtils,
    DefaultDraftBlockRenderMap,
    ContentState, convertFromRaw,
} from "draft-js";
import DraftEditor from "draft-js-plugins-editor";
import classNames from "classnames";
const TableUtils = require('draft-js-table');
import "./editor.scss";
import {useAccount, useENSName, useLoggedIn, useWeb3Loading} from "../../ducks/web3";
import Avatar from "../Avatar";
import Web3Button from "../Web3Button";
import Button from "../Button";

type Props = {
    editorState: EditorState;
    onChange?: (newEditorState: EditorState) => void;
    className?: string;
    disabled?: boolean;
    readOnly?: boolean;
    onPost?: () => Promise<void>;
}

export default function Editor(props: Props): ReactElement {
    const {
        editorState,
        disabled,
        readOnly,
        onPost,
        onChange = () => null,
    } = props;

    const address = useAccount();
    const loggedIn = useLoggedIn();

    const [ref, setRef] = useState<DraftEditor|null>(null);

    const handleKeyCommand: (command: string) => DraftHandleValue = useCallback((command: string): DraftHandleValue => {
        const newState = RichUtils.handleKeyCommand(editorState, command);
        if (newState) {
            onChange && onChange(newState);
            return 'handled';
        }
        return 'not-handled';
    }, [editorState]);

    if (!loggedIn) {
        return (
            <div
                className={classNames(
                    'flex flex-col flex-nowrap items-center',
                    'p-4',
                    'border border-gray-300',
                    'bg-gray-50',
                    'rounded-xl',
                    props.className,
                )}
            >
                <div className="mt-2 mb-4 text-gray-800">
                    Connect to a wallet to make a post
                </div>
                <Web3Button />
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
            />
            <div className="flex flex-col flex-nowrap w-full h-full">
                <DraftEditor
                    ref={setRef}
                    editorState={editorState}
                    onChange={onChange}
                    handleKeyCommand={handleKeyCommand}
                    blockRenderMap={DefaultDraftBlockRenderMap.merge(TableUtils.DraftBlockRenderMap)}
                    placeholder={readOnly ? '' : "Write here..."}
                    readOnly={readOnly || disabled}
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
                />
                <div className="flex flex-row flex-nowrap border-t pt-2">
                    <div className="flex-grow pr-4 mr-4">

                    </div>
                    <Button
                        btnType="primary"
                        onClick={onPost}
                        disabled={!editorState.getCurrentContent().hasText()}
                    >
                        Post
                    </Button>
                </div>
            </div>
        </div>
    );
}

export const markdownConvertOptions = {
    preserveNewlines: true,
    blockStyles: {
        'ins_open': 'UNDERLINE',
        'del_open': 'STRIKETHROUGH',
    },
    styleItems: {
        'UNDERLINE': {
            open: function () {
                return '++';
            },

            close: function () {
                return '++';
            }
        },
        'STRIKETHROUGH': {
            open: function () {
                return '~~';
            },

            close: function () {
                return '~~';
            }
        },
    },
    remarkableOptions: {
        html: false,
        xhtmlOut: false,
        breaks: true,
        enable: {
            inline: ["ins", 'del'],
            core: ['abbr']
        },

        // highlight: function (str: string, lang: string) {
        //     if (lang && hljs.getLanguage(lang)) {
        //         try {
        //             return hljs.highlight(lang, str).value;
        //         } catch (err) {
        //             //
        //         }
        //     }
        //
        //     try {
        //         return hljs.highlightAuto(str).value;
        //     } catch (err) {
        //         //
        //     }
        //
        //     return ''; // use external default escaping
        // }
    }
};