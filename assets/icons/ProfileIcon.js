import React from 'react';
import Svg, { Path } from 'react-native-svg';

const ProfileIcon = ({
  size = 34,
  strokeWidth = 5.32946,
  opacityValue = 0.9,
  primaryColor = "#2C1A7E",
  secondaryColor = "#3A3A3A",
}) => (
  <Svg width={size} height={(size * 89) / 90} viewBox="0 0 92 89" fill="none">
    <Path
      opacity={opacityValue}
      d="M46.3726 47.3607C46.1048 47.3243 45.7605 47.3243 45.4544 47.3607C38.7205 47.1423 33.364 41.9006 33.364 35.4575C33.364 28.8689 38.9501 23.518 45.9135 23.518C52.8387 23.518 58.463 28.8689 58.463 35.4575C58.4247 41.9006 53.1065 47.1423 46.3726 47.3607Z"
      stroke={primaryColor}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      opacity={opacityValue}
      d="M71.6978 71.3857C64.8874 77.3191 55.8579 80.9228 45.9101 80.9228C35.9622 80.9228 26.9327 77.3191 20.1223 71.3857C20.5049 67.964 22.8006 64.6151 26.8945 61.9943C37.3779 55.3693 54.5188 55.3693 64.9257 61.9943C69.0196 64.6151 71.3152 67.964 71.6978 71.3857Z"
      stroke={primaryColor}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M45.9108 80.9224C67.0414 80.9224 84.1715 64.625 84.1715 44.5214C84.1715 24.4177 67.0414 8.12048 45.9108 8.12048C24.78 8.12048 7.65015 24.4177 7.65015 44.5214C7.65015 64.625 24.78 80.9224 45.9108 80.9224Z"
      stroke={secondaryColor}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export default ProfileIcon;
