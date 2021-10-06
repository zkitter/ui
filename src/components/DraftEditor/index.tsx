import React, {ReactElement, useCallback, useEffect, useMemo, useState} from "react";
import {
    CompositeDecorator, ContentBlock, ContentState, convertFromRaw, convertToRaw,
    DefaultDraftBlockRenderMap, EditorState,
} from "draft-js";
import DraftJSPluginEditor, {PluginEditorProps} from "@draft-js-plugins/editor";
import createLinkifyPlugin from '@draft-js-plugins/linkify';
import createHashtagPlugin from '@draft-js-plugins/hashtag';
import createMentionPlugin, {
    defaultSuggestionsFilter, MentionData,
} from '@draft-js-plugins/mention';
const TableUtils = require('draft-js-table');
const { linkify } = require("remarkable/linkify");
const { markdownToDraft } = require('markdown-draft-js');
import "./draft-js-editor.scss";
import {useHistory} from "react-router";
import {useDispatch} from "react-redux";
import {searchUsers} from "../../ducks/users";
import Avatar from "../Avatar";
import classNames from "classnames";
import debounce from "lodash.debounce";

export function DraftEditor(props: PluginEditorProps): ReactElement {
    const dispatch = useDispatch();

    const { MentionSuggestions, plugins, blockRenderMap } = useMemo(() => {
        const blockRenderMap = DefaultDraftBlockRenderMap.merge(TableUtils.DraftBlockRenderMap);
        const linkifyPlugin = createLinkifyPlugin();
        const hashtagPlugin = createHashtagPlugin();
        const mentionPlugin = createMentionPlugin({
            mentionRegExp,
        });
        const { MentionSuggestions } = mentionPlugin;
        return {
            plugins: [linkifyPlugin, hashtagPlugin, mentionPlugin],
            MentionSuggestions,
            blockRenderMap,
        };
    }, []);

    const [open, setOpen] = useState(false);
    const [suggestions, setSuggestions] = useState<MentionData[]>([]);

    const onOpenChange = useCallback((_open: boolean) => {
        setOpen(_open);
    }, []);

    const onSearchChange = useCallback(async ({ value }: { value: string }) => {
        let result: any = await dispatch(searchUsers(value));
        result = result.map((r: any) => ({
            name: '@' + r.ens,
            profileImage: r.profileImage,
            nickname: r.name,
        }))
        setSuggestions(defaultSuggestionsFilter(value, result));
    }, []);

    const debouncedOnSearchChange = debounce(onSearchChange, 500);

    useEffect(() => {
        return function() {
            if (props.onChange) {
                props.onChange(EditorState.createEmpty());
            }
        }
    }, []);

    return (
        <>
            <DraftJSPluginEditor
                blockRenderMap={blockRenderMap}
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
                {...props}
                plugins={plugins}
                onChange={editorState => {
                    if (props.onChange && !props.readOnly) {
                        props.onChange(editorState);
                        return editorState;
                    }
                }}
            />
            <MentionSuggestions
                open={open}
                onOpenChange={onOpenChange}
                suggestions={suggestions}
                onSearchChange={debouncedOnSearchChange}
                // @ts-ignore
                entryComponent={Entry}
                onAddMention={() => {
                    // get the mention object selected
                }}
            />
        </>
    )
};

export const decorator = new CompositeDecorator([
    {
        strategy: findLinkEntities,
        component: (props: any) => {
            const {url} = props.contentState.getEntity(props.entityKey).getData();
            return (
                <a
                    href={url}
                    target="_blank"
                    onClick={e => e.stopPropagation()}
                >
                    {props.children}
                </a>
            );
        },
    },
    {
        strategy: findHashtagEntities,
        component: (props: any) => {
            const history = useHistory();
            return (
                <a
                    className="hashtag"
                    onClick={e => {
                        e.stopPropagation();
                        history.push(`/tag/${encodeURIComponent(props.decoratedText)}`)
                    }}
                >
                    {props.children}
                </a>
            );
        },
    },
    {
        strategy: findMentionEntities,
        component: (props: any) => {
            const history = useHistory();
            return (
                <a
                    className="hashtag"
                    onClick={e => {
                        e.stopPropagation();
                        history.push(`/${encodeURIComponent(props.decoratedText.slice(1))}/`)
                    }}
                >
                    {props.children}
                </a>
            );
        },
    },
]);

function findLinkEntities(contentBlock: any, callback: any, contentState: any) {
    contentBlock.findEntityRanges(
        (character: any) => {
            const entityKey = character.getEntity();
            return (
                entityKey !== null &&
                contentState.getEntity(entityKey).getType() === 'LINK'
            );
        },
        callback
    );
}

