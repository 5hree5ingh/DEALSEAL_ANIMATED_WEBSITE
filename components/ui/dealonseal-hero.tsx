"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, useInView, useScroll, useTransform, AnimatePresence } from "framer-motion";

/* ──────────────────────────────────────────────
   WebGL Lightning (reused from hero-odyssey)
───────────────────────────────────────────────*/
const Lightning: React.FC<{ hue?: number; speed?: number; intensity?: number; size?: number }> = ({
  hue = 210, speed = 1.4, intensity = 0.5, size = 2,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => { canvas.width = canvas.clientWidth; canvas.height = canvas.clientHeight; };
    resize();
    window.addEventListener("resize", resize);
    const gl = canvas.getContext("webgl");
    if (!gl) return;
    const vs = `attribute vec2 aPosition; void main(){gl_Position=vec4(aPosition,0.,1.);}`;
    const fs = `
      precision mediump float;
      uniform vec2 iResolution; uniform float iTime,uHue,uSpeed,uIntensity,uSize;
      #define N 10
      vec3 hsv(vec3 c){vec3 r=clamp(abs(mod(c.x*6.+vec3(0,4,2),6.)-3.)-1.,0.,1.);return c.z*mix(vec3(1),r,c.y);}
      float h11(float p){p=fract(p*.1031);p*=p+33.33;p*=p+p;return fract(p);}
      float h12(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
      mat2 rot(float t){float c=cos(t),s=sin(t);return mat2(c,-s,s,c);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);float a=h12(i),b=h12(i+vec2(1,0)),c2=h12(i+vec2(0,1)),d=h12(i+vec2(1,1));vec2 t=smoothstep(0.,1.,f);return mix(mix(a,b,t.x),mix(c2,d,t.x),t.y);}
      float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<N;i++){v+=a*noise(p);p*=rot(.45);p*=2.;a*=.5;}return v;}
      void main(){
        vec2 uv=gl_FragCoord.xy/iResolution.xy;uv=2.*uv-1.;uv.x*=iResolution.x/iResolution.y;
        uv+=2.*fbm(uv*uSize+.8*iTime*uSpeed)-1.;
        float d=abs(uv.x);
        vec3 col=hsv(vec3(uHue/360.,.7,.8))*pow(mix(0.,.07,h11(iTime*uSpeed))/d,1.)*uIntensity;
        gl_FragColor=vec4(col,1.);
      }`;
    const compile = (src: string, type: number) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src); gl.compileShader(s); return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(vs, gl.VERTEX_SHADER));
    gl.attachShader(prog, compile(fs, gl.FRAGMENT_SHADER));
    gl.linkProgram(prog); gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const ap = gl.getAttribLocation(prog, "aPosition");
    gl.enableVertexAttribArray(ap); gl.vertexAttribPointer(ap, 2, gl.FLOAT, false, 0, 0);
    const uRes = gl.getUniformLocation(prog, "iResolution");
    const uTime = gl.getUniformLocation(prog, "iTime");
    const uH = gl.getUniformLocation(prog, "uHue");
    const uSp = gl.getUniformLocation(prog, "uSpeed");
    const uIn = gl.getUniformLocation(prog, "uIntensity");
    const uSz = gl.getUniformLocation(prog, "uSize");
    const t0 = performance.now();
    let raf: number;
    const render = () => {
      resize(); gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, (performance.now() - t0) / 1000);
      gl.uniform1f(uH, hue); gl.uniform1f(uSp, speed);
      gl.uniform1f(uIn, intensity); gl.uniform1f(uSz, size);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => { window.removeEventListener("resize", resize); cancelAnimationFrame(raf); };
  }, [hue, speed, intensity, size]);
  return <canvas ref={canvasRef} className="w-full h-full" />;
};

/* ──────────────────────────────────────────────
   Animated Counter
───────────────────────────────────────────────*/
const Counter: React.FC<{ end: number; suffix?: string; duration?: number }> = ({
  end, suffix = "", duration = 2000,
}) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = end / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [inView, end, duration]);
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
};

