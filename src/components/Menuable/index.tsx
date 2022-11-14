import './menuable.scss';
import classNames from 'classnames';
import React, {
  MouseEvent,
  ReactElement,
  ReactNode,
  useCallback,
  useEffect,
  useState,
} from 'react';
import Icon from '../Icon';
import { useThemeContext } from '../ThemeContext';

type MenuableProps = {
  items: ItemProps[];
  children?: ReactNode;
  className?: string;
  menuClassName?: string;
  onOpen?: () => void;
  onClose?: () => void;
  opened?: boolean;
};

export type ItemProps = {
  label: string;
  iconUrl?: string;
  iconFA?: string;
  iconClassName?: string;
  className?: string;
  onClick?: (e: MouseEvent, reset: () => void) => void;
  disabled?: boolean;
  children?: ItemProps[];
  component?: ReactNode;
};

export default function Menuable(props: MenuableProps): ReactElement {
  const { opened } = props;

  const [isShowing, setShowing] = useState(!!props.opened);
  const [path, setPath] = useState<number[]>([]);
  const theme = useThemeContext();

  useEffect(() => {
    if (typeof opened !== 'undefined') {
      setShowing(opened);
      if (!opened) {
        setPath([]);
      }
    }
  }, [opened]);

  const onClose = useCallback(() => {
    props.onClose && props.onClose();
    setShowing(false);
  }, []);

  const onOpen = useCallback(() => {
    props.onOpen && props.onOpen();
    setShowing(true);

    const cb = () => {
      onClose();
      window.removeEventListener('click', cb);
    };

    window.addEventListener('click', cb);
  }, [onClose]);

  const goBack = useCallback(
    (e: any) => {
      e.stopPropagation();
      const newPath = [...path];
      newPath.pop();
      setPath(newPath);
    },
    [path]
  );

  const onItemClick = useCallback(
    (e: any, item: ItemProps, i: number) => {
      e.stopPropagation();
      if (item.disabled) return;
      if (item.children) {
        setPath([...path, i]);
      } else if (item.onClick) {
        item.onClick(e, () => setPath([]));
      }
    },
    [path]
  );

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
      className={classNames(
        'menuable',
        {
          'menuable--active': isShowing,
        },
        props.className
      )}
      onClick={e => {
        e.stopPropagation();

        if (isShowing) return onClose();
        onOpen();
      }}>
      {props.children}
      {isShowing && (
        <div
          className={classNames(
            'rounded-xl border menuable__menu',
            {
              'border-gray-100': theme !== 'dark',
              'border-gray-800': theme === 'dark',
            },
            props.menuClassName
          )}>
          {!!path.length && (
            <div
              className={classNames(
                'text-sm whitespace-nowrap cursor-pointer',
                'flex flex-row flex-nowrap items-center',
                'menuable__menu__item',
                {
                  'text-gray-500 hover:text-gray-800 hover:bg-gray-50 ': theme !== 'dark',
                  'text-gray-500 hover:text-gray-200 hover:bg-gray-900 ': theme === 'dark',
                }
              )}
              onClick={goBack}>
              <Icon fa="fas fa-caret-left" />
              <span className="ml-2">Go back</span>
            </div>
          )}
          {items.map((item, i) => (
            <div
              key={i}
              className={classNames(
                'text-sm whitespace-nowrap',
                'flex flex-row flex-nowrap items-center',
                'menuable__menu__item',
                {
                  'hover:bg-gray-50 ': !item.disabled && theme !== 'dark',
                  'hover:bg-gray-900 ': !item.disabled && theme === 'dark',
                  'text-gray-500 hover:text-gray-800':
                    !item.component && theme !== 'dark' && !item.disabled,
                  'text-gray-500 hover:text-gray-200':
                    !item.component && theme === 'dark' && !item.disabled,
                },
                {
                  'cursor-pointer': !item.disabled,
                  'cursor-default': item.disabled,
                },
                item.className
              )}
              onClick={e => onItemClick(e, item, i)}>
              {item.component ? (
                item.component
              ) : (
                <>
                  <div
                    className={classNames('menuable__menu__item__label flex-grow', {
                      'hover:font-semibold': !item.disabled,
                      'opacity-50': item.disabled,
                    })}>
                    {item.label}
                  </div>
                  {(item.iconUrl || item.iconFA) && (
                    <Icon
                      fa={item.iconFA}
                      url={item.iconUrl}
                      className={classNames(
                        'ml-4',
                        {
                          'opacity-50': item.disabled,
                        },
                        item.iconClassName
                      )}
                    />
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
