import React, {
    MouseEventHandler,
    ReactElement,
    ReactNode,
    ReactNodeArray,
    useCallback,
    useEffect,
    useState
} from "react";
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
    children?: ItemProps[];
}

export default function Menuable(props: MenuableProps): ReactElement {
    const [isShowing, setShowing] = useState(false);
    const [path, setPath] = useState<number[]>([]);

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

    const goBack = useCallback((e) => {
        e.stopPropagation();
        const newPath = [...path];
        newPath.pop();
        setPath(newPath);
    }, [path]);

    const onItemClick = useCallback((e, item, i) => {
        e.stopPropagation();
        if (item.disabled) return;
        if (item.children) {
            setPath([...path, i]);
        } else if (item.onClick) {
            item.onClick(e);
        }
    }, [path]);

    let items: ItemProps[] = props.items;

    if (path) {
        for (const pathIndex of path) {
            if (items[pathIndex].children) {
                items = items[pathIndex].children as ItemProps[];
            }
        }
    }

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
                        {!!path.length && (
                            <div
                                className={classNames(
                                    "text-sm whitespace-nowrap cursor-pointer",
                                    'flex flex-row flex-nowrap items-center',
                                    "text-gray-500 hover:text-gray-800 menuable__menu__item",
                                )}
                                onClick={goBack}
                            >
                                <Icon fa="fas fa-caret-left" />
                                <span className="ml-2">Go back</span>
                            </div>
                        )}
                        {items.map((item, i) => (
                            <div
                                key={i}
                                className={classNames(
                                    "text-sm whitespace-nowrap",
                                    'flex flex-row flex-nowrap items-center',
                                    "menuable__menu__item",
                                    {'cursor-pointer': !item.disabled},
                                )}
                                onClick={e => onItemClick(e, item, i)}
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