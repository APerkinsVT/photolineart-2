export interface GenericTipEntry {
  title: string;
  body: string;
}

export const GENERIC_TIP_ENTRIES: GenericTipEntry[] = [
  {
    title: 'Build color in translucent layers, not hero strokes',
    body:
      'Start with very light pressure and gradually stack multiple layers instead of forcing full intensity in one pass. Optical mixing keeps the paper tooth alive so it will hold more pigment and you can blend yellow over blue to get green, etc.',
  },
  {
    title: 'Use your stroke direction to hide the pencil, not advertise it',
    body:
      'For smooth areas (skin, sky, car paint) use tiny overlapping circles or short back-and-forth strokes, then crosshatch in a different direction on later layers to fill the tooth and erase visible pencil lines.',
  },
  {
    title: 'Reserve burnishing for the endgame, not the opening move',
    body:
      'Burnish only after stacking several light and medium layers. Use a lighter pencil, colorless blender, or even white over darker passages to push pigment into the paper for a waxy, polished finish—then stop, because crushed tooth will not accept more color.',
  },
  {
    title: 'Shade with color logic, not just the next-dark pencil',
    body:
      'Instead of simply grabbing the darker value of the same hue, mix in complementary or neighboring colors—red with deep green, yellow with violet, blue with warm brown—to build luminous shadows that stay alive and dimensional.',
  },
  {
    title: 'Treat black as a spice, not a base coat',
    body:
      'Layer several deep colors (indigos, dark greens, aubergines, deep browns) to build darks. If you add black at all, glaze it lightly over those mixes so the area still reads as dimensional, not like a flat hole in the page.',
  },
  {
    title: 'Exploit the white of the paper like another pencil',
    body:
      'Plan highlights at the start and simply don’t color them. Feather strokes as you approach highlight zones so the transition from saturated color to bare paper is soft and intentional rather than a hard outline.',
  },
  {
    title: 'Refine edges and textures after the big blends',
    body:
      'Block in values and big color shapes first, blend, then return with a very sharp pencil for edges, fabric weave, hair, metal accents, and line art reinforcement. Use the pencil’s side for broad transitions and the point for crisp details.',
  },
  {
    title: 'Proof every idea in a margin “test lab”',
    body:
      'Keep a strip of matching paper next to your page and test layer order, pressure, burnish, or solvent on that scrap before committing it to the artwork. It prevents irreversible mistakes and lets you work more aggressively where it counts.',
  },
];

export const GENERIC_TIP_TEXT = GENERIC_TIP_ENTRIES.map(
  (tip) => `${tip.title}. ${tip.body}`,
);
