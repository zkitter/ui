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
                'focus-within:border-gray-400 bg-white',
                "rounded-lg input-group",
                className,
            )}
        >
            { label && <div className="input-group__label text-gray-800">{label}</div> }
            <div
                className="w-full flex flex-row flex-nowrap items-center"
            >
                <input
                    className="bg-transparent rounded-xl flex-grow flex-shrink"
                    {...inputProps}
                />
                {children}
            </div>

            { errorMessage && <small className="error-message text-red-500">{errorMessage}</small> }
        </div>
    )
}
