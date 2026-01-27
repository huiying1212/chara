import { AxisDefinition } from './types';

// The number of text description levels defined in the data below
export const SOURCE_LEVELS = 5;

export const X_AXIS: AxisDefinition = {
  name: 'Identity Stylization (X)',
  description: 'From Everyday Reality to Fictional/Iconic Archetypes',
  levels: [
    // Level 1: 绝对真实，毫无表演痕迹
    'Documentary photography style, ordinary everyday person, candid shot, unpolished, realistic skin texture, neutral lighting, "person next door" vibe',
    
    // Level 2: 职业化/社会化角色
    'Professional portrait, specific occupation uniform (e.g., doctor, office worker), neat and tidy, socially compliant appearance, realistic but groomed',
    
    // Level 3: 角色扮演/表演者 (Cosplayer)
    'Costumed performer, cosplay photography, theatrical makeup, distinct character outfit but clearly a human actor, stage lighting',
    
    // Level 4: 风格化角色 (Stylized Character)
    'Highly stylized 3D character render, Pixar/Disney style, exaggerated facial features, expressive shape language, distinct silhouette',
    
    // Level 5: 极度虚构/文化符号 (Fictional Icon)
    'Mythological or Superhero icon, larger-than-life presence, glowing aura, supernatural atmosphere, cultural symbol (e.g., Sun Wukong, Captain America), cinematic concept art'
  ]
};

export const Y_AXIS: AxisDefinition = {
  name: 'Laban Effort & Energy (Y)',
  description: 'From Bound/Sustained (Low) to Direct/Quick/Strong (High)',
  levels: [
    // Level 1: 极低能量，收缩 (Bound / Light / Sustained)
    'Shy introverted body language, looking down, rounded shoulders, minimizing body space, hands clutched together, hesitant pose, soft focus',
    
    // Level 2: 低能量，被动 (Passive)
    'Relaxed sitting or standing, leaning against wall, low muscle tone, calm demeanor, casual observation, slow movement',
    
    // Level 3: 中等能量，受控 (Neutral / Control)
    'Confident standing posture, clear silhouette, ready to interact, stable center of gravity, professional handshake pose, balanced weight',
    
    // Level 4: 高能量，动态 (Dynamic / Mobile)
    'Action-oriented, mid-motion, running or reaching, engaging core muscles, wide stance, wind-swept hair/clothing, sense of urgency',
    
    // Level 5: 爆发能量，戏剧化 (Explosive / Theatrical)
    'Extreme dynamic action shot, defying gravity, mid-air jump or combat strike, exaggerated perspective (foreshortening), intense facial expression, maximum motion blur, raw power'
  ]
};

export const Z_AXIS: AxisDefinition = {
  name: 'Embodiment Constraints (Z)',
  description: 'From Standard Body to Modified Morphology & Tool Extension',
  levels: [
    // Level 1: 标准身体，无负担 (Zero Constraint)
    'Standard athletic body type, simple tight-fitting clothing (t-shirt and jeans), no accessories, free range of motion, empty hands',
    
    // Level 2: 轻微约束 (Minor Constraint - Clothing/Object)
    'Casual street wear, holding a small everyday object (smartphone, coffee cup, book), slight asymmetry in pose',
    
    // Level 3: 内部身体约束 (Intrinsic Constraint - Age/Frailty/Mass)
    'Elderly body structure with a cane, or heavy distinct body mass (obese or bulky muscle), limited flexibility, visible weight distribution struggle',
    
    // Level 4: 外部服装约束 (Extrinsic Constraint - Costume)
    'Restrictive clothing, long flowing Victorian dress (Cinderella style) or heavy tactical gear, voluminous fabric interacting with the environment',
    
    // Level 5: 身体延伸/复杂道具 (Extension - Props/Weapons/Magic)
    'Holding large signature weapon (Shield, Golden Staff, Sword), magical effects extending from limbs, cyborg attachments, or non-human appendages (wings/tails)'
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