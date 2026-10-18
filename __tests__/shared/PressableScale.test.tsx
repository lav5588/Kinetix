import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { PressableScale } from '@shared/components/PressableScale';

describe('PressableScale', () => {
  it('forwards accessibility metadata and invokes presses when enabled', () => {
    const onPress = jest.fn();
    const onLongPress = jest.fn();

    render(
      <PressableScale
        accessibilityLabel="Open details"
        accessibilityRole="button"
        onLongPress={onLongPress}
        onPress={onPress}
        testID="pressable-scale"
      >
        <Text>Action</Text>
      </PressableScale>,
    );

    const pressable = screen.getByTestId('pressable-scale');
    expect(pressable.props.accessibilityLabel).toBe('Open details');
    expect(pressable.props.accessibilityRole).toBe('button');

    fireEvent(pressable, 'pressIn');
    fireEvent.press(pressable);
    fireEvent(pressable, 'longPress');

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it('respects disabled state', () => {
    const onPress = jest.fn();

    render(
      <PressableScale disabled onPress={onPress} testID="disabled-pressable">
        <Text>Disabled</Text>
      </PressableScale>,
    );

    const pressable = screen.getByTestId('disabled-pressable');
    expect(pressable).toBeTruthy();

    fireEvent.press(pressable);
    expect(onPress).not.toHaveBeenCalled();
  });
});
