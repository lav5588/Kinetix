import React, { useCallback, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

export interface PressableScaleProps extends PressableProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
}

export function PressableScale({
  children,
  style,
  onPress,
  onPressIn,
  onPressOut,
  onLongPress,
  disabled,
  accessibilityRole,
  scaleTo = 0.97,
  ...props
}: PressableScaleProps): React.JSX.Element {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = useCallback(
    (toValue: number) => {
      if (disabled) {
        scale.setValue(1);
        return;
      }

      Animated.spring(scale, {
        toValue,
        friction: 7,
        tension: 110,
        useNativeDriver: true,
      }).start();
    },
    [disabled, scale],
  );

  const handlePressIn = useCallback(
    (event: Parameters<NonNullable<PressableProps['onPressIn']>>[0]) => {
      animateTo(scaleTo);
      onPressIn?.(event);
    },
    [animateTo, onPressIn, scaleTo],
  );

  const handlePressOut = useCallback(
    (event: Parameters<NonNullable<PressableProps['onPressOut']>>[0]) => {
      animateTo(1);
      onPressOut?.(event);
    },
    [animateTo, onPressOut],
  );

  return (
    <Animated.View style={[styles.wrapper, { transform: [{ scale }] }]}>
      <Pressable
        {...props}
        accessibilityRole={accessibilityRole ?? 'button'}
        disabled={disabled}
        onLongPress={onLongPress}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={style}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: 'stretch',
  },
});
