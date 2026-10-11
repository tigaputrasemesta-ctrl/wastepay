'use client';
import { motion } from 'framer-motion';

export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, filter: 'blur(4px)' }}
      transition={{ 
        duration: 0.3,
        ease: [0.16, 1, 0.3, 1] // sleek ease-out
      }}
      className="w-full h-full"
    >
      {children}
    </motion.div>
  );
}
