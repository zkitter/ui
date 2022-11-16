import React, { ReactElement, ReactNode, useContext } from 'react';
import { useSetting } from '@ducks/app';

const ThemeContext = React.createContext('light');

export const ThemeProvider = (props: { children: ReactNode }): ReactElement => {
  const setting = useSetting();

  return <ThemeContext.Provider value={setting.theme}>{props.children}</ThemeContext.Provider>;
};

export const useThemeContext = () => useContext(ThemeContext);

export default ThemeContext;
