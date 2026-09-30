"use client";

import { Numbers } from "@/components/muni/numbers";
import { CouponMarquee } from "@/components/share/coupon-marquee";
import { useCase } from "@/store/useApp";

export default function Page() {
  const c = useCase();
  return (
    <div className="mx-auto max-w-[1080px] space-y-8">
      <CouponMarquee c={c} />
      <Numbers mode="corp" />
    </div>
  );
}
