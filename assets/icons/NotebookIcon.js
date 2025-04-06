// CustomIcon.js
import React from 'react';
import Svg, { Path } from 'react-native-svg';

const NotebookIcon = ({
  size = 32,
  color1 = "#2C1A7E",
  color2 = "#3A3A3A",
  strokeWidth = 7.26903,
  opacity = 0.95,
}) => (
  <Svg width={size} height={size} viewBox="0 0 90 90" fill="none">
    <Path
      opacity={opacity}
      d="M27.0264 10.029V81.7"
      stroke={color1}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
    <Path
      opacity={opacity}
      d="M7.66162 44.9455H15.0909"
      stroke={color1}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
    <Path
      opacity={opacity}
      d="M7.66162 59.6474H15.0909"
      stroke={color1}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
    <Path
      opacity={opacity}
      d="M7.66162 30.2437H15.0909"
      stroke={color1}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
    <Path
      d="M11.1936 30.1956C11.1936 19.7658 11.1936 14.5509 14.1187 11.3108C17.0438 8.07068 21.7516 8.07068 31.1673 8.07068H51.1411C60.5567 8.07068 65.2645 8.07068 68.1896 11.3108C71.1148 14.5509 71.1148 19.7658 71.1148 30.1956V59.6955C71.1148 70.1252 71.1148 75.34 68.1896 78.5802C65.2645 81.8204 60.5567 81.8204 51.1411 81.8204H31.1673C21.7516 81.8204 17.0438 81.8204 14.1187 78.5802C11.1936 75.34 11.1936 70.1252 11.1936 59.6955V30.1956Z"
      stroke={color2}
      strokeWidth={strokeWidth}
    />
    <Path
      d="M40.0276 24.7305H58.6007"
      stroke={color2}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
    <Path
      d="M40.0276 37.5948H58.6007"
      stroke={color2}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
  </Svg>
);

export default NotebookIcon;
