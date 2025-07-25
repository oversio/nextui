import type {ToggleVariantProps, ToggleSlots, SlotsToClasses} from "@heroui/theme";
import type {AriaSwitchProps} from "@react-aria/switch";
import type {HTMLHeroUIProps, PropGetter} from "@heroui/system";
import type {ReactNode, Ref} from "react";

import {useCallback, useId, useRef} from "react";
import {mapPropsVariants, useProviderContext} from "@heroui/system";
import {mergeRefs} from "@heroui/react-utils";
import {useSafeLayoutEffect} from "@heroui/use-safe-layout-effect";
import {useHover} from "@react-aria/interactions";
import {toggle} from "@heroui/theme";
import {clsx, dataAttr, objectToDeps, chain, mergeProps} from "@heroui/shared-utils";
import {useSwitch as useReactAriaSwitch} from "@react-aria/switch";
import {useMemo} from "react";
import {useToggleState} from "@react-stately/toggle";
import {useFocusRing} from "@react-aria/focus";

export type SwitchThumbIconProps = {
  width: string;
  height: string;
  "data-checked": string;
  isSelected: boolean;
  className: string;
};

interface Props extends HTMLHeroUIProps<"input"> {
  /**
   * Ref to the DOM node.
   */
  ref?: Ref<HTMLInputElement>;
  /**
   * The label of the switch.
   */
  children?: ReactNode;
  /**
   * Whether the switch is disabled.
   * @default false
   */
  isDisabled?: boolean;
  /**
   * The icon to be displayed inside the thumb.
   */
  thumbIcon?: ReactNode | ((props: SwitchThumbIconProps) => ReactNode);
  /**
   * Start icon to be displayed inside the switch.
   */
  startContent?: ReactNode;
  /**
   * End icon to be displayed inside the switch.
   */
  endContent?: ReactNode;
  /**
   * Classname or List of classes to change the classNames of the element.
   * if `className` is passed, it will be added to the base slot.
   *
   * @example
   * ```ts
   * <Switch classNames={{
   *    base:"base-classes",
   *    wrapper: "wrapper-classes",
   *    thumb: "thumb-classes",
   *    thumbIcon: "thumbIcon-classes",
   *    label: "label-classes",
   * }} />
   * ```
   */
  classNames?: SlotsToClasses<ToggleSlots>;
  /**
   * React aria onChange event.
   */
  onValueChange?: AriaSwitchProps["onChange"];
}

export type UseSwitchProps = Omit<Props, "defaultChecked"> &
  Omit<AriaSwitchProps, keyof ToggleVariantProps | "onChange"> &
  ToggleVariantProps;

