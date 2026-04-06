import React from 'react';
import { Text as RNText } from 'react-native';

export const Text = ({ style, ...props }) => {
  return (
    <RNText
      {...props}
      style={[
        { fontFamily: 'System', fontSize: 14, flexShrink: 1, flexWrap: 'wrap' },
        style
      ]}
    />
  );
};