/* ──────────────────────────────────────────────
   Floating Orb
───────────────────────────────────────────────*/
const FloatingOrb: React.FC<{ className?: string; delay?: number }> = ({ className = "", delay = 0 }) => (
  <motion.div
    className={`absolute rounded-full blur-3xl opacity-20 pointer-events-none ${className}`}
    animate={{ y: [0, -30, 0], scale: [1, 1.05, 1] }}
    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay }}
  />
);

/* ──────────────────────────────────────────────
   Section Wrapper
───────────────────────────────────────────────*/
const FadeIn: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({
  children, delay = 0, className = "",
}) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, ease: "easeOut", delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/* ──────────────────────────────────────────────
   HERO
───────────────────────────────────────────────*/
const HeroSection: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { scrollY } = useScroll();
  const navBg = useTransform(scrollY, [0, 100], ["rgba(0,0,0,0)", "rgba(0,0,0,0.8)"]);

  const navLinks = ["How It Works", "Features", "Trust", "App"];

  return (
    <section id="hero" className="relative w-full min-h-screen bg-black text-white overflow-hidden flex flex-col">
      {/* Background lightning */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black/60 to-black z-10" />
        <Lightning hue={210} speed={1.2} intensity={0.55} size={2.2} />
        {/* Planet – absolute, anchored to bottom-center, half-hidden below fold */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, delay: 0.8 }}
          className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/3 w-[500px] h-[500px] sm:w-[750px] sm:h-[750px] rounded-full z-20"
          style={{
            background: "radial-gradient(circle at 30% 85%, #1e386b 10%, #050d1f 55%, #000000f0 100%)",
            boxShadow: "0 0 120px 40px rgba(59,130,246,0.15), inset 0 0 80px 20px rgba(59,130,246,0.05)",
          }}
        />
      </div>

      {/* Orbs */}
      <FloatingOrb className="w-96 h-96 bg-blue-600 top-20 -left-20" delay={0} />
      <FloatingOrb className="w-72 h-72 bg-cyan-500 top-40 right-10" delay={2} />
      <FloatingOrb className="w-64 h-64 bg-indigo-700 bottom-32 left-1/3" delay={4} />

      {/* Nav */}
      <motion.nav
        style={{ backgroundColor: navBg }}
        className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b border-white/5"
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-3"
          >
            {/* Logo */}
            <div className="w-9 h-9 flex items-center justify-center">
              <Image
                src="/LOGO2.webp"
                alt="DEALonSEAL Logo"
                width={36}
                height={36}
                className="object-contain brightness-0 invert"
                priority
              />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              DEAL<span className="text-white">on</span>SEAL
            </span>
          </motion.div>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link, i) => (
              <motion.a
                key={link}
                href={`#${link.toLowerCase().replace(/\s+/g, "-")}`}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i + 0.3 }}
                className="text-sm text-white hover:text-blue-300 transition-colors duration-200"
              >
                {link}
              </motion.a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <motion.button
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="hidden md:block px-5 py-2.5 text-sm font-medium bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300 hover:scale-105"
            >
              Get the App
            </motion.button>
            <button className="md:hidden text-white" onClick={() => setMenuOpen(!menuOpen)}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {menuOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center gap-8 text-2xl font-light"
          >
            <button className="absolute top-5 right-6" onClick={() => setMenuOpen(false)}>
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {navLinks.map(link => (
              <a key={link} href={`#${link.toLowerCase().replace(/\s+/g, "-")}`} onClick={() => setMenuOpen(false)} className="hover:text-blue-400 transition-colors">{link}</a>
            ))}
            <button className="mt-4 px-8 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full text-base">Get the App</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Content */}
      <div className="relative z-20 flex flex-col items-center justify-center flex-1 px-6 text-center pt-32 pb-36">


        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-5xl sm:text-7xl md:text-8xl font-bold tracking-tight leading-none mb-4"
        >
          DEAL
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-500">
            on
          </span>
          SEAL
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25 }}
          className="text-lg sm:text-xl text-white/60 max-w-xl mb-10 leading-relaxed"
        >
          Buy & sell pre-owned devices with a tamper-proof digital agreement.
          <br className="hidden sm:block" /> No handshakes. No disputes. Just sealed deals.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-4 mb-16"
        >
          <button className="group flex items-center gap-3 px-7 py-3.5 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full font-semibold text-base hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-300 hover:scale-105">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
            </svg>
            App Store
            <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button className="group flex items-center gap-3 px-7 py-3.5 bg-white/5 border border-white/10 rounded-full font-semibold text-base hover:bg-white/10 backdrop-blur-sm transition-all duration-300 hover:scale-105">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3.18 23.76c.31.17.66.24 1.01.19l12.89-7.42-2.99-3-10.91 10.23zM.14 1.96C.05 2.22 0 2.51 0 2.84v18.32c0 .33.06.62.16.87l.09.08 10.26-10.26v-.24L.23 1.87l-.09.09zM20.96 8.58l-2.94-1.7-3.35 3.35 3.35 3.35 2.97-1.71c.85-.49.85-1.29-.03-1.29zM4.19.05L17.08 7.47l-2.99 2.99L4.19.05z" />
            </svg>
            Google Play
          </button>
        </motion.div>


      </div>

    </section>
  );
};

