import React from "react";
import Svg, { Path } from "react-native-svg";

const CalendarIcon = ({ size = 34, color1 = "#3A3A3A", color2 = "#2C1A7E" }) => (
  <Svg width={size} height={(size * 86) / 90} viewBox="0 0 90 86" fill="none" xmlns="http://www.w3.org/2000/svg">
    <Path d="M30.0144 7.60446V18.2067" stroke={color1} strokeWidth={5.32946} strokeMiterlimit={10} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M59.7314 7.60446V18.2067" stroke={color1} strokeWidth={5.32946} strokeMiterlimit={10} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M67.9037 76.1655C74.4685 76.1655 79.7905 71.1022 79.7905 64.8565C79.7905 58.6107 74.4685 53.5474 67.9037 53.5474C61.3388 53.5474 56.0168 58.6107 56.0168 64.8565C56.0168 71.1022 61.3388 76.1655 67.9037 76.1655Z" stroke={color2} strokeWidth={5.32946} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M82.0191 78.2859L78.3044 74.7518" stroke={color2} strokeWidth={5.32946} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M13.2986 32.6609H76.4472" stroke={color1} strokeWidth={5.32946} strokeMiterlimit={10} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M49.9618 78.2859H30.0143C17.0131 78.2859 11.4412 71.2178 11.4412 60.6156V30.5759C11.4412 19.9737 17.0131 12.9056 30.0143 12.9056H59.7313C72.7325 12.9056 78.3044 19.9737 78.3044 30.5759V46.4793" stroke={color1} strokeWidth={5.32946} strokeMiterlimit={10} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M44.8562 48.9531H44.8895" stroke={color2} strokeWidth={7.10594} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M31.1077 48.9531H31.1409" stroke={color2} strokeWidth={7.10594} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M31.1077 59.5553H31.1409" stroke={color2} strokeWidth={7.10594} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export default CalendarIcon;
