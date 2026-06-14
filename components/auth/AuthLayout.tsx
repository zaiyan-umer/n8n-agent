"use client";

import { ReactNode } from "react";
import { motion } from "motion/react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface AuthLayoutProps {
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}

export function AuthLayout({ title, description, children, footer }: AuthLayoutProps) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black text-slate-50">
      {/* Background Gradients */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/30 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-600/30 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="z-10 w-full max-w-md px-4"
      >
        <Card className="w-full px-2 py-8 overflow-hidden border border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl">
          <CardHeader className="space-y-4 pb-8 text-center">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <CardTitle className="bg-gradient-to-br from-white to-slate-400 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent">
                {title}
              </CardTitle>
            </motion.div>
            <CardDescription className="text-slate-400 text-base">
              {description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {children}
          </CardContent>
          <CardFooter className="flex justify-center border-t border-white/5 bg-white/[0.02] py-5 text-base text-slate-400">
            {footer}
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
