import { Props } from './types';
import React, { ReactElement } from 'react';
import { useThemeContext } from '../ThemeContext';
import classNames from 'classnames';

export default function LoadingPost(props: Props): ReactElement {
  const theme = useThemeContext();

  const bgColor = classNames({
    'bg-white': theme !== 'dark',
    'bg-dark': theme === 'dark',
  });

  const accentColor = classNames({
    'bg-gray-50': theme !== 'dark',
    'bg-gray-900': theme === 'dark',
  });

  if (props.expand) {
    return (
      <div
        className={classNames(
          'flex flex-col flex-nowrap',
          'py-3 px-4',
          bgColor,
          'post',
          props.className
        )}>
        <div className="flex flex-row flex-nowrap flex-grow-0 flex-shrink-0">
          <div className={`mr-3 w-12 h-12 flex-shrink-0 rounded-full ${accentColor}`} />
          <div className="flex flex-col flex-nowrap items-start text-light w-full">
            <div className={`font-bold text-base mr-1 w-24 h-6 ${accentColor}`} />
            <div className={`text-gray-400 mr-1 mt-0.5 w-24 h-6 ${accentColor}`} />
          </div>
          <div className="flex flex-row flex-nowrap flex-grow flex-shrink justify-end"></div>
        </div>
        <div className="flex flex-col flex-nowrap items-start flex-grow flex-shrink">
          <div className={`mt-4 mb-2 text-xl w-24 h-6 ${accentColor}`} />
          <div className="flex flex-row flex-nowrap items-center text-light w-full">
            <div className={`text-gray-500 my-2w-24 h-6 ${accentColor}`} />
          </div>
          <div
            className={classNames(
              'flex flex-row flex-nowrap items-center mt-2 pt-3 border-t',
              'w-full post__footer',
              {
                'border-gray-100': theme !== 'dark',
                'border-gray-900': theme === 'dark',
              }
            )}>
            <div className={`${accentColor} w-12 h-6 mr-8`} />
            <div className={`${accentColor} w-12 h-6 mr-8`} />
            <div className={`${accentColor} w-12 h-6 mr-8`} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={classNames(
        'flex flex-row flex-nowrap',
        'py-3 px-4',
        bgColor,
        'post',
        props.className
      )}>
      <div className={`mr-3 w-12 h-12 rounded-full ${accentColor}`} />
      <div className="flex flex-col flex-nowrap items-start flex-grow flex-shrink">
        <div className="flex flex-row flex-nowrap items-center text-light w-full">
          <div className={`font-bold text-base mr-1 w-24 h-6 ${accentColor}`} />
          <div className={`text-gray-400 mr-1 w-24 h-6 ${accentColor}`} />
          <div className={`text-gray-400 w-24 h-6 ${accentColor}`} />
          <div className="flex flex-row flex-nowrap flex-grow flex-shrink justify-end"></div>
        </div>
        <div className={`text-light mt-1 mb-2 w-80 h-6 ${accentColor}`} />
        <div className="flex flex-row flex-nowrap items-center post__footer">
          <div className={`${accentColor} w-8 h-4 mr-8 ml-1`} />
          <div className={`${accentColor} w-8 h-4 mr-8`} />
          <div className={`${accentColor} w-8 h-4 mr-8`} />
        </div>
      </div>
    </div>
  );
}
