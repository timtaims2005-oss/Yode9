import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Rocket, Shield, Key, Zap, Settings, CheckCircle } from "lucide-react";

const steps = [
  {
    title: "مرحباً بك في KaliGPT",
    description: "أقوى منصة ذكاء اصطناعي للأمن السيبراني. دعنا نأخذك في جولة سريعة.",
    icon: <Rocket className="w-12 h-12 text-blue-500" />,
  },
  {
    title: "مفاتيح API",
    description: "قم بإعداد مفاتيح API الخاصة بك في الإعدادات للوصول إلى أفضل نماذج الذكاء الاصطناعي.",
    icon: <Key className="w-12 h-12 text-yellow-500" />,
  },
  {
    title: "أول فحص لك",
    description: "استخدم أداة تحليل الثغرات لبدء فحص الكود أو الشبكة بلمسة واحدة.",
    icon: <Shield className="w-12 h-12 text-green-500" />,
  },
  {
    title: "الأدوات المتقدمة",
    description: "اكتشف أكثر من 12 أداة متخصصة من OSINT إلى تحليل البرمجيات الخبيثة.",
    icon: <Zap className="w-12 h-12 text-purple-500" />,
  },
  {
    title: "ابدأ الآن",
    description: "أنت جاهز تماماً. استمتع بتجربة أمنية لا مثيل لها.",
    icon: <CheckCircle className="w-12 h-12 text-emerald-500" />,
  }
];

export const OnboardingTour: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const completed = localStorage.getItem('onboarding_completed');
    if (!completed) {
      setOpen(true);
    }
  }, []);

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeTour();
    }
  };

  const completeTour = () => {
    localStorage.setItem('onboarding_completed', 'true');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md bg-[#0a0a0a] border-gray-800 text-white">
        <DialogHeader className="flex flex-col items-center justify-center space-y-4 pt-4">
          <div className="p-4 bg-gray-900 rounded-full">
            {steps[currentStep].icon}
          </div>
          <DialogTitle className="text-2xl font-bold">{steps[currentStep].title}</DialogTitle>
          <DialogDescription className="text-center text-gray-400">
            {steps[currentStep].description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex justify-center space-x-2 py-4">
          {steps.map((_, i) => (
            <div 
              key={i} 
              className={`h-1.5 rounded-full transition-all duration-300 ${i === currentStep ? 'w-8 bg-blue-500' : 'w-2 bg-gray-700'}`}
            />
          ))}
        </div>

        <DialogFooter className="flex sm:justify-between items-center mt-4">
          <Button 
            variant="ghost" 
            onClick={completeTour}
            className="text-gray-500 hover:text-white"
          >
            تخطي
          </Button>
          <Button 
            onClick={nextStep}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8"
          >
            {currentStep === steps.length - 1 ? "ابدأ الاستخدام" : "التالي"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
