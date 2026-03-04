"use client"

import { motion } from "framer-motion";
import { Logo } from "@/components/ui/logo";
import { useTranslation } from "@/hooks/use-translation";

export default function Home() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Hero Section - Coming Soon */}
      <section className="relative flex-1 flex items-center justify-center overflow-hidden">
        {/* Animated background decorations */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted">
          <div className="absolute top-20 left-10 w-72 h-72 bg-chart-1 rounded-full filter blur-3xl opacity-15 dark:opacity-30 animate-blob"></div>
          <div className="absolute top-40 right-10 w-72 h-72 bg-chart-2 rounded-full filter blur-3xl opacity-15 dark:opacity-30 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-chart-4 rounded-full filter blur-3xl opacity-15 dark:opacity-30 animate-blob animation-delay-4000"></div>
        </div>

        <div className="container px-4 md:px-6 relative z-10">
          <motion.div
            className="flex flex-col items-center text-center space-y-8 max-w-3xl mx-auto"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <Logo size="lg" />
            </motion.div>

            {/* Coming Soon Title */}
            <motion.h1
              className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-foreground"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <span className="text-gradient-chart-warm">敬请期待</span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              className="text-xl md:text-2xl text-muted-foreground max-w-2xl leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              即将推出
            </motion.p>

            {/* Animated dots */}
            <motion.div
              className="flex items-center space-x-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.8 }}
            >
              <div className="w-3 h-3 bg-chart-1 rounded-full animate-pulse"></div>
              <div className="w-3 h-3 bg-chart-2 rounded-full animate-pulse animation-delay-2000"></div>
              <div className="w-3 h-3 bg-chart-3 rounded-full animate-pulse animation-delay-4000"></div>
            </motion.div>

            {/* Additional message */}
            <motion.p
              className="text-muted-foreground text-sm md:text-base mt-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 1 }}
            >
              我们正在为您准备全新的体验
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-muted/30 border-t">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-muted-foreground text-sm text-center md:text-left">
              {t.home.footer.copyright.replace('{year}', new Date().getFullYear().toString())}
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center hover:bg-muted/50 transition-colors cursor-pointer">
                <span className="text-xs text-foreground">G</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center hover:bg-muted/50 transition-colors cursor-pointer">
                <span className="text-xs text-foreground">T</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center hover:bg-muted/50 transition-colors cursor-pointer">
                <span className="text-xs text-foreground">D</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
