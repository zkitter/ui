import React, {ReactElement, useContext} from "react";

const ThemeContext = React.createContext('light');

export const ThemeProvider = ThemeContext.Provider;

export const useThemeContext = () => useContext(ThemeContext);

export default ThemeContext;
