import React, {TextareaHTMLAttributes, ReactElement, LegacyRef} from "react";
import classNames from "classnames";
import "./textarea.scss";

type Props = {
    ref?: LegacyRef<HTMLTextAreaElement>;
    label?: string;
    errorMessage?: string;
} & TextareaHTMLAttributes<HTMLTextAreaElement>;

export default function Textarea(props: Props): ReactElement {
    const {
        label,
        errorMessage,
        className,
        ...textareaProps
    } = props;

    return (
        <div
            className={classNames(
                'focus-within:border-gray-400 bg-white',
                "rounded-lg textarea-group",
                className,
                {
                    'bg-gray-100 text-gray-300': props.disabled,
                    'bg-white': !props.disabled,
                }
            )}
        >
            { label && <div className="textarea-group__label">{label}</div> }
            <textarea
                ref={props.ref}
                {...textareaProps}
            />
            { errorMessage && <small className="error-message">{errorMessage}</small> }
        </div>
    )
}
