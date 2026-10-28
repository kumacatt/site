import { getAssetUrl } from '../utils/asset';

export type RealmType = 'gamedev' | 'design';

export type CardSpan = 'vertical' | 'horizontal' | 'wide' | 'square';

export type LocalizedString = string | { ru: string; en: string };

export function getLocalized(val: LocalizedString | undefined, lang: 'ru' | 'en'): string {
  if (!val) return '';
  if (typeof val === 'object') {
    return val[lang] || val.ru || val.en || '';
  }
  return val;
}

export interface ProjectArticle {
  overview: LocalizedString;
  problemAndGoal?: LocalizedString;
  pipeline?: {
    title: LocalizedString;
    description: LocalizedString;
    stepSoftware?: string[];
  }[];
  specs?: { label: LocalizedString; value: LocalizedString }[];
  gallery?: { url: string; caption?: LocalizedString }[];
  beforeAfter?: {
    beforeLabel: LocalizedString;
    beforeImage: string;
    afterLabel: LocalizedString;
    afterImage: string;
  };
}

export interface Project {
  id: string;
  title: LocalizedString;
  realm: RealmType;
  type: 'case' | 'shot';
  span: CardSpan; // Controls bento grid span (vertical, horizontal, wide, square)
  subcategories: string[];
  software: string[];
  role: LocalizedString;
  year: string;
  cover: string;       // _P (Preview for grid thumbnail)
  fullImage?: string;  // _F (High-resolution for modal view)
  additionalImages?: string[]; // Extra views / slides
  videoUrl?: string;   // Optional video/gameplay
  artstationUrl?: string; // Direct link to ArtStation post
  shortDescription: LocalizedString;
  article?: ProjectArticle;
}

