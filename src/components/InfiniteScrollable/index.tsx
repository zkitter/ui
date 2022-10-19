import React, {
  BaseHTMLAttributes,
  ReactElement,
  ReactNode,
  useCallback,
  useRef,
  useState,
} from 'react';
import classNames from 'classnames';
import debounce from 'lodash.debounce';

type Props = {
  className?: string;
  onScrolledToBottom?: () => void;
  onScrolledToTop?: () => void;
  children?: ReactNode;
  bottomOffset?: number;
  topOffset?: number;
};

export default function InfiniteScrollable(props: Props): ReactElement {
  const {
    className,
    onScrolledToBottom,
    onScrolledToTop,
    children,
    bottomOffset = 0,
    topOffset = 0,
  } = props;

  const el = useRef<HTMLDivElement>(null);

  const onScroll = useCallback(() => {
    const current = el.current;

    if (!current) return;

    const { scrollTop, offsetHeight, scrollHeight } = current;

    if (onScrolledToBottom) {
      if (scrollTop + offsetHeight >= scrollHeight - bottomOffset) {
        onScrolledToBottom();
      }
    }

    if (onScrolledToTop) {
      if (scrollTop + scrollHeight <= offsetHeight + topOffset) {
        onScrolledToTop();
      }
    }
  }, [el, onScrolledToBottom, onScrolledToTop]);

  const debouncedOnScroll = debounce(onScroll, 100, { leading: true });

  return (
    <div ref={el} className={classNames(className)} onScroll={debouncedOnScroll}>
      {children}
    </div>
  );
}