/* ──────────────────────────────────────────────
   HOW IT WORKS
───────────────────────────────────────────────*/
const HowItWorks: React.FC = () => {
  const steps = [
    {
      step: "01",
      icon: (
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      title: "Enter Details",
      desc: "Both buyer and seller fill in their personal info and the device's full specs — model, IMEI, condition, price.",
    },
    {
      step: "02",
      icon: (
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      title: "Capture & Upload",
      desc: "Take photos of the device and both parties. Visual evidence is embedded directly into the digital agreement.",
    },
    {
      step: "03",
      icon: (
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
      title: "OTP Verification",
      desc: "Both parties verify their phone numbers via OTP, providing a double-layer of identity confirmation.",
    },
    {
      step: "04",
      icon: (
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      title: "Sealed Certificate",
      desc: "A professional PDF certificate with a unique QR code is instantly generated. Scan it anytime to verify.",
    },
  ];

  return (
    <section id="how-it-works" className="relative py-32 bg-black text-white overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-blue-950/10 to-black pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6">
        <FadeIn className="text-center mb-20">
          <span className="text-blue-400 text-sm font-semibold tracking-widest uppercase">Process</span>
          <h2 className="mt-3 text-4xl sm:text-5xl font-bold">How It Works</h2>
          <p className="mt-4 text-white/50 max-w-lg mx-auto text-lg">
            Four simple steps to turn a handshake into a legally-credible digital record.
          </p>
        </FadeIn>

        {/* Steps */}
        <div className="relative">
          {/* Connector line */}
          <div className="hidden lg:block absolute top-16 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((s, i) => (
              <FadeIn key={s.step} delay={i * 0.15}>
                <motion.div
                  whileHover={{ y: -8, scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="relative p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-blue-500/40 hover:bg-white/[0.06] transition-colors duration-300 group"
                >
                  {/* Glow on hover */}
                  <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-blue-600/10 to-cyan-500/5 pointer-events-none" />

                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-5">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-600/20 to-cyan-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:border-blue-500/50 transition-colors">
                        {s.icon}
                      </div>
                      <span className="text-5xl font-black text-white/5 group-hover:text-white/10 transition-colors">{s.step}</span>
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{s.title}</h3>
                    <p className="text-sm text-white/50 leading-relaxed">{s.desc}</p>
                  </div>
                </motion.div>
              </FadeIn>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

/* ──────────────────────────────────────────────
   FEATURES
───────────────────────────────────────────────*/
const FeatureIcon: React.FC<{ children: React.ReactNode; color: string }> = ({ children, color }) => (
  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${color}`}>
    {children}
  </div>
);

const Features: React.FC = () => {
  const features = [
    {
      icon: (
        <FeatureIcon color="bg-blue-500/10">
          <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </FeatureIcon>
      ),
      title: "Tamper-Proof Agreements",
      desc: "Every deal is cryptographically sealed. Once generated, the certificate cannot be altered — giving both parties ironclad protection.",
      gradient: "from-blue-600/20 to-blue-800/5",
      border: "border-blue-500/20",
    },
    {
      icon: (
        <FeatureIcon color="bg-cyan-500/10">
          <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </FeatureIcon>
      ),
      title: "Dual OTP Identity Check",
      desc: "Both buyer and seller verify via their registered phone numbers. No fake accounts. No impersonation. Real people, real deals.",
      gradient: "from-cyan-600/20 to-cyan-800/5",
      border: "border-cyan-500/20",
    },
    {
      icon: (
        <FeatureIcon color="bg-indigo-500/10">
          <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </FeatureIcon>
      ),
      title: "Professional PDF Certificate",
      desc: "Instantly generates a beautifully formatted PDF containing all deal details, photos, and both parties' verified information.",
      gradient: "from-indigo-600/20 to-indigo-800/5",
      border: "border-indigo-500/20",
    },
    {
      icon: (
        <FeatureIcon color="bg-violet-500/10">
          <svg className="w-6 h-6 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
        </FeatureIcon>
      ),
      title: "QR Code Verification",
      desc: "Every certificate comes with a unique QR code. Scan it from anywhere to instantly verify the deal's authenticity.",
      gradient: "from-violet-600/20 to-violet-800/5",
      border: "border-violet-500/20",
    },
    {
      icon: (
        <FeatureIcon color="bg-sky-500/10">
          <svg className="w-6 h-6 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </FeatureIcon>
      ),
      title: "Photo Evidence",
      desc: "Device photos and party photos are embedded in the agreement, making it impossible to dispute the condition at time of sale.",
      gradient: "from-sky-600/20 to-sky-800/5",
      border: "border-sky-500/20",
    },
    {
      icon: (
        <FeatureIcon color="bg-teal-500/10">
          <svg className="w-6 h-6 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </FeatureIcon>
      ),
      title: "Instant & Paperless",
      desc: "The entire process takes under 5 minutes. No printing, no scanning, no notary visits. Just open the app and seal the deal.",
      gradient: "from-teal-600/20 to-teal-800/5",
      border: "border-teal-500/20",
    },
  ];

  return (
    <section id="features" className="relative py-32 bg-black text-white">
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
      <FloatingOrb className="w-[600px] h-[600px] bg-blue-900 -right-40 top-20" delay={1} />

      <div className="max-w-7xl mx-auto px-6">
        <FadeIn className="text-center mb-16">
          <span className="text-cyan-400 text-sm font-semibold tracking-widest uppercase">Features</span>
          <h2 className="mt-3 text-4xl sm:text-5xl font-bold">Built for Trust</h2>
          <p className="mt-4 text-white/50 max-w-lg mx-auto text-lg">
            Every feature is designed to eliminate fraud and make second-hand device sales as safe as buying from a store.
          </p>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <FadeIn key={f.title} delay={i * 0.1}>
              <motion.div
                whileHover={{ y: -6 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className={`relative p-7 rounded-2xl bg-gradient-to-br ${f.gradient} border ${f.border} backdrop-blur-sm hover:shadow-xl transition-all duration-300 group overflow-hidden`}
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: "radial-gradient(circle at 50% 0%, rgba(59,130,246,0.08), transparent 70%)" }} />
                <div className="relative z-10">
                  {f.icon}
                  <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                  <p className="text-sm text-white/50 leading-relaxed">{f.desc}</p>
                </div>
              </motion.div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ──────────────────────────────────────────────
   CERTIFICATE PREVIEW
───────────────────────────────────────────────*/
const CertificatePreview: React.FC = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="app" className="relative py-32 bg-black text-white overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <FloatingOrb className="w-[500px] h-[500px] bg-indigo-900 -left-40 top-10" delay={0} />

      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
        {/* Text Side */}
        <FadeIn>
          <span className="text-indigo-400 text-sm font-semibold tracking-widest uppercase">The Certificate</span>
          <h2 className="mt-3 text-4xl sm:text-5xl font-bold leading-tight">
            A Professional Record<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">In Your Pocket</span>
          </h2>
          <p className="mt-5 text-white/50 text-lg leading-relaxed">
            DEALonSEAL generates a beautiful, court-admissible style PDF that includes the complete device history, both parties' verified identities, transaction photos, and a globally-unique QR verification code.
          </p>
          <ul className="mt-8 space-y-3">
            {[
              "Full device specs & IMEI number",
              "Buyer & seller verified identities",
              "Timestamped photos of the device",
              "Unique QR code for instant verification",
              "Digital certificate ID for record keeping",
            ].map(item => (
              <li key={item} className="flex items-center gap-3 text-white/70 text-sm">
                <div className="w-5 h-5 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center shrink-0">
                  <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                {item}
              </li>
            ))}
          </ul>
        </FadeIn>

        {/* Certificate Mockup */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, x: 60, rotateY: -20 }}
          animate={inView ? { opacity: 1, x: 0, rotateY: 0 } : {}}
          transition={{ duration: 0.9, ease: "easeOut" }}
          style={{ perspective: 1000 }}
          className="relative"
        >
          <div className="relative mx-auto max-w-sm">
            {/* Glow behind card */}
            <div className="absolute -inset-10 bg-blue-600/20 rounded-3xl blur-3xl" />
            {/* Card */}
            <div className="relative rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl overflow-hidden shadow-2xl">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-700 to-cyan-600 px-6 py-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-blue-100 tracking-widest uppercase mb-1">Digital Sale Certificate</div>
                    <div className="text-white font-bold text-lg">DEALonSEAL</div>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center p-1">
                    <Image src="/LOGO2.webp" alt="DEALonSEAL" width={40} height={40} className="object-contain" />
                  </div>
                </div>
              </div>
              {/* Body */}
              <div className="p-6 space-y-4">
                <CertRow label="Device" value="iPhone 14 Pro Max" />
                <CertRow label="IMEI" value="35 123456 789012 3" />
                <CertRow label="Condition" value="Excellent – 98%" />
                <CertRow label="Sale Price" value="₹65,000" highlight />
                <div className="pt-4 border-t border-white/10 grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-white/30 mb-1">Seller Verified</div>
                    <div className="text-sm font-medium">Rahul Sharma ✓</div>
                    <div className="text-xs text-white/40">+91 98765 43210</div>
                  </div>
                  <div>
                    <div className="text-xs text-white/30 mb-1">Buyer Verified</div>
                    <div className="text-sm font-medium">Priya Mehta ✓</div>
                    <div className="text-xs text-white/40">+91 87654 32109</div>
                  </div>
                </div>
                {/* QR Placeholder */}
                <div className="pt-4 flex items-center gap-4">
                  <div className="w-20 h-20 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center shrink-0">
                    <QRIcon />
                  </div>
                  <div>
                    <div className="text-xs text-white/30 mb-1">Verification QR</div>
                    <div className="text-xs font-mono text-white/60">DOS-2024-0312-XK7</div>
                    <div className="text-xs text-green-400 mt-1 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                      Verified & Sealed
                    </div>
                  </div>
                </div>
              </div>
              {/* Footer */}
              <div className="px-6 py-3 bg-white/[0.03] border-t border-white/5">
                <div className="text-xs text-white/30 text-center font-mono">28 March 2024 · 14:32:07 IST</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

const CertRow: React.FC<{ label: string; value: string; highlight?: boolean }> = ({ label, value, highlight }) => (
  <div className="flex justify-between items-center">
    <span className="text-xs text-white/30">{label}</span>
    <span className={`text-sm font-medium ${highlight ? "text-cyan-400" : "text-white/80"}`}>{value}</span>
  </div>
);

const QRIcon: React.FC = () => (
  <svg viewBox="0 0 40 40" className="w-14 h-14 text-white/60" fill="currentColor">
    <rect x="2" y="2" width="5" height="5" /><rect x="8" y="2" width="3" height="3" />
    <rect x="2" y="8" width="3" height="3" /><rect x="12" y="2" width="3" height="5" />
    <rect x="17" y="2" width="5" height="5" /><rect x="22" y="2" width="3" height="3" />
    <rect x="26" y="2" width="5" height="5" /><rect x="2" y="17" width="5" height="5" />
    <rect x="8" y="19" width="3" height="3" /><rect x="12" y="17" width="5" height="3" />
    <rect x="19" y="17" width="3" height="5" /><rect x="26" y="17" width="5" height="5" />
    <rect x="2" y="26" width="3" height="5" /><rect x="6" y="26" width="3" height="3" />
    <rect x="12" y="26" width="5" height="5" /><rect x="19" y="22" width="3" height="3" />
    <rect x="23" y="26" width="3" height="5" /><rect x="28" y="24" width="3" height="3" />
  </svg>
);

/* ──────────────────────────────────────────────
   TRUST SECTION
───────────────────────────────────────────────*/
const TrustSection: React.FC = () => {
  const testimonials = [
    {
      quote: "Sold my MacBook to a stranger and felt completely safe. The certificate gave me peace of mind I never had before.",
      name: "Arjun K.",
      role: "Verified Seller · Mumbai",
      stars: 5,
    },
    {
      quote: "Bought a used iPhone and could verify every detail through the QR code. This app is a game changer.",
      name: "Sneha R.",
      role: "Verified Buyer · Bangalore",
      stars: 5,
    },
    {
      quote: "Finally an app that treats second-hand transactions seriously. Professional, fast, and genuinely trustworthy.",
      name: "Dev M.",
      role: "Power User · Delhi",
      stars: 5,
    },
  ];

  return (
    <section id="trust" className="relative py-32 bg-black text-white overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <FloatingOrb className="w-[500px] h-[500px] bg-cyan-900/50 right-0 bottom-0" delay={2} />

      <div className="max-w-7xl mx-auto px-6">
        <FadeIn className="text-center mb-16">
          <span className="text-green-400 text-sm font-semibold tracking-widest uppercase">Trusted By Thousands</span>
          <h2 className="mt-3 text-4xl sm:text-5xl font-bold">Real People, Real Deals</h2>
          <p className="mt-4 text-white/50 max-w-lg mx-auto text-lg">
            Join a growing community of buyers and sellers who chose safety over risk.
          </p>
        </FadeIn>

        <div className="grid md:grid-cols-3 gap-6 mb-20">
          {testimonials.map((t, i) => (
            <FadeIn key={t.name} delay={i * 0.15}>
              <motion.div
                whileHover={{ y: -6 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="p-6 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-white/20 transition-all duration-300"
              >
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.stars }).map((_, j) => (
                    <svg key={j} className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  ))}
                </div>
                <p className="text-white/70 text-sm leading-relaxed mb-5">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-xs font-bold">
                    {t.name[0]}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{t.name}</div>
                    <div className="text-xs text-white/40">{t.role}</div>
                  </div>
                </div>
              </motion.div>
            </FadeIn>
          ))}
        </div>

        {/* Trust Badges */}
        <FadeIn>
          <div className="flex flex-wrap justify-center gap-4">
            {([
              {
                label: "End-to-End Encrypted",
                icon: (
                  <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                ),
              },
              {
                label: "Legally Referenced",
                icon: (
                  <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                  </svg>
                ),
              },
              {
                label: "Zero Data Selling",
                icon: (
                  <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                ),
              },
              {
                label: "Works Offline",
                icon: (
                  <svg className="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8.003 12.408A5 5 0 0112 11a5 5 0 013.997 1.408M5.003 9.169A9 9 0 0112 7a9 9 0 016.997 2.169M2 6l20 20" />
                  </svg>
                ),
              },
            ] as { label: string; icon: React.ReactNode }[]).map(b => (
              <div key={b.label} className="flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white/[0.04] border border-white/10 text-sm text-white/60">
                {b.icon}
                <span>{b.label}</span>
              </div>
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  );
};

/* ──────────────────────────────────────────────
   CTA
───────────────────────────────────────────────*/
const CtaSection: React.FC = () => {
  return (
    <section className="relative py-32 bg-black text-white overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent z-10" />
        <Lightning hue={200} speed={1} intensity={0.35} size={1.8} />
      </div>
      <FloatingOrb className="w-[700px] h-[700px] bg-blue-800/30 left-1/2 -translate-x-1/2 top-0" delay={0} />

      <div className="relative z-20 max-w-3xl mx-auto px-6 text-center">
        <FadeIn>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-sm text-blue-300 mb-8">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            Now Available on iOS & Android
          </div>
          <h2 className="text-4xl sm:text-6xl font-bold mb-6 leading-tight">
            Your Deal.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-500">
              Sealed Forever.
            </span>
          </h2>
          <p className="text-lg text-white/50 mb-12 max-w-xl mx-auto">
            Stop trusting luck. Start trusting DEALonSEAL — the only app that turns a verbal agreement into a verified digital certificate in minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full font-semibold text-base hover:shadow-2xl hover:shadow-blue-500/40 transition-all duration-300"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
              Download on App Store
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center justify-center gap-3 px-8 py-4 bg-white/5 border border-white/10 rounded-full font-semibold text-base hover:bg-white/10 backdrop-blur-sm transition-all duration-300"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3.18 23.76c.31.17.66.24 1.01.19l12.89-7.42-2.99-3-10.91 10.23zM.14 1.96C.05 2.22 0 2.51 0 2.84v18.32c0 .33.06.62.16.87l.09.08 10.26-10.26v-.24L.23 1.87l-.09.09zM20.96 8.58l-2.94-1.7-3.35 3.35 3.35 3.35 2.97-1.71c.85-.49.85-1.29-.03-1.29zM4.19.05L17.08 7.47l-2.99 2.99L4.19.05z" />
              </svg>
              Get on Google Play
            </motion.button>
          </div>
        </FadeIn>
      </div>
    </section>
  );
};

/* ──────────────────────────────────────────────
   FOOTER
───────────────────────────────────────────────*/
const Footer: React.FC = () => (
  <footer className="relative bg-black border-t border-white/[0.06] text-white py-16">
    <div className="max-w-7xl mx-auto px-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-14">
        {/* Brand */}
        <div className="md:col-span-2">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 flex items-center justify-center drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]">
              <Image src="/LOGO2.webp" alt="DEALonSEAL Logo" width={36} height={36} className="object-contain" />
            </div>
            <span className="text-xl font-bold">
              DEAL<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">on</span>SEAL
            </span>
          </div>
          <p className="text-sm text-white/40 max-w-xs leading-relaxed">
            A digital notary for pre-owned device transactions. Making second-hand sales safe, simple, and tamper-proof.
          </p>
        </div>

        {/* Links */}
        <div>
          <div className="text-xs font-semibold text-white/30 tracking-widest uppercase mb-4">Product</div>
          <ul className="space-y-2.5">
            {["How It Works", "Features", "Certificate Preview", "FAQ"].map(l => (
              <li key={l}><a href="#" className="text-sm text-white/50 hover:text-white transition-colors">{l}</a></li>
            ))}
          </ul>
        </div>
        <div>
          <div className="text-xs font-semibold text-white/30 tracking-widest uppercase mb-4">Company</div>
          <ul className="space-y-2.5">
            {["About Us", "Privacy Policy", "Terms of Use", "Contact"].map(l => (
              <li key={l}><a href="#" className="text-sm text-white/50 hover:text-white transition-colors">{l}</a></li>
            ))}
          </ul>
        </div>
      </div>

      <div className="pt-8 border-t border-white/[0.06] flex flex-col sm:flex-row justify-between items-center gap-4">
        <p className="text-xs text-white/25">© 2024 DEALonSEAL. All rights reserved.</p>
        <p className="text-xs text-white/25">Made with ❤️ for safer device transactions</p>
      </div>
    </div>
  </footer>
);

/* ──────────────────────────────────────────────
   ROOT EXPORT
───────────────────────────────────────────────*/
export const DealOnSealWebsite: React.FC = () => (
  <div className="bg-black antialiased overflow-x-hidden">
    <HeroSection />
    <HowItWorks />
    <Features />
    <CertificatePreview />
    <TrustSection />
    <CtaSection />
    <Footer />
  </div>
);