export function useSwitch(originalProps: UseSwitchProps = {}) {
  const globalContext = useProviderContext();

  const [props, variantProps] = mapPropsVariants(originalProps, toggle.variantKeys);

  const {
    ref,
    as,
    name,
    value = "",
    isReadOnly: isReadOnlyProp = false,
    autoFocus = false,
    startContent,
    endContent,
    defaultSelected,
    isSelected: isSelectedProp,
    children,
    thumbIcon,
    className,
    classNames,
    onChange,
    onValueChange,
    ...otherProps
  } = props;

  const Component = as || "label";

  const domRef = useRef<HTMLLabelElement>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const disableAnimation =
    originalProps.disableAnimation ?? globalContext?.disableAnimation ?? false;

  const labelId = useId();

  const ariaSwitchProps = useMemo(() => {
    const ariaLabel =
      otherProps["aria-label"] || typeof children === "string" ? (children as string) : undefined;

    return {
      name,
      value,
      children,
      autoFocus,
      defaultSelected,
      isSelected: isSelectedProp,
      isDisabled: !!originalProps.isDisabled,
      isReadOnly: isReadOnlyProp,
      "aria-label": ariaLabel,
      "aria-labelledby": otherProps["aria-labelledby"] || labelId,
      onChange: onValueChange,
    };
  }, [
    value,
    name,
    labelId,
    children,
    autoFocus,
    isReadOnlyProp,
    isSelectedProp,
    defaultSelected,
    originalProps.isDisabled,
    otherProps["aria-label"],
    otherProps["aria-labelledby"],
    onValueChange,
  ]);

  const state = useToggleState(ariaSwitchProps);

  // if we use `react-hook-form`, it will set the switch value using the ref in register
  // i.e. setting ref.current.checked to true or false which is uncontrolled
  // hence, sync the state with `ref.current.checked`
  useSafeLayoutEffect(() => {
    if (!inputRef.current) return;
    const isInputRefChecked = !!inputRef.current.checked;

    state.setSelected(isInputRefChecked);
  }, [inputRef.current]);

  const {inputProps, isPressed, isReadOnly} = useReactAriaSwitch(ariaSwitchProps, state, inputRef);
  const {focusProps, isFocused, isFocusVisible} = useFocusRing({autoFocus: inputProps.autoFocus});
  const {hoverProps, isHovered} = useHover({
    isDisabled: inputProps.disabled,
  });

  const isInteractionDisabled = ariaSwitchProps.isDisabled || isReadOnly;

  const pressed = isInteractionDisabled ? false : isPressed;

  const isSelected = inputProps.checked;
  const isDisabled = inputProps.disabled;

  const slots = useMemo(
    () =>
      toggle({
        ...variantProps,
        disableAnimation,
      }),
    [objectToDeps(variantProps), disableAnimation],
  );

  const baseStyles = clsx(classNames?.base, className);

  const getBaseProps: PropGetter = (props) => {
    return {
      ...mergeProps(hoverProps, otherProps, props),
      ref: domRef,
      className: slots.base({class: clsx(baseStyles, props?.className)}),
      "data-disabled": dataAttr(isDisabled),
      "data-selected": dataAttr(isSelected),
      "data-readonly": dataAttr(isReadOnly),
      "data-focus": dataAttr(isFocused),
      "data-focus-visible": dataAttr(isFocusVisible),
      "data-hover": dataAttr(isHovered),
      "data-pressed": dataAttr(pressed),
    };
  };

  const getWrapperProps: PropGetter = useCallback(
    (props = {}) => {
      return {
        ...props,
        "aria-hidden": true,
        className: clsx(slots.wrapper({class: clsx(classNames?.wrapper, props?.className)})),
      };
    },
    [slots, classNames?.wrapper],
  );

  const getInputProps: PropGetter = (props = {}) => {
    return {
      ...mergeProps(inputProps, focusProps, props),
      ref: mergeRefs(inputRef, ref),
      id: inputProps.id,
      className: slots.hiddenInput({class: classNames?.hiddenInput}),
      onChange: chain(onChange, inputProps.onChange),
    };
  };

  const getThumbProps: PropGetter = useCallback(
    (props = {}) => ({
      ...props,
      className: slots.thumb({class: clsx(classNames?.thumb, props?.className)}),
    }),
    [slots, classNames?.thumb],
  );

  const getLabelProps: PropGetter = useCallback(
    (props = {}) => ({
      ...props,
      id: labelId,
      className: slots.label({class: clsx(classNames?.label, props?.className)}),
    }),
    [slots, classNames?.label, isDisabled, isSelected],
  );

  const getThumbIconProps = useCallback(
    (
      props = {
        includeStateProps: false,
      },
    ) =>
      mergeProps(
        {
          width: "1em",
          height: "1em",
          className: slots.thumbIcon({class: clsx(classNames?.thumbIcon)}),
        },
        props.includeStateProps
          ? {
              isSelected: isSelected,
            }
          : {},
      ) as unknown as SwitchThumbIconProps,
    [slots, classNames?.thumbIcon, isSelected],
  );

  const getStartContentProps = useCallback<PropGetter>(
    (props = {}) => ({
      width: "1em",
      height: "1em",
      ...props,
      className: slots.startContent({class: clsx(classNames?.startContent, props?.className)}),
    }),
    [slots, classNames?.startContent, isSelected],
  );

  const getEndContentProps = useCallback<PropGetter>(
    (props = {}) => ({
      width: "1em",
      height: "1em",
      ...props,
      className: slots.endContent({class: clsx(classNames?.endContent, props?.className)}),
    }),
    [slots, classNames?.endContent, isSelected],
  );

  return {
    Component,
    slots,
    classNames,
    domRef,
    children,
    thumbIcon,
    startContent,
    endContent,
    isHovered,
    isSelected,
    isPressed: pressed,
    isFocused,
    isFocusVisible,
    isDisabled,
    getBaseProps,
    getWrapperProps,
    getInputProps,
    getLabelProps,
    getThumbProps,
    getThumbIconProps,
    getStartContentProps,
    getEndContentProps,
  };
}

export type UseSwitchReturn = ReturnType<typeof useSwitch>;
