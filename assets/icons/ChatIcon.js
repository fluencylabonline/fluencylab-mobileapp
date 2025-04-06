import React from 'react';
import Svg, { Path } from 'react-native-svg';

const ChatIcon = ({
  width = 34,
  height = 34,
  color = "#2C1A7E",
  secondaryColor = "#3A3A3A",
  ...props
}) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 89 85" fill="none" {...props}>
      <Path d="M29.9077 37.273H59.3276" stroke={color} strokeWidth={5.96899} strokeLinecap="round" />
      <Path d="M29.9077 49.5186H50.1339" stroke={color} strokeWidth={5.96899} strokeLinecap="round" />
      <Path 
        d="M63.005 12.2145C57.5958 9.23756 51.3157 7.53378 44.6176 7.53378C24.3074 7.53378 7.84277 23.1981 7.84277 42.5211C7.84277 48.118 9.22411 53.4078 11.6801 58.0992C12.3328 59.3458 12.55 60.7708 12.1716 62.1161L9.98126 69.9046C9.03042 73.2854 12.2815 76.3783 15.8352 75.4739L24.0214 73.3901C25.4356 73.03 26.9333 73.2368 28.2437 73.8575C33.1746 76.1943 38.7347 77.5084 44.6176 77.5084C64.9276 77.5084 81.3924 61.8439 81.3924 42.5211C81.3924 36.1485 79.6014 30.1736 76.4726 25.0274"
        stroke={secondaryColor}
        strokeWidth={6.39535}
        strokeLinecap="round"
      />
    </Svg>
  );
};

export default ChatIcon;
