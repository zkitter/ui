import './checkbox.scss';
import classNames from 'classnames';
import React, { InputHTMLAttributes, ReactElement, ReactNode } from 'react';

type Props = {
  className?: string;
  children?: ReactNode;
} & InputHTMLAttributes<HTMLInputElement>;

export default function Checkbox(props: Props): ReactElement {
  const { className, children, ...inputProps } = props;

  return (
    <div className={classNames('flex flex-row flex-nowrap items-center checkbox', className)}>
      <div className="checkbox__wrapper">
        <input {...inputProps} type="checkbox" />
        <div className="checkbox__el" />
      </div>
      {children && <div className="text-sm checkbox__description">{children}</div>}
    </div>
  );
}
