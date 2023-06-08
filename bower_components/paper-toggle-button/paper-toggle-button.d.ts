/**
 * DO NOT EDIT
 *
 * This file was automatically generated by
 *   https://github.com/Polymer/gen-typescript-declarations
 *
 * To modify these typings, edit the source file(s):
 *   paper-toggle-button.html
 */

/// <reference path="../polymer/types/polymer.d.ts" />
/// <reference path="../iron-flex-layout/iron-flex-layout.d.ts" />
/// <reference path="../paper-styles/color.d.ts" />
/// <reference path="../paper-styles/default-theme.d.ts" />
/// <reference path="../paper-behaviors/paper-checked-element-behavior.d.ts" />

/**
 * Material design: [Switch](https://www.google.com/design/spec/components/selection-controls.html#selection-controls-switch)
 *
 * `paper-toggle-button` provides a ON/OFF switch that user can toggle the state
 * by tapping or by dragging the switch.
 *
 * Example:
 *
 *     <paper-toggle-button></paper-toggle-button>
 *
 * ### Styling
 *
 * The following custom properties and mixins are available for styling:
 *
 * Custom property | Description | Default
 * ----------------|-------------|----------
 * `--paper-toggle-button-unchecked-bar-color` | Slider color when the input is not checked | `#000000`
 * `--paper-toggle-button-unchecked-button-color` | Button color when the input is not checked | `--paper-grey-50`
 * `--paper-toggle-button-unchecked-ink-color` | Selected/focus ripple color when the input is not checked | `--dark-primary-color`
 * `--paper-toggle-button-checked-bar-color` | Slider button color when the input is checked | `--primary-color`
 * `--paper-toggle-button-checked-button-color` | Button color when the input is checked | `--primary-color`
 * `--paper-toggle-button-checked-ink-color` | Selected/focus ripple color when the input is checked | `--primary-color`
 * `--paper-toggle-button-invalid-bar-color` | Slider button color when the input is invalid | `--error-color`
 * `--paper-toggle-button-invalid-button-color` | Button color when the input is invalid | `--error-color`
 * `--paper-toggle-button-invalid-ink-color` | Selected/focus ripple color when the input is invalid | `--error-color`
 * `--paper-toggle-button-unchecked-bar` | Mixin applied to the slider when the input is not checked | `{}`
 * `--paper-toggle-button-unchecked-button` | Mixin applied to the slider button when the input is not checked | `{}`
 * `--paper-toggle-button-unchecked-ink` | Mixin applied to the ripple when the input is not checked | `{}`
 * `--paper-toggle-button-checked-bar` | Mixin applied to the slider when the input is checked | `{}`
 * `--paper-toggle-button-checked-button` | Mixin applied to the slider button when the input is checked | `{}`
 * `--paper-toggle-button-checked-ink` | Mixin applied to the ripple when the input is checked | `{}`
 * `--paper-toggle-button-label-color` | Label color | `--primary-text-color`
 * `--paper-toggle-button-label-spacing` | Spacing between the label and the button | `8px`
 *
 * This element applies the mixin `--paper-font-common-base` but does not import `paper-styles/typography.html`.
 * In order to apply the `Roboto` font to this element, make sure you've imported `paper-styles/typography.html`.
 */
interface PaperToggleButtonElement extends Polymer.Element, Polymer.PaperCheckedElementBehavior {
  attached(): void;

  /**
   * customize the element's ripple
   */
  _createRipple(): any;
  _ontrack(event: any): void;
  _trackStart(track: any): void;
  _trackMove(track: any): void;
  _trackEnd(track: any): void;
}

interface HTMLElementTagNameMap {
  "paper-toggle-button": PaperToggleButtonElement;
}
