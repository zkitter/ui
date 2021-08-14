import React, {TextareaHTMLAttributes, ReactElement} from "react";
import classNames from "classnames";
import "./textarea.scss";

type Props = {
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
            )}
        >
            { label && <div className="textarea-group__label">{label}</div> }
            <textarea
                {...textareaProps}
            />
            { errorMessage && <small className="error-message">{errorMessage}</small> }
        </div>
    )
}
