import React, {ReactElement} from "react";
import {
    CompositeDecorator, ContentBlock, ContentState, convertFromRaw, convertToRaw,
    DefaultDraftBlockRenderMap, EditorState,
} from "draft-js";
import DraftJSPluginEditor, {PluginEditorProps} from "@draft-js-plugins/editor";
import createLinkifyPlugin from '@draft-js-plugins/linkify';
import createHashtagPlugin, {extractHashtagsWithIndices} from '@draft-js-plugins/hashtag';
const TableUtils = require('draft-js-table');
const { linkify } = require("remarkable/linkify");
const { markdownToDraft } = require('markdown-draft-js');
import "./draft-js-editor.scss";
import {hashtagify} from "../../util/hashtag";
import {useHistory} from "react-router";
const { draftToMarkdown } = require('markdown-draft-js');

const blockRenderMap = DefaultDraftBlockRenderMap.merge(TableUtils.DraftBlockRenderMap);
const linkifyPlugin = createLinkifyPlugin();
const hashtagPlugin = createHashtagPlugin();

export function DraftEditor(props: PluginEditorProps): ReactElement {
    return (
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
            plugins={[linkifyPlugin, hashtagPlugin]}
            onChange={editorState => {
                // const currentContent = editorState.getCurrentContent();
                // const markdown = draftToMarkdown(convertToRaw(currentContent), markdownConvertOptions);
                // const selection = editorState.getSelection();
                // const anchorOffset = selection.getAnchorOffset();
                // const blockKey = selection.getAnchorKey();
                // const block = editorState.getCurrentContent().getBlockForKey(blockKey);
                // const blockText = block.getText();
                // // console.log(extractHashtagsWithIndices(markdown), markdown, blockText);
                props.onChange && props.onChange(editorState);
                return editorState;
            }}
        />
    )
}

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

const HASHTAG_REGEX = /\#[\w\u0590-\u05ff]+/g;

function findHashtagEntities(contentBlock: ContentBlock, callback: any, contentState: ContentState) {
    findWithRegex(HASHTAG_REGEX, contentBlock, callback);
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
