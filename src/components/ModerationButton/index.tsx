import React, {ReactElement, ReactNode, useEffect, useState} from "react";
import Icon from "../Icon";
import "./moderation-btn.scss";
import classNames from "classnames";
import Modal, {ModalContent, ModalFooter, ModalHeader} from "../Modal";
import Button from "../Button";
import {ModerationMessageSubType} from "../../util/message";
import {useThemeContext} from "../ThemeContext";

type Props = {
    className?: string;
    onChange?: (type: ModerationMessageSubType|null) => void;
    currentType?: ModerationMessageSubType|null;
}

export default function ModerationButton(props: Props): ReactElement {
    const {
        className = '',
        currentType = null,
        onChange,
    } = props;

    const [showingModal, showModal] = useState(false);
    const [replyType, setReplyType] = useState<ModerationMessageSubType|null>(currentType);
    const theme = useThemeContext();

    useEffect(() => {
        if (onChange) onChange(replyType);
    }, [replyType]);

    return (
        <>
            { showingModal && (
                <Modal className="moderation-modal" onClose={() => showModal(false)}>
                    <ModalHeader
                        onClose={() => showModal(false)}
                    >
                        <b>Thread Moderation</b>
                    </ModalHeader>
                    <ModalContent className="p-4">
                        <div className="flex flex-col justify-center">
                            {renderReplyOption(null, replyType, setReplyType)}
                            {renderReplyOption(ModerationMessageSubType.ThreadBlock, replyType, setReplyType)}
                            {renderReplyOption(ModerationMessageSubType.ThreadFollow, replyType, setReplyType)}
                            {renderReplyOption(ModerationMessageSubType.ThreadMention, replyType, setReplyType)}
                        </div>
                    </ModalContent>
                </Modal>
            )}
            <button
                className={classNames(
                    "flex flex-row items-center text-blue-300 font-bold",
                    {
                        'hover:bg-blue-50 hover:text-blue-400': theme !== 'dark',
                        'hover:bg-blue-900 hover:text-blue-600': theme === 'dark',
                    },
                    "moderation-btn",
                    className,
                )}
                onClick={() => showModal(true)}
            >
                <Icon
                    fa={getFA(replyType)}
                    size={.875}
                />
                <div
                    className="text-sm ml-2 moderation-btn__label"
                >
                    {getLabel(replyType)}
                </div>
            </button>
        </>
    )
}

function renderReplyOption(
    replyType: ModerationMessageSubType|null,
    active: ModerationMessageSubType|null,
    setReplyType: (replyType: ModerationMessageSubType|null) => void,
): ReactNode {
    const fa = getFA(replyType);
    const label = getLabel(replyType);

    return (
        <div
            className={classNames(
                "flex flex-row items-center p-2 moderation-btn__reply-option",
                {
                    'moderation-btn__reply-option--active': active === replyType,
                    'hover:text-blue-400': active !== replyType,
                }
            )}
            onClick={() => setReplyType(replyType)}
        >
            <Icon
                className={classNames(
                    "p-2 rounded-full border border-2",
                    {
                        'border-gray-200 text-gray-400 hover:border-blue-400 hover:text-blue-400': active !== replyType,
                        'border-blue-400 bg-blue-400 text-white': active === replyType,
                    }
                )}
                fa={fa}
                size={.875}
            />
            <div
                className="text-light ml-4"
            >
                {label}
            </div>
        </div>
    )
}

function getFA(replyType: ModerationMessageSubType | null): string {
    switch (replyType) {
        case ModerationMessageSubType.ThreadBlock:
            return 'fas fa-shield-alt';
        case ModerationMessageSubType.ThreadFollow:
            return 'fas fa-user-check';
        case ModerationMessageSubType.ThreadMention:
            return 'fas fa-at';
        default:
            return 'fas fa-globe';
    }
}

function getLabel(replyType: ModerationMessageSubType | null): string {
    switch (replyType) {
        case ModerationMessageSubType.ThreadBlock:
            return 'Hide replies that you blocked';
        case ModerationMessageSubType.ThreadFollow:
            return 'Show replies that you followed or liked';
        case ModerationMessageSubType.ThreadMention:
            return 'Show replies from people you mentioned';
        default:
            return 'Show reply from everyone';
    }
}
