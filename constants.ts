import { AxisDefinition } from './types';

// The number of text description levels defined in the data below
export const SOURCE_LEVELS = 5;

export const X_AXIS: AxisDefinition = {
  name: 'Stylization (X)',
  description: 'From Realistic Human to Abstract/Fictional Character',
  levels: [
    'Hyper-realistic photography, 8k resolution, raw photo, pores visible, unedited real life',
    'Realistic portrait, soft cinematic lighting, professional photography',
    'Semi-realistic digital art, smooth texture, concept art style, detailed shading',
    'Stylized character design, illustrative style, cel-shaded, bold lines, 2D/3D hybrid',
    'Abstract, highly stylized, avant-garde art, surreal features, distorted proportions, dreamlike'
  ]
};

export const Y_AXIS: AxisDefinition = {
  name: 'Energy / Laban Effort (Y)',
  description: 'From Restrained/Shy to Dynamic/Powerful',
  levels: [
    'Sitting quietly, shy, restrained pose, looking down, low energy, folded hands, introverted',
    'Standing still, calm, neutral expression, relaxed posture, steady breathing',
    'Walking purposefully, confident gesture, active engagement, interacting with environment',
    'Running, jumping, dynamic action pose, high energy, wind blowing hair, tense muscles',
    'Explosive movement, god-like power, screaming energy, motion blur, extreme perspective, warping reality'
  ]
};

export const Z_AXIS: AxisDefinition = {
  name: 'Physical Constraints (Z)',
  description: 'From Standard Body to Complex Morphology/Props',
  levels: [
    'Standard human anatomy, casual minimal clothing, no accessories',
    'Wearing distinct fashion, holding a small everyday object (phone, book, cup)',
    'Holding large tools or weapons, wearing heavy armor or elaborate historical costume',
    'Cyborg parts, mechanical limbs, glowing tech integration, or large wings',
    'Non-human morphology, multiple arms, floating magical objects, elemental body transformation, ethereal form'
  ]
};

export const DEFAULT_SUBJECT = "A character";

export const PROMPT_SUFFIX = `
Full body shot showing the complete character from head to toe.
Standing upright in a neutral pose (arms relaxed at sides if applicable).
Front view, eye-level perspective, facing directly forward.
Isolated on pure white background, no props, no shadows, no other objects.
Neutral, even lighting with no dramatic shadows.
Professional reference image style, high resolution, clean and crisp.
`;