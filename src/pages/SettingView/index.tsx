import React, { ReactElement, ReactNode, useCallback, useState } from 'react';
import classNames from 'classnames';
import './setting.scss';
import { Redirect, Route, Switch, useHistory, useLocation } from 'react-router';
import Icon from '@components/Icon';
import { useDispatch } from 'react-redux';
import SwitchButton from '@components/SwitchButton';
import { setTheme, useSetting } from '@ducks/app';

export default function SettingView(): ReactElement {
  return (
    <div className={classNames('setting')}>
      {window.innerWidth > 768 ? (
        <>
          <Panel />
          <Content />
        </>
      ) : (
        <Switch>
          <Route path="/settings/:settingSubpage">
            <Content />
          </Route>
          <Route path="/settings">
            <Panel />
          </Route>
        </Switch>
      )}
    </div>
  );
}

function Panel(): ReactElement {
  return (
    <div className="setting__panel">
      {/*<PanelItem label="Your Account" path="/settings/account" />*/}
      <PanelItem label="Display" path="/settings/display" />
      {/*<PanelItem label="Security" path="/settings/security" />*/}
      {/*<PanelItem label="Privacy" path="/settings/privacy" />*/}
    </div>
  );
}

function PanelItem(props: { label: string; path: string }): ReactElement {
  const history = useHistory();
  const loc = useLocation();

  return (
    <button
      className={classNames('setting__panel__item text-light', {
        'setting__panel__item--active': loc.pathname === props.path,
      })}
      onClick={() => history.push(props.path)}>
      <div>{props.label}</div>
    </button>
  );
}

function Content(): ReactElement {
  return (
    <div className="setting__content">
      <Switch>
        <Route path="/settings/display" component={DisplaySetting} />
        {window.innerWidth > 768 && (
          <Route path="/settings">
            <Redirect to="/settings/display" />
          </Route>
        )}
      </Switch>
    </div>
  );
}

export const BLUR_IMAGE_KEY = 'shouldSetBlurImage';
export const shouldBlurImage = () => {
  const shouldSetBlurImage = localStorage.getItem(BLUR_IMAGE_KEY);
  return shouldSetBlurImage === null ? true : shouldSetBlurImage === '1';
};

function DisplaySetting(): ReactElement {
  const [blurImage, setBlurImage] = useState(shouldBlurImage());
  const dispatch = useDispatch();
  const setting = useSetting();

  const onBlurImageChange = useCallback(
    (e: any) => {
      const checked = e.target.checked;
      localStorage.setItem(BLUR_IMAGE_KEY, checked ? '1' : '');
      setBlurImage(checked);
    },
    [blurImage]
  );

  const onThemeChange = useCallback(
    (e: any) => {
      const value = e.target.value;
      dispatch(setTheme(value));
    },
    [setting.theme]
  );

  return (
    <>
      <div className="font-bold setting__content__title">Display</div>
      <div className="text-sm text-gray-500 setting__content__desc">
        Manage theme and image display settings
      </div>
      <SettingRow fa="fas fa-eye" title="Blur Images" desc="Blur all images by default">
        <SwitchButton checked={blurImage} onChange={onBlurImageChange} />
      </SettingRow>
      <SettingRow fa="fas fa-paint-brush" title="Theme" desc="Change theme">
        <select onChange={onThemeChange} defaultValue={setting.theme}>
          <option value="light">Light Theme</option>
          <option value="dark">Dark Theme</option>
        </select>
      </SettingRow>
    </>
  );
}

function SettingRow(props: {
  fa: string;
  title: string;
  desc: string;
  children: ReactNode;
}): ReactElement {
  return (
    <div className="setting__content__row">
      <Icon fa={props.fa} />
      <div className="setting__content__row__body">
        <div className="setting__content__row__title font-semibold">{props.title}</div>
        <div className="setting__content__row__desc text-sm text-gray-500">{props.desc}</div>
      </div>
      <div className="setting__content__row__footer">{props.children}</div>
    </div>
  );
}
