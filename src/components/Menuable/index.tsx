import React, {MouseEventHandler, ReactElement, ReactNode, ReactNodeArray, useEffect, useState} from "react";
import classNames from "classnames";
import "./menuable.scss";
import Icon from "../Icon";

type MenuableProps = {
    items: ItemProps[];
    children?: ReactNode;
    className?: string;
    onOpen?: () => void;
    onClose?: () => void;
}

type ItemProps = {
    label: string;
    iconUrl?: string;
    iconFA?: string;
    onClick?: MouseEventHandler;
    disabled?: boolean;
}

export default function Menuable(props: MenuableProps): ReactElement {
    const [isShowing, setShowing] = useState(false);

    useEffect(() => {
        if (isShowing) {
            props.onOpen && props.onOpen();
        } else {
            props.onClose && props.onClose();
        }
    }, [isShowing]);

    return (
        <div
            className={classNames('menuable', {
                'menuable--active': isShowing,
            })}
            onClick={() => setShowing(!isShowing)}
        >
            {props.children}
            {
                isShowing && (
                    <div className={classNames("rounded-xl border menuable__menu", props.className)}>
                        {props.items.map((item, i) => (
                            <div
                                key={i}
                                className={classNames(
                                    "text-sm",
                                    'flex flex-row flex-nowrap items-center',
                                    "menuable__menu__item",
                                    {
                                        'cursor-pointer': !item.disabled,
                                    },
                                )}
                                onClick={e => {
                                    e.stopPropagation();
                                    item.onClick && item.onClick(e);
                                }}
                            >
                                <div
                                    className={classNames(
                                        "flex-grow",
                                        {
                                            'text-gray-500 hover:text-gray-800 hover:font-semibold': !item.disabled,
                                            'text-gray-200': item.disabled,
                                        },
                                    )}
                                >
                                    { item.label }
                                </div>
                                {
                                    (item.iconUrl || item.iconFA) && (
                                        <Icon
                                            fa={item.iconFA}
                                            url={item.iconUrl}
                                        />
                                    )
                                }
                            </div>
                        ))}
                    </div>
                )
            }
        </div>
    )
}