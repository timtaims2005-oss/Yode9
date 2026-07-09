import { useEffect, useRef } from "react";
import Shepherd from "shepherd.js";
import "shepherd.js/dist/css/shepherd.css";
import "./onboarding-tour.css";

const STORAGE_KEY = "onboarding_completed";

/**
 * Real, DOM-driven onboarding tour built on Shepherd.js.
 * Each step attaches to an actual UI element (marked with a
 * `data-tour="..."` attribute) instead of showing a static
 * carousel disconnected from the app.
 */
export const OnboardingTour: React.FC = () => {
  const tourRef = useRef<InstanceType<typeof Shepherd.Tour> | null>(null);

  useEffect(() => {
    const completed = localStorage.getItem(STORAGE_KEY);
    if (completed) return;

    // Elements are rendered lazily/conditionally (sidebar collapse state,
    // async chunks, etc.) — wait briefly for them to mount before starting.
    const timer = window.setTimeout(() => {
      const tour = new Shepherd.Tour({
        useModalOverlay: true,
        defaultStepOptions: {
          cancelIcon: { enabled: true },
          classes: "mr7-shepherd-step",
          scrollTo: { behavior: "smooth", block: "center" },
          arrow: true,
        },
        exitOnEsc: true,
        keyboardNavigation: true,
      });
      tourRef.current = tour;

      const complete = () => localStorage.setItem(STORAGE_KEY, "true");
      tour.on("complete", complete);
      tour.on("cancel", complete);

      const hasElement = (selector: string) => !!document.querySelector(selector);

      tour.addStep({
        id: "welcome",
        title: "مرحباً بك في KaliGPT",
        text: "أقوى منصة ذكاء اصطناعي للأمن السيبراني. دعنا نأخذك في جولة سريعة على العناصر الحقيقية في الواجهة.",
        buttons: [
          { text: "تخطي", action: tour.cancel, classes: "shepherd-button-secondary" },
          { text: "التالي", action: tour.next },
        ],
      });

      tour.addStep({
        id: "api-keys",
        title: "مفاتيح API",
        text: "قم بإعداد مفاتيح API الخاصة بك في الإعدادات للوصول إلى أفضل نماذج الذكاء الاصطناعي.",
        attachTo: hasElement('[data-tour="settings"]')
          ? { element: '[data-tour="settings"]', on: "top" }
          : undefined,
        buttons: [
          { text: "رجوع", action: tour.back, classes: "shepherd-button-secondary" },
          { text: "التالي", action: tour.next },
        ],
      });

      tour.addStep({
        id: "first-scan",
        title: "أول فحص لك",
        text: "استخدم مركز الأدوات لبدء فحص الكود أو الشبكة بلمسة واحدة.",
        attachTo: hasElement('[data-tour="tools-hub"]')
          ? { element: '[data-tour="tools-hub"]', on: "bottom" }
          : undefined,
        buttons: [
          { text: "رجوع", action: tour.back, classes: "shepherd-button-secondary" },
          { text: "التالي", action: tour.next },
        ],
      });

      tour.addStep({
        id: "advanced-tools",
        title: "الأدوات المتقدمة",
        text: "اكتشف أكثر من 12 أداة متخصصة من OSINT إلى تحليل البرمجيات الخبيثة، كلها من نفس مركز الأدوات.",
        attachTo: hasElement('[data-tour="tools-hub"]')
          ? { element: '[data-tour="tools-hub"]', on: "bottom" }
          : undefined,
        buttons: [
          { text: "رجوع", action: tour.back, classes: "shepherd-button-secondary" },
          { text: "التالي", action: tour.next },
        ],
      });

      tour.addStep({
        id: "start-now",
        title: "ابدأ الآن",
        text: "أنت جاهز تماماً. اكتب رسالتك هنا وابدأ تجربة أمنية لا مثيل لها.",
        attachTo: hasElement('[data-tour="chat-input"]')
          ? { element: '[data-tour="chat-input"]', on: "top" }
          : hasElement('[data-tour="new-chat"]')
            ? { element: '[data-tour="new-chat"]', on: "bottom" }
            : undefined,
        buttons: [
          { text: "رجوع", action: tour.back, classes: "shepherd-button-secondary" },
          { text: "ابدأ الاستخدام", action: tour.complete },
        ],
      });

      tour.start();
    }, 800);

    return () => {
      window.clearTimeout(timer);
      tourRef.current?.complete();
    };
  }, []);

  return null;
};
