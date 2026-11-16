import { z } from 'zod';

const colorPair = z.object({
  light: z.string().trim().min(1).max(100).describe('Color used in light mode; hex is recommended.'),
  dark: z.string().trim().min(1).max(100).describe('Color used in dark mode; hex is recommended.'),
}).strict();

export const themeDefinition = z.object({
  brand: z.object({
    colors: z.object({
      primary: colorPair,
      secondary: colorPair.optional(),
      tertiary: colorPair.optional(),
    }).strict(),
  }).strict(),
  text: z.object({
    font: z.string().trim().min(1).max(200),
    colors: z.object({
      primary: colorPair,
      placeholder: colorPair.optional(),
      disabled: colorPair.optional(),
    }).strict(),
  }).strict(),
  border: z.object({
    radius: z.object({
      default: z.number().nonnegative(),
      small: z.number().nonnegative(),
      large: z.number().nonnegative(),
    }).strict(),
    colors: z.object({
      default: colorPair,
      weak: colorPair.optional(),
      disabled: colorPair.optional(),
    }).strict(),
  }).strict(),
  systemStatus: z.object({
    colors: z.object({
      success: colorPair,
      error: colorPair.optional(),
      warning: colorPair.optional(),
    }).strict(),
  }).strict(),
  surface: z.object({
    colors: z.object({
      appBackground: colorPair,
      surface1: colorPair,
      surface2: colorPair,
      surface3: colorPair,
    }).strict(),
  }).strict(),
}).strict();
