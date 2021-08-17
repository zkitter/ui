import React, {MouseEventHandler, ReactElement, ReactNode, ReactNodeArray, useEffect, useState} from "react";
import classNames from "classnames";
import "./menuable.scss";
import Icon from "../Icon";

type MenuableProps = {
    items: ItemProps[];
    children?: ReactNode;
    className?: string;
    menuClassName?: string;
    onOpen?: () => void;
    onClose?: () => void;
}

type ItemProps = {
    label: string;
    iconUrl?: string;
    iconFA?: string;
    iconClassName?: string;
    onClick?: MouseEventHandler;
    disabled?: boolean;
}

export default function Menuable(props: MenuableProps): ReactElement {
    const [isShowing, setShowing] = useState(false);

    useEffect(() => {
        if (isShowing) {
            props.onOpen && props.onOpen();
            const cb = () => {
                setShowing(false);
                window.removeEventListener('click', cb);
            };
            window.addEventListener('click', cb);
        } else {
            props.onClose && props.onClose();
        }
    }, [isShowing]);


    return (
        <div
            className={classNames('menuable', {
                'menuable--active': isShowing,
            }, props.className)}
            onClick={e => {
                e.stopPropagation();
                setShowing(!isShowing);
            }}
        >
            {props.children}
            {
                isShowing && (
                    <div className={classNames("rounded-xl border menuable__menu", props.menuClassName)}>
                        {props.items.map((item, i) => (
                            <div
                                key={i}
                                className={classNames(
                                    "text-sm whitespace-nowrap",
                                    'flex flex-row flex-nowrap items-center',
                                    "menuable__menu__item",
                                    {
                                        'cursor-pointer': !item.disabled,
                                    },
                                )}
                                onClick={e => {
                                    e.stopPropagation();
                                    if (item.disabled) return;
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
                                            className={classNames(
                                                'ml-4',
                                                {
                                                    'opacity-50': item.disabled,
                                                },
                                                item.iconClassName,
                                            )}
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