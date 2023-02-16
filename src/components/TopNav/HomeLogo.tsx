import React from 'react';
import { Link } from 'react-router-dom';
import Icon from '../Icon';

const HomeLogo = () => (
  <Link to="/explore">
    <Icon url="/applogo.svg" size={2} />
  </Link>
);

export default HomeLogo;
