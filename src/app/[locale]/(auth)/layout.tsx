import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { EspacesWordmark, Logo } from "@/components/logo";

/** Corner frame from the Espaces shape language: an open yellow frame around content. */
function CornerFrame() {
  return (
    <>
      <span aria-hidden className="border-brand-yellow absolute start-0 top-0 size-10 border-s-4 border-t-4" />
      <span aria-hidden className="border-brand-yellow absolute end-0 bottom-0 size-10 border-e-4 border-b-4" />
    </>
  );
}

export default async function AuthLayout({ children }: LayoutProps<"/[locale]">) {
  const t = await getTranslations("common");
  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <section className="bg-brand-black relative flex flex-col justify-between overflow-hidden px-6 py-5 text-white lg:w-[44%] lg:px-12 lg:py-10">
        <div className="flex items-center justify-between">
          <Logo tone="dark" />
          <div className="lg:hidden">
            <Suspense>
              <LanguageSwitcher />
            </Suspense>
          </div>
        </div>
        <div className="relative my-10 hidden max-w-md p-8 lg:block">
          <CornerFrame />
          <p className="font-heading text-brand-yellow text-sm font-bold tracking-[0.2em] uppercase">{t("tagline")}</p>
          <h1 className="font-heading mt-3 text-5xl leading-[1.05] font-extrabold tracking-tight uppercase">{t("appName")}</h1>
          <p className="mt-4 text-base text-white/70">{t("brandLine")}</p>
        </div>
        <EspacesWordmark tone="dark" tagline className="hidden w-40 opacity-80 lg:block" />
        {/* The giant "E." of the brand guidelines, cropped off the edge. */}
        <Image
          src="/brand/espaces-e-yellow.png"
          alt=""
          aria-hidden
          width={370}
          height={600}
          className="pointer-events-none absolute -end-10 -bottom-24 hidden h-[28rem] w-auto opacity-[0.07] lg:block"
        />
      </section>
      <div className="flex flex-1 flex-col">
        <header className="hidden justify-end px-8 py-5 lg:flex">
          <Suspense>
            <LanguageSwitcher />
          </Suspense>
        </header>
        <main className="flex flex-1 items-start justify-center px-4 pt-8 pb-16 sm:items-center sm:pt-0">
          <div className="w-full max-w-sm">{children}</div>
        </main>
      </div>
    </div>
  );
}
