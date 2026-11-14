// ============================================================
//  所有可以改的文字和照片都在这个文件里，改完保存，网页会自动刷新
//  Everything you'd want to personalise lives in this file.
// ============================================================

// 开场黑屏上一行一行打出来的字（"..." 是停顿）
// Lines typed out on the black intro screen ("..." = pause)
export const TYPED_LINES = [
  "> 妈妈",
  "...",
  "> 今天是你的生日",
  "...",
  "> 所以我给你做了这个小网页",
  "...",
  "٩(◕‿◕)۶ ٩(◕‿◕)۶ ٩(◕‿◕)۶",
];

// 开场前的提示（电脑 / 手机）
export const START_HINT = "按空格键 或 点一下屏幕 开始";
export const START_HINT_TOUCH = "点一下屏幕 开始";

// 蛋糕出现后的提示 / 按钮文字（电脑 / 手机）
export const BLOW_HINT = "按空格键 或 点下面的按钮 吹灭蜡烛";
export const BLOW_HINT_TOUCH = "点下面的按钮 吹灭蜡烛";
export const BLOW_BUTTON = "🕯️ 吹蜡烛";

// 桌上那条胶片里的照片，按顺序排列。把自己的照片放进 public/ 文件夹，再改这里的文件名。
// thumb = 胶片上的小图（800px 左右就够），full = 点开后的大图（1600px 左右）
// Photos on the film strip: put your own files in public/ and change the names here.
export const FILM_PHOTOS = [
  { thumb: "./film1.jpg", full: "./photo1.jpg" },
  { thumb: "./film2.jpg", full: "./photo2.jpg" },
  { thumb: "./film3.jpg", full: "./photo3.jpg" },
  { thumb: "./film4.jpg", full: "./photo4.jpg" },
  { thumb: "./film5.jpg", full: "./photo5.jpg" },
];
// 蛋糕出现后屏幕顶部的小提示
export const RING_HINT = "点胶片上的照片看大图 · 拖动可以转视角";

// 吹灭蜡烛后弹出的贺卡 / The card that pops up after the candle is blown out
export const CARD = {
  // 贺卡顶部的照片（不想要就改成 ""）
  photo: "./card_photo.jpg",
  title: "亲爱的妈妈",
  // 每一项是一段话 / one entry per paragraph
  paragraphs: [
    "（在这里写你想对妈妈说的话）",
    "谢谢你一直以来的陪伴和支持！",
    "新的一岁，顺顺利利，身体健康！",
  ],
  signature: "爱你的 ××",
  date: "YYYY.MM.DD",
};

// 贺卡在吹灭蜡烛后多少毫秒弹出（先看一会儿烟花）
export const CARD_DELAY_MS = 6000;

// 桌上那张小贺卡的图片（点一下会飞到眼前）
export const TABLE_CARD_IMAGE = "./card.png";

// ------------------------------------------------------------
// 360° 背景 / 360° background
// file：放在 public/ 里的 2:1 全景图（.jpg，或 .hdr）
// fileSmall：可选，手机用的小一号版本（超过 4096 宽的图在手机上容易打不开）
// rotation：水平旋转角度（弧度），决定哪一面对着镜头
// daytime：白天的背景设为 true，烟花会换成在亮背景上更显眼的画法
// 想换成自己的全景图：在 BACKGROUNDS 里加一项，再把 BACKGROUND 改成它的名字
// ------------------------------------------------------------
export type BackgroundSetting = {
  file: string;
  fileSmall?: string;
  rotation: number;
  daytime: boolean;
  backgroundIntensity: number;
  environmentIntensity: number;
  sunIntensity: number;
  sunColor: [number, number, number];
};

export const BACKGROUNDS: Record<string, BackgroundSetting> = {
  // Shanghai Bund at night — "Shanghai Bund" HDRI by Greg Zaal, Poly Haven (CC0)
  shanghai: {
    file: "./shanghai_pano.jpg",
    rotation: 3.3,
    daytime: false,
    backgroundIntensity: 1,
    environmentIntensity: 0.9,
    sunIntensity: 0.5,
    sunColor: [1, 0.9, 0.95],
  },
  // 白天背景的参考设置 / example settings for a daytime panorama:
  // myCity: {
  //   file: "./my_pano_8k.jpg",
  //   fileSmall: "./my_pano_4k.jpg",
  //   rotation: 0,
  //   daytime: true,
  //   backgroundIntensity: 1,
  //   environmentIntensity: 0.7,
  //   sunIntensity: 1.1,
  //   sunColor: [1, 0.97, 0.92],
  // },
};

export const BACKGROUND = "shanghai";
