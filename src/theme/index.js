// ─── WanderLost Design Tokens ─────────────────────────────────────────────────
//
// FONTS: replace the values below once the typefaces are decided and installed.
//   1. Run: npx expo install expo-font @expo-google-fonts/<chosen-font>
//   2. Load with useFonts() in App.js
//   3. Fill in the fontFamily string here — every screen imports FONTS automatically.
//
export const FONTS = {
  title: 'brandon-grotesque',
  body:  'adobe-text-pro',
};

// ─── Brand colours ────────────────────────────────────────────────────────────
export const COLORS = {
  blue:   '#3A9FFF',
  orange: '#FF6820',
  pink:   '#FF2D78',
  lime:   '#AAFF22',
  bg:     '#050505',
};

// ─── Ghost button — dark grey fill + white stroke, fixed pill shape ───────────
// Apply to every action button except the blob-shaped START button on the splash.
//
// Usage:
//   import { ghostBtn, ghostBtnTxt } from '../theme';
//   <TouchableOpacity style={ghostBtn}><Text style={ghostBtnTxt}>LABEL</Text></TouchableOpacity>
//
export const ghostBtn = {
  backgroundColor: '#1C1C1E',
  borderWidth:     1,
  borderColor:     'rgba(255,255,255,0.28)',
  borderRadius:    50,
  paddingVertical: 15,
  alignItems:      'center',
  justifyContent:  'center',
};

export const ghostBtnTxt = {
  color:         '#fff',
  fontSize:      13,
  fontWeight:    '600',
  letterSpacing: 2,
  fontFamily:    FONTS.title,
};

// ─── Small ghost button (back / skip / secondary actions) ─────────────────────
export const ghostBtnSm = {
  ...ghostBtn,
  paddingVertical:   10,
  paddingHorizontal: 20,
  borderRadius:      50,
};

export const ghostBtnSmTxt = {
  ...ghostBtnTxt,
  fontSize:      12,
  letterSpacing: 1.5,
  fontFamily:    FONTS.title,
};
