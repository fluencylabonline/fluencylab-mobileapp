import * as React from "react";
import Svg, { Path } from "react-native-svg";
import { useTheme } from "@/constants/useTheme"; // Make sure this path is correct

// Define the component
const SVGComponent = (props) => {
  // Call the hook *inside* the component function
  const { colors, isDark } = useTheme();

  // Now `isDark` and `colors` are available here
  return (
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
        // This conditional fill should now work correctly
        fill={isDark ? colors.colors.white : 'trasnparent'}
        stroke="#000000" // Consider making stroke color theme-dependent too?
        strokeWidth={4}
        strokeLinejoin="round"
      />
      <Path
        d="M35 24C35 22.8954 35.8954 22 37 22H41C42.1046 22 43 22.8954 43 24V41C43 42.6569 41.6569 44 40 44H35V24Z"
        stroke="#000000" // Consider making stroke color theme-dependent too?
        strokeWidth={4}
        strokeLinejoin="round"
      />
      <Path
        d="M11 12H19"
        stroke="black" // Consider making stroke color theme-dependent too?
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M11 19H23"
        stroke="black" // Consider making stroke color theme-dependent too?
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

export default SVGComponent;