import React, {InputHTMLAttributes, ReactElement, ReactNode} from "react";
import classNames from "classnames";
import "./input.scss";

type Props = {
    label?: string;
    errorMessage?: string;
    children?: ReactNode;
} & InputHTMLAttributes<HTMLInputElement>;

export default function Input(props: Props): ReactElement {
    const {
        label,
        errorMessage,
        className,
        children,
        ...inputProps
    } = props;

    return (
        <div
            className={classNames(
                'bg-white',
                "rounded-lg input-group",
                className,
                {
                    'input-group--readOnly': inputProps.readOnly,
                    'focus-within:border-gray-400 ': !inputProps.readOnly,
                }
            )}
        >
            { label && <div className="input-group__label text-gray-800">{label}</div> }
            <div
                className="w-full flex flex-row flex-nowrap items-center"
            >
                <input
                    className={classNames("bg-transparent rounded-xl flex-grow flex-shrink", {
                        'cursor-default': inputProps.readOnly,
                    })}
                    {...inputProps}
                />
                {children}
            </div>

            { errorMessage && <small className="error-message text-red-500">{errorMessage}</small> }
        </div>
    )
}
