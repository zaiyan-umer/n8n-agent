"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import axios from "axios";
import { motion } from "motion/react";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthSubmitButton } from "@/components/auth/AuthSubmitButton";

const signupSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters long."),
});

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof signupSchema>) {
    setError(null);
    try {
      await axios.post("/api/auth/register", values);
      router.push("/login");
    } catch (err: any) {
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    }
  }

  return (
    <AuthLayout
      title="Join n8n-agent"
      description="Create an account to deploy intelligent AI workflows."
      footer={
        <>
          Already have an account? <a href="/login" className="ml-1.5 font-medium text-indigo-400 hover:text-indigo-300 transition-colors hover:underline">Log in</a>
        </>
      }
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-300 text-sm font-medium ml-1">Email Address</FormLabel>
                  <FormControl>
                    <Input 
                      className="h-12 px-4 text-base border-white/10 bg-black/40 text-white placeholder:text-slate-500 focus-visible:ring-indigo-500/50" 
                      placeholder="you@example.com" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage className="text-red-400/90" />
                </FormItem>
              )}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-300 text-sm font-medium ml-1">Password</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      className="h-12 px-4 text-base border-white/10 bg-black/40 text-white placeholder:text-slate-500 focus-visible:ring-indigo-500/50" 
                      placeholder="••••••••" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage className="text-red-400/90" />
                </FormItem>
              )}
            />
          </motion.div>

          {error && (
            <motion.p 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-sm font-medium text-red-400 bg-red-400/10 p-2.5 rounded-md text-center border border-red-400/20"
            >
              {error}
            </motion.p>
          )}

          <AuthSubmitButton 
            isSubmitting={form.formState.isSubmitting} 
            text="Sign up" 
            loadingText="Creating account..." 
          />
        </form>
      </Form>
    </AuthLayout>
  );
}
