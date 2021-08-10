import React, {ButtonHTMLAttributes, ReactElement} from "react";
import classNames from "classnames";
import "./button.scss";
import Icon from "../Icon";
import SpinnerGif from "../../../static/icons/spinner.gif";

type Props = {
    className?: string;
    btnType?: 'primary' | 'secondary' | '';
    loading?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export default function Button(props: Props): ReactElement {
    const {
        className,
        btnType = '',
        children,
        onClick,
        disabled,
        loading,
        ...btnProps
    } = props;
    return (
        <button
            className={classNames(
                'rounded-xl',
                'flex flex-row flex-nowrap',
                'button',
                {
                    'py-2 px-4': !loading,
                    'py-1 px-4': loading,
                    'button--primary': btnType === 'primary',
                    'button--secondary': btnType === 'secondary',
                },
                className,
            )}
            onClick={!disabled && !loading ? onClick : undefined}
            disabled={disabled}
            {...btnProps}
        >
            {loading ? <Icon url={SpinnerGif} size={2} />: children}
        </button>
    )
}