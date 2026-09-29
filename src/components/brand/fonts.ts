import { M_PLUS_Rounded_1c, Shippori_Mincho_B1, Zen_Kaku_Gothic_New, Zen_Maru_Gothic } from "next/font/google";

export const zenMaru = Zen_Maru_Gothic({ weight: ["500", "700"], subsets: ["latin"], preload: false, variable: "--font-zen-maru" });
export const zenKaku = Zen_Kaku_Gothic_New({ weight: ["500", "700"], subsets: ["latin"], preload: false, variable: "--font-zen-kaku" });
export const mplusRounded = M_PLUS_Rounded_1c({ weight: ["500", "800"], subsets: ["latin"], preload: false, variable: "--font-mplus-r" });
export const shippori = Shippori_Mincho_B1({ weight: ["500", "700"], subsets: ["latin"], preload: false, variable: "--font-shippori" });
