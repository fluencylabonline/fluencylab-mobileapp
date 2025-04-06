import * as React from "react";
import Svg, { Rect, Path } from "react-native-svg";

const SVGComponent = (props) => (
  <Svg
    width="38px"
    height="38px"
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <Path
      d="M5 7C5 5.34315 6.34315 4 8 4H32C33.6569 4 35 5.34315 35 7V44H8C6.34315 44 5 42.6569 5 41V7Z"
      fill="#598DA6"
      stroke="#000000"
      strokeWidth={4}
      strokeLinejoin="round"
    />
    <Path
      d="M35 24C35 22.8954 35.8954 22 37 22H41C42.1046 22 43 22.8954 43 24V41C43 42.6569 41.6569 44 40 44H35V24Z"
      stroke="#000000"
      strokeWidth={4}
      strokeLinejoin="round"
    />
    <Path
      d="M11 12H19"
      stroke="white"
      strokeWidth={4}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M11 19H23"
      stroke="white"
      strokeWidth={4}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);
export default SVGComponent;
