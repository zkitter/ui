import './modal.scss';
import classNames from 'classnames';
import React, { MouseEventHandler, ReactElement, ReactNode, ReactNodeArray } from 'react';
import ReactDOM from 'react-dom';
import CancelSVG from '../../../static/icons/cancel.svg';
import Icon from '../Icon';
import { useThemeContext } from '../ThemeContext';

type Props = {
  className?: string;
  onClose: MouseEventHandler;
  children: ReactNode | ReactNode[];
};

export function ModalHeader(props: HeaderProps): ReactElement {
  const theme = useThemeContext();
  return (
    <div
      className={classNames('border-b modal__header', {
        'border-gray-100': theme !== 'dark',
        'border-gray-800': theme === 'dark',
      })}>
      <div className="modal__header__title">{props.children}</div>
      <div className="modal__header__content">
        {props.onClose && (
          <div
            className={classNames(
              'flex flex-row items-center justify-center',
              'p-2 rounded-full opacity-50',
              'hover:opacity-100',
              {
                'text-black': theme !== 'dark',
                'text-white': theme === 'dark',
              }
            )}>
            <Icon fa="fas fa-times" size={1} onClick={props.onClose} />
          </div>
        )}
      </div>
    </div>
  );
}

type HeaderProps = {
  onClose?: () => void;
  children: ReactNode;
};

export function ModalContent(props: ContentProps): ReactElement {
  return <div className={classNames('modal__content', props.className)}>{props.children}</div>;
}

type ContentProps = {
  children: ReactNode | ReactNodeArray;
  className?: string;
};

export function ModalFooter(props: FooterProps): ReactElement {
  const theme = useThemeContext();

  return (
    <div
      className={classNames(
        'border-t modal__footer',
        {
          'border-gray-100': theme !== 'dark',
          'border-gray-800': theme === 'dark',
        },
        props.className
      )}>
      {props.children}
    </div>
  );
}

type FooterProps = {
  children: ReactNode | ReactNodeArray;
  className?: string;
};

export default function Modal(props: Props): ReactElement {
  const { className, onClose, children } = props;
  const theme = useThemeContext();

  const modalRoot = document.querySelector('#modal-root');

  if (!modalRoot) return <></>;

  // @ts-ignore
  return ReactDOM.createPortal(
    <div
      className={classNames('bg-black bg-opacity-80', 'modal__overlay', theme)}
      onClick={e => {
        e.stopPropagation();
        onClose && onClose(e);
      }}>
      <div
        className={classNames(
          `modal__wrapper`,
          {
            'bg-white': theme !== 'dark',
            'bg-dark': theme === 'dark',
          },
          className
        )}
        onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    modalRoot
  );
}