const RAW_PROJECTS: Project[] = [
  // ================= GAMEDEV & CG (1_...) =================
  {
    id: 'fragile',
    title: 'Fragile',
    realm: 'gamedev',
    type: 'case',
    span: 'square', // 1:1 single square in grid
    subcategories: ['Game Dev', '3D Art', 'Art Vision', 'Godot'],
    software: ['godot', 'blender', 'substancep', 'photoshop'],
    role: {
      ru: '3D-художник & Арт-вижн',
      en: '3D Artist & Art Direction'
    },
    year: '2024',
    cover: '/1_fragile_P.gif', // Animated preview!
    fullImage: '/1_fragile_assets.png',
    videoUrl: '/1_fragile_gameplay.mp4',
    additionalImages: [
      '/1_fragile_screen (1).jpg',
      '/1_fragile_screen (2).jpg',
      '/1_fragile_screen (3).jpg',
      '/1_fragile_logo.png'
    ],
    shortDescription: {
      ru: 'Невышедшая игра на Godot от команды Cordit: 3D-моделирование, пропсы, нарратив, концепт и арт-вижн.',
      en: 'Unreleased indie game on Godot by Cordit: 3D environment, props, narrative, concept art, and art direction.'
    },
    article: {
      overview: {
        ru: '«Fragile» — невышедшая игра на движке Godot, которую мы разрабатывали в команде Cordit (небольшое инди-объединение). В проекте я выступал в роли 3D-художника и отвечал за общее визуальное видение (арт-вижн): занимался пропсами, нарративом, концепт-артом и 3D-моделированием.',
        en: '"Fragile" is an unreleased indie game on Godot Engine developed by Cordit. I acted as a 3D artist and art lead: creating props, visual storytelling, concept art, and 3D modeling.'
      },
      specs: [
        { label: { ru: 'Команда', en: 'Team' }, value: 'Cordit' },
        {
          label: { ru: 'Роль', en: 'Role' },
          value: {
            ru: '3D-художник, арт-вижн, пропсы, нарратив',
            en: '3D artist, art vision, props, narrative'
          }
        },
        { label: { ru: 'Движок', en: 'Engine' }, value: 'Godot Engine' },
        { label: { ru: 'Инструменты', en: 'Tools' }, value: 'Blender, Substance Painter, Photoshop, Godot' }
      ]
    }
  },
  {
    id: 'sinclair',
    title: {
      ru: 'Sinclair — 2D Фан-концепт',
      en: 'Sinclair — 2D Fan-Concept'
    },
    realm: 'gamedev',
    type: 'case',
    span: 'square', // 1_Sinclair_P.png is 1:1 square
    subcategories: ['2D Art', 'Fan Concept', 'Deadlock'],
    software: ['clipstd', 'photoshop'],
    role: {
      ru: '2D-концепт художник',
      en: '2D Concept Artist'
    },
    year: '2024',
    cover: '/1_Sinclair_P.png',
    fullImage: '/1_Sinclair_F1.png',
    additionalImages: ['/1_Sinclair_F2.png'],
    artstationUrl: 'https://www.artstation.com/artwork/wO6wn6',
    shortDescription: {
      ru: '2D фан-концепт скина для игры Deadlock (Valve): поиск силуэта, деталей и цвета.',
      en: '2D character skin fan-concept for Deadlock (Valve): silhouette exploration, costume detailing, and color grading.'
    },
    article: {
      overview: {
        ru: '2D фан-концепт скина персонажа для Deadlock (Valve). Проработка стилистики и костюма в духе игры.',
        en: '2D character skin fan-concept for Deadlock (Valve). Developing stylized costume and silhouette matching the game aesthetic.'
      },
      specs: [
        { label: { ru: 'Проект', en: 'Project' }, value: 'Deadlock 2D Fan-Concept' },
        { label: { ru: 'Формат', en: 'Format' }, value: '2D Concept Art' },
        { label: 'ArtStation', value: 'artstation.com/artwork/wO6wn6' }
      ]
    }
  },
  {
    id: 'gurges',
    title: {
      ru: 'Гургес — Unity Environment & Shaders',
      en: 'Gurges — Unity Environment & Shaders'
    },
    realm: 'gamedev',
    type: 'case',
    span: 'horizontal',
    subcategories: ['Game Dev', '3D Environment', 'Unity', 'Shaders', 'Concept Art'],
    software: ['unity', 'blender', 'photoshop', 'clipstd'],
    role: {
      ru: '3D Environment Artist & Tech Art',
      en: '3D Environment Artist & Tech Art'
    },
    year: '2023',
    cover: '/1_gurges_P.png',
    fullImage: '/1_gurges1_F.png',
    additionalImages: [
      '/1_gurges2_F.png',
      '/1_gurges3_F.png',
      '/1_gurges4_F.png',
      '/1_gurges5_F.png'
    ],
    shortDescription: {
      ru: 'Первый опыт создания комплексного игрового энвайронмента на движке Unity (2023): концепты персонажей и окружения, сборка сцены, освещение и кастомные шейдеры.',
      en: 'First comprehensive game environment project built in Unity (2023 archive): character & environment concept art, engine scene assembly, mood lighting, and custom shaders.'
    },
    article: {
      overview: {
        ru: '«Гургес» — мой первый масштабный опыт разработки цельного игрового энвайронмента на движке Unity (работа 2023 года). В проекте был пройден полный пайплайн: от первичных концептов персонажей и окружения до финальной сборки сцены в движке, настройки атмосферного освещения и написания кастомных шейдеров.',
        en: '"Gurges" is my first comprehensive game environment project developed in Unity (2023 archive). The project spans the complete pipeline: from initial character and environment concept art to final engine scene assembly, atmospheric lighting, and custom shader development.'
      },
      specs: [
        { label: { ru: 'Проект', en: 'Project' }, value: 'Гургес (Gurges)' },
        { label: { ru: 'Движок', en: 'Engine' }, value: 'Unity 3D' },
        { label: { ru: 'Год', en: 'Year' }, value: '2023' },
        {
          label: { ru: 'Роль', en: 'Role' },
          value: {
            ru: 'Энвайронмент-художник, концепт-арт, тех-арт, шейдеры',
            en: 'Environment Artist, Concept Art, Tech Art, Shaders'
          }
        },
        { label: { ru: 'Инструменты', en: 'Tools' }, value: 'Unity 3D, Blender, Photoshop, Clip Studio Paint' }
      ]
    }
  },
  {
    id: 'speedsculpt-toad',
    title: {
      ru: 'Toad — Спидскульпт',
      en: 'Toad — Speedsculpt'
    },
    realm: 'gamedev',
    type: 'shot',
    span: 'square',
    subcategories: ['3D Art', 'Sculpting', '3D No Life'],
    software: ['zbrush', 'blender'],
    role: {
      ru: '3D-скульптор',
      en: '3D Sculptor'
    },
    year: '2024',
    cover: '/1_speedsculpt_jab_P.png',
    fullImage: '/1_speedsculpt_jab_F.png',
    shortDescription: {
      ru: 'Стилизованный персонажик: спидскульпт-челлендж из Discord-канала «3D No Life». Поиск формы и пластики в ZBrush.',
      en: 'Stylized character: speedsculpt challenge from the "3D No Life" Discord community. Exploring anatomy, character, and volume in ZBrush.'
    }
  },
  {
    id: 'speedsculpt-mushroom',
    title: {
      ru: 'Mushroom — Спидскульпт',
      en: 'Mushroom — Speedsculpt'
    },
    realm: 'gamedev',
    type: 'shot',
    span: 'horizontal',
    subcategories: ['3D Art', 'Sculpting', '3D No Life'],
    software: ['zbrush', 'blender'],
    role: {
      ru: '3D-скульптор',
      en: '3D Sculptor'
    },
    year: '2024',
    cover: '/1_speedsculpt_mushroom.png',
    fullImage: '/1_speedsculpt_mushroom.png',
    shortDescription: {
      ru: 'Прикольный стилизованный персонаж-гриб: челлендж со спидскульпта в Discord-канале «3D No Life». Объём, пластика и фактура.',
      en: 'Stylized mushroom character: speedsculpt challenge from "3D No Life" Discord. Sculpting organic volume, texture, and character in ZBrush.'
    }
  },
  {
    id: 'fumel',
    title: {
      ru: 'Fumel — Персонаж',
      en: 'Fumel — Original Character'
    },
    realm: 'gamedev',
    type: 'shot',
    span: 'square', // 1_fumel_P.png is 1:1 square
    subcategories: ['2D Art', 'Concept Art', 'Character Design'],
    software: ['clipstd', 'photoshop'],
    role: {
      ru: '2D-концепт художник',
      en: '2D Concept Artist'
    },
    year: '2024',
    cover: '/1_fumel_P.png',
    fullImage: '/1_fumel_F.png',
    artstationUrl: 'https://www.artstation.com/artwork/8veRDx',
    shortDescription: {
      ru: 'Личный персонаж из портфолио на ArtStation: концепт-арт, дизайн костюма, силуэт и цветовая гамма.',
      en: 'Original character from ArtStation portfolio: concept art, costume design, silhouette exploration, and color palette.'
    }
  },
  {
    id: 'wintercore',
    title: 'Wintercore',
    realm: 'gamedev',
    type: 'shot',
    span: 'vertical', // 1_whintercore.png (2100x2900) — вертикальная
    subcategories: ['2D Art', 'Illustration'],
    software: ['clipstd', 'photoshop'],
    role: {
      ru: '2D-иллюстратор',
      en: '2D Illustrator'
    },
    year: '2024',
    cover: '/1_whintercore.png',
    fullImage: '/1_whintercore.png',
    artstationUrl: 'https://www.artstation.com/artwork/m8RyXd',
    shortDescription: {
      ru: 'Атмосферная цифровая 2D-иллюстрация в холодной графической гамме из портфолио на ArtStation.',
      en: 'Atmospheric 2D digital illustration in cold stylized palette from ArtStation portfolio.'
    }
  },
  {
    id: 'fishing',
    title: 'Fishing',
    realm: 'gamedev',
    type: 'shot',
    span: 'vertical', // 1_fishing.png (3944x6752) — вертикальный портрет
    subcategories: ['2D Art', 'Concept Art'],
    software: ['clipstd', 'photoshop'],
    role: {
      ru: '2D-художник',
      en: '2D Artist'
    },
    year: '2024',
    cover: '/1_fishing.png',
    fullImage: '/1_fishing.png',
    shortDescription: {
      ru: 'Атмосферный вертикальный концепт-арт с глубоким акцентным светом и силуэтной пластикой.',
      en: 'Atmospheric vertical concept art featuring moody dramatic lighting and expressive silhouette flow.'
    }
  },
  {
    id: 'knitted',
    title: 'Knitted',
    realm: 'gamedev',
    type: 'case',
    span: 'wide', // 1_nitted_P.png (3440x1440) — ультраширокая панорама
    subcategories: ['2D Art', 'World Building', 'Concept Art'],
    software: ['clipstd', 'photoshop'],
    role: {
      ru: '2D-художник / Ворлдбилдинг',
      en: '2D Artist / World Builder'
    },
    year: '2024 (WIP)',
    cover: '/1_nitted_P.png',
    fullImage: '/1_nitted_P.png',
    additionalImages: ['/1_nitted_character.PNG'],
    shortDescription: {
      ru: 'Проект в портфолио на ArtStation (в производстве): 2D world building, иллюстрации и концепты в Clip Studio Paint и Photoshop.',
      en: 'ArtStation portfolio project (in active production): 2D world building, environment illustrations, and concept art in Clip Studio Paint and Photoshop.'
    },
    article: {
      overview: {
        ru: '«Knitted» — проект в моём портфолио на ArtStation, который сейчас находится в активном производстве. Это работа над масштабным 2D world building-ом, концепт-артом и серией иллюстраций, выполненных в Clip Studio Paint и Photoshop.',
        en: '"Knitted" is an ArtStation portfolio project currently in active production. Focused on immersive 2D world building, keyframe storytelling, concept art, and illustrations crafted in Clip Studio Paint and Photoshop.'
      },
      specs: [
        {
          label: { ru: 'Статус', en: 'Status' },
          value: { ru: 'В производстве (WIP)', en: 'In Production (WIP)' }
        },
        {
          label: { ru: 'Направление', en: 'Focus' },
          value: { ru: '2D World Building, Концепт & Иллюстрация', en: '2D World Building, Concept Art & Illustration' }
        },
        {
          label: { ru: 'Инструменты', en: 'Tools' },
          value: 'Clip Studio Paint, Adobe Photoshop'
        }
      ]
    }
  },
  {
    id: 'game-icons',
    title: 'Game UI Icons',
    realm: 'gamedev',
    type: 'shot',
    span: 'square', // 1_icons_P.png is 1:1 square
    subcategories: ['Game Dev', 'UI Icons', '2D Art'],
    software: ['clipstd', 'photoshop'],
    role: {
      ru: '2D / UI-художник',
      en: '2D / UI Artist'
    },
    year: '2024',
    cover: '/1_icons_P.png',
    fullImage: '/1_icons_F.png',
    shortDescription: {
      ru: 'Сет игровых предметов и интерфейсных иконок. Сделано в Clip Studio Paint и Photoshop.',
      en: 'A set of in-game items and UI inventory icons designed in Clip Studio Paint and Photoshop.'
    }
  },
  {
    id: 'gamepromo',
    title: 'Game Promo Cover',
    realm: 'gamedev',
    type: 'shot',
    span: 'vertical', // 1_gamepromo_cover.png is 1667x2125 (0.78 portrait)
    subcategories: ['2D Art', 'Promo'],
    software: ['photoshop', 'clipstd'],
    role: {
      ru: 'Ключевой художник',
      en: 'Key Artist'
    },
    year: '2024',
    cover: '/1_gamepromo_cover.png',
    fullImage: '/1_gamepromo_cover.png',
    shortDescription: {
      ru: 'Промо-обложка и ключевой арт игрового проекта: композиция, фокус и типографика.',
      en: 'Promo cover and key visual for a game project: composition, lighting focus, and typography.'
    }
  },
  {
    id: 'morphin',
    title: {
      ru: 'Морфин — 2D Фан-концепт',
      en: 'Morphin — 2D Fan-Concept'
    },
    realm: 'gamedev',
    type: 'shot',
    span: 'square', // 1_MORPHINBeta.png (5606x4800)
    subcategories: ['2D Art', 'Concept Art', 'Fan Art'],
    software: ['clipstd', 'photoshop'],
    role: {
      ru: '2D-концепт художник',
      en: '2D Concept Artist'
    },
    year: '2024',
    cover: '/1_MORPHINBeta.png',
    fullImage: '/1_MORPHINBeta.png',
    shortDescription: {
      ru: '2D фан-концепт персонажа для ArtStation: пластика, поиск силуэта и деталей в Clip Studio Paint и Photoshop.',
      en: '2D character fan-concept for ArtStation: silhouette study, form exploration, and detailed rendering in Clip Studio Paint and Photoshop.'
    }
  },
  {
    id: 'novel-characters',
    title: {
      ru: 'Визуальная новелла — Персонажи',
      en: 'Visual Novel — Character Concepts'
    },
    realm: 'gamedev',
    type: 'case',
    span: 'horizontal',
    subcategories: ['2D Art', 'Game Dev', 'Concept Art', 'Character Design'],
    software: ['photoshop', 'clipstd'],
    role: {
      ru: '2D-концепт художник',
      en: '2D Concept Artist'
    },
    year: '2022',
    cover: '/1_novel_P.png',
    fullImage: '/1_novel_F.png',
    additionalImages: ['/1_novel2_F.png'],
    shortDescription: {
      ru: 'Поиски внешнего вида и визуального стиля персонажей для визуальной новеллы (архив 2022 года): концепт-арт голов, типажи, черты лица, причёски и мимика.',
      en: 'Visual exploration and character development for a visual novel (2022 archive): concept art, portrait studies, facial features, hairstyles, and personality expression.'
    },
    article: {
      overview: {
        ru: 'Концепт-арт и поиски внешнего вида ключевых персонажей для визуальной новеллы (работа 2022 года). Основной фокус проекта — исследование выразительных типажей, портретов, характерных черт лица, эмоций и причёсок, передающих индивидуальность и настроение каждого героя.',
        en: 'Concept art and visual exploration of key characters for a visual novel (2022 archive). Focused on establishing distinctive facial traits, portrait archetypes, hairstyles, expressions, and communicating each hero\'s personality and mood.'
      },
      specs: [
        {
          label: { ru: 'Проект', en: 'Project' },
          value: { ru: 'Визуальная новелла (Поиски персонажей)', en: 'Visual Novel Character Concepts' }
        },
        { label: { ru: 'Год', en: 'Year' }, value: '2022' },
        { label: { ru: 'Формат', en: 'Format' }, value: '2D Concept Art / Character Portraits' },
        { label: { ru: 'Инструменты', en: 'Tools' }, value: 'Adobe Photoshop, Clip Studio Paint' }
      ]
    }
  },

  // ================= DESIGN & IDENTITY (2_...) =================
  {
    id: 'kashtan',
    title: 'Kashtan 3D Office & Identity',
    realm: 'design',
    type: 'case',
    span: 'wide', // 2_kashtan3doffice_P.png (1222x592)
    subcategories: ['Brand Identity', '3D Visual'],
    software: ['blender', 'illustrator', 'figma'],
    role: {
      ru: '3D & Графический дизайнер',
      en: '3D & Graphic Designer'
    },
    year: '2024',
    cover: '/2_kashtan3doffice_P.png',
    fullImage: '/2_kashtan3doffice_F.png',
    additionalImages: [
      '/2_kashtan3doffice2_F.png',
      '/2_kashtan3doffice3_F.png',
      '/2_kashtan3doffice4_F.png',
      '/2_kashtan3doffice5_F.png'
    ],
    shortDescription: {
      ru: 'Айдентика бренда и 3D визуализация пространства: концепция офиса, айдентика и визуальные материалы.',
      en: 'Brand identity and 3D interior spatial visualization: office concept, identity guidelines, and presentation collateral.'
    },
    article: {
      overview: {
        ru: 'Комплексный проект фирменного стиля и визуализации пространства «Каштан»: 3D-моделирование интерьера, брендинг, полиграфия и презентационные рендеры.',
        en: 'Comprehensive branding and architectural visualization for "Kashtan": 3D interior design, brand mark, print materials, and editorial renders.'
      },
      specs: [
        {
          label: { ru: 'Направление', en: 'Discipline' },
          value: { ru: '3D Визуализация & Брендинг', en: '3D Visualization & Branding' }
        },
        {
          label: { ru: 'Носители', en: 'Mediums' },
          value: { ru: 'Интерьер, Мерч, Пространство', en: 'Interior, Merch, Space' }
        },
        {
          label: { ru: 'Софт', en: 'Software' },
          value: 'Blender, Illustrator, Figma'
        }
      ]
    }
  },
  {
    id: 'polyana',
    title: {
      ru: 'Поляна',
      en: 'Polyana'
    },
    realm: 'design',
    type: 'case',
    span: 'vertical', // 2_Polyana_P.png (1064x2129)
    subcategories: ['3D Motion', 'Animation', 'Visual Identity'],
    software: ['blender', 'photoshop'],
    role: {
      ru: '3D & Motion-дизайнер',
      en: '3D & Motion Designer'
    },
    year: '2024',
    cover: '/2_Polyana_P.png',
    fullImage: '/2_Polyana1_F.png',
    videoUrl: '/2_Polyana_F.mp4',
    shortDescription: {
      ru: '3D анимационный проект и визуальный стиль «Поляна»: динамика сцены, свет и моушн-дизайн.',
      en: '3D motion design and animation project "Polyana": dynamic scene lighting, camera choreography, and visual styling.'
    },
    article: {
      overview: {
        ru: '«Поляна» — проект в направлении 3D моушн-дизайна. Проработка стилизованной среды, освещения, анимации элементов и финального видеоролика.',
        en: '"Polyana" is a 3D motion design showcase. Features stylized environment lookdev, lighting mood, motion animation, and final video cut.'
      },
      specs: [
        { label: { ru: 'Формат', en: 'Format' }, value: '3D Motion / Video' },
        { label: { ru: 'Инструменты', en: 'Tools' }, value: 'Blender, Photoshop' }
      ]
    }
  },
  {
    id: 'city-env',
    title: 'City Environment Graphic',
    realm: 'design',
    type: 'shot',
    span: 'horizontal', // 2_env_P.png (1920x1080)
    subcategories: ['3D Visual', 'Graphic Design'],
    software: ['blender', 'photoshop'],
    role: {
      ru: '3D-дизайнер',
      en: '3D Designer'
    },
    year: '2024',
    cover: '/2_env_P.png',
    fullImage: '/2_env_F.png',
    additionalImages: ['/2_sity_env.png'],
    shortDescription: {
      ru: 'Стилизованная 3D городская сцена: пространственная композиция, освещение, текстуры и атмосфера.',
      en: 'Stylized 3D urban environment: spatial composition, architectural lookdev, lighting, and mood.'
    }
  },
  {
    id: 'blender-design',
    title: 'Blender 3D Lookdev',
    realm: 'design',
    type: 'shot',
    span: 'wide', // 2_blender-work.jpg (1935x853)
    subcategories: ['3D Visual', 'Lookdev'],
    software: ['blender'],
    role: {
      ru: '3D-художник',
      en: '3D Artist'
    },
    year: '2024',
    cover: '/2_blender-work.jpg',
    fullImage: '/2_blender-work.jpg',
    shortDescription: {
      ru: 'Экспериментальная 3D визуализация: работа с материалами, светом и глубиной кадра.',
      en: 'Experimental 3D visualization: shading, procedural materials, lighting mood, and depth of field.'
    }
  },
  {
    id: 'discord-identity',
    title: 'Discord Community Identity',
    realm: 'design',
    type: 'shot',
    span: 'square', // 2_discord_logo.png
    subcategories: ['Brand Identity', 'Logo'],
    software: ['illustrator', 'photoshop'],
    role: {
      ru: 'Дизайнер айдентики',
      en: 'Identity Designer'
    },
    year: '2024',
    cover: '/2_discord_logo.png',
    fullImage: '/2_discord_logo.png',
    shortDescription: {
      ru: 'Знак и визуальное оформление сообщества: лаконичная геометрия и иконка.',
      en: 'Brand mark and visual identity for a community: minimal geometry and custom server icon.'
    }
  }
];

export const PROJECTS: Project[] = RAW_PROJECTS.map(p => ({
  ...p,
  cover: getAssetUrl(p.cover),
  fullImage: p.fullImage ? getAssetUrl(p.fullImage) : undefined,
  videoUrl: p.videoUrl ? getAssetUrl(p.videoUrl) : undefined,
  additionalImages: p.additionalImages ? p.additionalImages.map(img => getAssetUrl(img)) : undefined,
  article: p.article ? {
    ...p.article,
    gallery: p.article.gallery ? p.article.gallery.map(g => ({ ...g, url: getAssetUrl(g.url) })) : undefined,
    beforeAfter: p.article.beforeAfter ? {
      ...p.article.beforeAfter,
      beforeImage: getAssetUrl(p.article.beforeAfter.beforeImage),
      afterImage: getAssetUrl(p.article.beforeAfter.afterImage),
    } : undefined
  } : undefined,
}));
