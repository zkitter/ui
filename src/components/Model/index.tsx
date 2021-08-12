import React, {MouseEventHandler, ReactElement, ReactNode, ReactNodeArray} from 'react';
import ReactDOM from 'react-dom';
import './modal.scss';
import Icon from "../Icon";
import classNames from "classnames";
import CancelSVG from "../../../static/icons/cancel.svg";


type Props = {
    className?: string;
    onClose: MouseEventHandler;
    children: ReactNode | ReactNode[];
}

export default function Modal(props: Props): ReactElement {
    const { className, onClose, children } = props;

    const modalRoot = document.querySelector('#modal-root');

    if (!modalRoot) return <></>;

    return ReactDOM.createPortal(
        <div
            className={classNames(
                'bg-black bg-opacity-80',
                "modal__overlay",
            )}
            onClick={onClose}
        >
            <div
                className={classNames(
                    'bg-white',
                    `modal__wrapper`,
                    className,
                )}
                onClick={e => e.stopPropagation()}
            >
                {children}
            </div>
        </div>,
        modalRoot,
    );
}

type HeaderProps = {
    onClose: () => void;
    children: ReactNode;
}

export function ModalHeader(props: HeaderProps): ReactElement {
    return (
        <div className="border-b modal__header">
            <div className="modal__header__title">
                {props.children}
            </div>
            <div className="modal__header__content">
                <div
                    className={classNames(
                        "flex flex-row items-center justify-center",
                        "p-2 rounded-full opacity-50",
                        "hover:text-black hover:opacity-100",
                    )}
                >
                    <Icon
                        url={CancelSVG}
                        size={1}
                        onClick={props.onClose}
                    />
                </div>

            </div>
        </div>
    );
}

type ContentProps = {
    children: ReactNode | ReactNodeArray;
}

export function ModalContent(props: ContentProps): ReactElement {
    return (
        <div className="modal__content">
            {props.children}
        </div>
    );
}

type FooterProps = {
    children: ReactNode | ReactNodeArray;
}

export function ModalFooter(props: ContentProps): ReactElement {
    return (
        <div className="modal__footer">
            {props.children}
        </div>
    );
}