const mentionRegExp = '[' +
    '\\w-' +
    // Latin-1 Supplement (letters only) - https://en.wikipedia.org/wiki/List_of_Unicode_characters#Latin-1_Supplement
    '\u00C0-\u00D6' +
    '\u00D8-\u00F6' +
    '\u00F8-\u00FF' +
    // Latin Extended-A (without deprecated character) - https://en.wikipedia.org/wiki/List_of_Unicode_characters#Latin_Extended-A
    '\u0100-\u0148' +
    '\u014A-\u017F' +
    // Cyrillic symbols: \u0410-\u044F - https://en.wikipedia.org/wiki/Cyrillic_script_in_Unicode
    '\u0410-\u044F' +
    // hiragana (japanese): \u3040-\u309F - https://gist.github.com/ryanmcgrath/982242#file-japaneseregex-js
    '\u3040-\u309F' +
    // katakana (japanese): \u30A0-\u30FF - https://gist.github.com/ryanmcgrath/982242#file-japaneseregex-js
    '\u30A0-\u30FF' +
    // For an advanced explaination about Hangul see https://github.com/draft-js-plugins/draft-js-plugins/pull/480#issuecomment-254055437
    // Hangul Jamo (korean): \u3130-\u318F - https://en.wikipedia.org/wiki/Korean_language_and_computers#Hangul_in_Unicode
    // Hangul Syllables (korean): \uAC00-\uD7A3 - https://en.wikipedia.org/wiki/Korean_language_and_computers#Hangul_in_Unicode
    '\u3130-\u318F' +
    '\uAC00-\uD7A3' +
    // common chinese symbols: \u4e00-\u9eff - http://stackoverflow.com/a/1366113/837709
    // extended to \u9fa5 https://github.com/draft-js-plugins/draft-js-plugins/issues/1888
    '\u4e00-\u9fa5' +
    // Arabic https://en.wikipedia.org/wiki/Arabic_(Unicode_block)
    '\u0600-\u06ff' +
    // Vietnamese http://vietunicode.sourceforge.net/charset/
    '\u00C0-\u1EF9' +
    '\u002E'+
    ']';
const HASHTAG_REGEX = /\#[\w\u0590-\u05ff]+/g;
const MENTION_REGEX = new RegExp(`\@${mentionRegExp}+`, 'g');
function findHashtagEntities(contentBlock: ContentBlock, callback: any, contentState: ContentState) {
    findWithRegex(HASHTAG_REGEX, contentBlock, callback);
}

function findMentionEntities(contentBlock: ContentBlock, callback: any, contentState: ContentState) {
    findWithRegex(MENTION_REGEX, contentBlock, callback);
}

function findWithRegex(regex: any, contentBlock: ContentBlock, callback: any) {
    const text = contentBlock.getText();
    let matchArr, start;
    while ((matchArr = regex.exec(text)) !== null) {
        start = matchArr.index;
        callback(start, start + matchArr[0].length);
    }
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
            inline: ["ins", 'del', 'links', 'autolink'],
            core: ['abbr'],
            block: ['list', 'table']
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
    },
    remarkablePlugins: [linkify],
};

export const convertMarkdownToDraft = (md: string) => {
    return EditorState.createWithContent(
        convertFromRaw(markdownToDraft(md, markdownConvertOptions)),
        decorator,
    );
}

interface EntryComponentProps {
    className?: string;
    onMouseDown(event: MouseEvent): void;
    onMouseUp(event: MouseEvent): void;
    onMouseEnter(event: MouseEvent): void;
    role: string;
    id: string;
    'aria-selected'?: boolean | 'false' | 'true';
    mention: MentionData;
    isFocused: boolean;
    searchValue?: string;
}

function Entry(props: EntryComponentProps): ReactElement {
    const {
        mention,
        searchValue, // eslint-disable-line @typescript-eslint/no-unused-vars
        isFocused, // eslint-disable-line @typescript-eslint/no-unused-vars
        className,
        ...parentProps
    } = props;

    const name = mention.name.slice(1);

    return (
        // @ts-ignore
        <div
            className={classNames('mention-entry', className)}
            {...parentProps}
        >
            <div
                className="flex flex-row flex-nowrap p-1 cursor-pointer items-center"
            >
                <Avatar name={name} className="w-8 h-8 mr-2" />
                <div className="flex flex-col flex-nowrap justify-center">
                    <div className="font-bold text-sm hover:underline">{mention.nickname || name}</div>
                    <div className="text-xs text-gray-500">{mention.name}</div>
                </div>
            </div>
        </div>
    );
}