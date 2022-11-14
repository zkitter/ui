import './popoverable.scss';
import React, { ReactElement, ReactNode } from 'react';

type Props = {
  label: string;
  children: ReactNode;
};

export default function Popoverable(props: Props): ReactElement {
  return (
    <div className="popoverable" title={props.label}>
      {/*<div className="popoverable__label">{props.label}</div>*/}
      <>{props.children}</>
    </div>
  );
}
