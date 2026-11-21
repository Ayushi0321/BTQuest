// TQuest color tokens — softened MBTA line colors, light + dark.
// Matches the design canvas. Use through useAppTheme(), never hard-code hex in screens.

export type Palette = {
  bg: string; card: string; card2: string; line: string; cardShadow: string;
  text: string; muted: string; track: string; scrim: string; face: string;
  red: string; redBtn: string; redDeep: string; redTint: string; redInk: string;
  orange: string; orangeTint: string; orangeInk: string;
  green: string; greenBtn: string; greenDeep: string; greenTint: string; greenInk: string;
  blue: string; blueBtn: string; blueDeep: string; blueTint: string; blueInk: string;
  purple: string; purpleTint: string;
  gold: string; goldDeep: string; goldTint: string; goldInk: string;
  land: string; street: string; park: string; water: string; mapLabel: string;
};

export const light: Palette = {
  bg: '#F7F5F0', card: '#FFFFFF', card2: '#EEEBE3', line: '#E2DED4', cardShadow: '#E2DED4',
  text: '#1E2A38', muted: '#5A6573', track: '#D9D4C8', scrim: 'rgba(30,42,56,0.45)', face: '#FFF6EC',
  red: '#E26B60', redBtn: '#C64B41', redDeep: '#9C3830', redTint: '#FBE6E3', redInk: '#A23E35',
  orange: '#EE9A45', orangeTint: '#FDEEDC', orangeInk: '#9A4712',
  green: '#4FA874', greenBtn: '#2F8556', greenDeep: '#22633F', greenTint: '#E1F2E7', greenInk: '#22683F',
  blue: '#5A80C6', blueBtn: '#3F65AE', blueDeep: '#2F4E89', blueTint: '#E3EBF8', blueInk: '#2F4E89',
  purple: '#9C5E95', purpleTint: '#F2E6F0',
  gold: '#E6B23A', goldDeep: '#B68719', goldTint: '#FBF1D6', goldInk: '#7A5A0C',
  land: '#ECE8DE', street: '#FFFFFF', park: '#D5E6CB', water: '#C4DAEE', mapLabel: '#3C4652',
};

export const dark: Palette = {
  bg: '#121821', card: '#1B2330', card2: '#252F3E', line: '#313D4E', cardShadow: '#0B1017',
  text: '#E7ECF2', muted: '#A0ACBA', track: '#3A4657', scrim: 'rgba(0,0,0,0.6)', face: '#FFF2E2',
  red: '#E57D72', redBtn: '#C64B41', redDeep: '#7E2C25', redTint: '#3A2428', redInk: '#F2A39A',
  orange: '#F0A55A', orangeTint: '#3A2B1A', orangeInk: '#F4B877',
  green: '#5DB884', greenBtn: '#2F8556', greenDeep: '#1A4D31', greenTint: '#1E3328', greenInk: '#8FD3AA',
  blue: '#7096DA', blueBtn: '#3F65AE', blueDeep: '#26406F', blueTint: '#1F2A40', blueInk: '#A9C1EE',
  purple: '#C08AB9', purpleTint: '#2F2230',
  gold: '#E3B04A', goldDeep: '#8A6614', goldTint: '#352C17', goldInk: '#F0CD7A',
  land: '#18202A', street: '#232C39', park: '#1C2E24', water: '#1B2C40', mapLabel: '#C9D2DC',
};

// Font family names registered in src/app/_layout.tsx (Nunito, rounded like the design).
export const font = {
  bold: 'Nunito_700Bold',
  heavy: 'Nunito_800ExtraBold',
  black: 'Nunito_900Black',
};
