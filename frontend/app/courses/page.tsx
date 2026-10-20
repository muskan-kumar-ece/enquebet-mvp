"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  ArrowRight, ArrowUpRight, Bookmark, BookOpen, CheckCircle2, ChevronDown,
  Clock3, Code2, Compass, GraduationCap, Layers3, PlayCircle, Search,
  Sparkles, Target, Users, X, Zap, BriefcaseBusiness, Trophy, MonitorPlay,
} from "lucide-react";

type Course = {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  duration: string;
  lessons: number;
  projects: number;
  instructor: string;
  role: string;
  price: "Free" | "Pro";
  accent: string;
  icon: typeof Code2;
  featured?: boolean;
  skills: string[];
  outcome: string;
  curriculum: string[];
};

const COURSES: Course[] = [
  {
    id: "full-stack-build",
    title: "Full-stack products, built for real",
    subtitle: "Go from a blank repo to a deployed product with a real database, auth, and a clean release workflow.",
    category: "Software Engineering", level: "Beginner", duration: "6h 40m", lessons: 24, projects: 2,
    instructor: "ENQUEbet Academy", role: "Builder pathway", price: "Free", accent: "from-blue-500/25 via-indigo-500/10 to-transparent",
    icon: Code2, featured: true, skills: ["Next.js", "APIs", "PostgreSQL"],
    outcome: "Ship a full-stack application with a documented build and deployment trail.",
    curriculum: ["Plan the product and repository", "Build accessible, responsive interfaces", "Design APIs and data models", "Authentication and secure access", "Test, deploy, and document the release"],
  },
  {
    id: "ai-engineering",
    title: "Applied AI engineering",
    subtitle: "Build useful AI features with retrieval, evaluation, structured outputs, and responsible product guardrails.",
    category: "AI & Data", level: "Intermediate", duration: "5h 15m", lessons: 19, projects: 2,
    instructor: "ENQUEbet Academy", role: "Build pathway", price: "Free", accent: "from-violet-500/25 via-fuchsia-500/10 to-transparent",
    icon: Sparkles, skills: ["LLMs", "RAG", "Evaluation"],
    outcome: "Deliver an AI feature with an evaluation set, failure handling, and a clear demo.",
    curriculum: ["Map an AI use case", "Prompt and output design", "Retrieval-augmented generation", "Evaluate quality and failure modes", "Package a demonstrable AI feature"],
  },
  {
    id: "product-design",
    title: "Product thinking for builders",
    subtitle: "Turn a vague idea into a sharp problem statement, prototype, and testable product direction.",
    category: "Product & Design", level: "Beginner", duration: "3h 20m", lessons: 14, projects: 1,
    instructor: "ENQUEbet Academy", role: "Starter pathway", price: "Free", accent: "from-rose-500/25 via-orange-500/10 to-transparent",
    icon: Compass, skills: ["Discovery", "UX", "Prototyping"],
    outcome: "Create a validated product brief and a prototype ready for a build team.",
    curriculum: ["Find the user problem", "Write a useful product brief", "Map the core journey", "Prototype the key interaction", "Run a lightweight usability test"],
  },
  {
    id: "embedded-systems",
    title: "Embedded systems, end to end",
    subtitle: "Connect firmware, sensors, serial debugging, and hardware constraints into a working prototype.",
    category: "Electronics & IoT", level: "Intermediate", duration: "4h 50m", lessons: 17, projects: 2,
    instructor: "ENQUEbet Academy", role: "Hardware pathway", price: "Free", accent: "from-emerald-500/25 via-teal-500/10 to-transparent",
    icon: Zap, skills: ["C/C++", "MCUs", "Debugging"],
    outcome: "Build and document a sensor-based embedded prototype with repeatable tests.",
    curriculum: ["Read a system block diagram", "Firmware structure and peripherals", "Sensor integration", "Serial debugging and test strategy", "Document the working prototype"],
  },
  {
    id: "system-design",
    title: "System design that scales",
    subtitle: "Reason about APIs, queues, caching, consistency, and failure before the architecture becomes expensive.",
    category: "Software Engineering", level: "Advanced", duration: "7h 10m", lessons: 22, projects: 1,
    instructor: "ENQUEbet Academy", role: "Advanced pathway", price: "Pro", accent: "from-cyan-500/25 via-blue-500/10 to-transparent",
    icon: Layers3, skills: ["Architecture", "Caching", "Queues"],
    outcome: "Produce an architecture proposal with trade-offs, bottlenecks, and failure scenarios.",
    curriculum: ["Translate requirements into constraints", "Choose storage and data boundaries", "Design asynchronous workflows", "Plan observability and resilience", "Defend architecture trade-offs"],
  },
  {
    id: "ship-with-github",
    title: "Git, GitHub & team delivery",
    subtitle: "Work like a dependable teammate: branches, pull requests, review, issues, and release notes.",
    category: "Career & Teamwork", level: "Beginner", duration: "2h 45m", lessons: 12, projects: 1,
    instructor: "ENQUEbet Academy", role: "Teamwork pathway", price: "Free", accent: "from-amber-500/25 via-orange-500/10 to-transparent",
    icon: Users, skills: ["Git", "Code review", "Delivery"],
    outcome: "Contribute through a clean pull request and a reviewer-friendly project history.",
    curriculum: ["Understand the Git workflow", "Create focused branches and commits", "Open and review pull requests", "Track work with issues", "Prepare a clean release handoff"],
  },
  {
    id: "data-storytelling",
    title: "Data analysis to decisions",
    subtitle: "Clean a dataset, ask better questions, and turn findings into a clear, defensible recommendation.",
    category: "AI & Data", level: "Beginner", duration: "3h 55m", lessons: 15, projects: 1,
    instructor: "ENQUEbet Academy", role: "Data pathway", price: "Free", accent: "from-sky-500/25 via-cyan-500/10 to-transparent",
    icon: Target, skills: ["Python", "Analysis", "Storytelling"],
    outcome: "Publish a reproducible analysis with a concise decision-focused report.",
    curriculum: ["Frame a decision question", "Inspect and clean data", "Explore patterns and outliers", "Choose useful visualizations", "Write an evidence-led recommendation"],
  },
  {
    id: "portfolio-proof",
    title: "Turn projects into proof",
    subtitle: "Show the decisions, contribution, evidence, and lessons behind the work—not just a polished screenshot.",
    category: "Career & Teamwork", level: "Intermediate", duration: "2h 30m", lessons: 10, projects: 1,
    instructor: "ENQUEbet Academy", role: "Proof pathway", price: "Free", accent: "from-pink-500/25 via-purple-500/10 to-transparent",
    icon: Trophy, skills: ["Portfolio", "Case studies", "Reflection"],
    outcome: "Create a project case study that makes your individual contribution easy to verify.",
    curriculum: ["Choose a meaningful project", "Separate team output from your contribution", "Capture evidence and decisions", "Write a clear case study", "Prepare a walkthrough and reflection"],
  },
];

const CATEGORIES = ["All paths", "Software Engineering", "AI & Data", "Product & Design", "Electronics & IoT", "Career & Teamwork"];

function CourseArtwork({ course, large = false }: { course: Course; large?: boolean }) {
  const Icon = course.icon;
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${course.accent} ${large ? "h-48 sm:h-56" : "h-36"}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(255,255,255,0.12),transparent_32%)]" />
      <div className="absolute -right-8 -top-10 h-40 w-40 rounded-full border border-white/[0.09]" />
      <div className="absolute -right-1 -top-3 h-28 w-28 rounded-full border border-white/[0.10]" />
      <div className="absolute right-8 top-8 h-12 w-12 rounded-2xl border border-white/15 bg-white/[0.06] backdrop-blur-sm rotate-12 flex items-center justify-center">
        <Icon className="h-6 w-6 text-white/90" strokeWidth={1.5} />
      </div>
      <div className="absolute left-5 bottom-4 flex items-center gap-2">
        <span className="rounded-md border border-white/15 bg-black/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/85 backdrop-blur-sm">Builder pathway</span>
        {course.featured && <span className="rounded-md bg-white text-slate-950 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">Featured</span>}
      </div>
      <div className="absolute left-5 top-5 opacity-30"><Icon className="h-8 w-8 text-white" strokeWidth={1.2} /></div>
    </div>
  );
}

function CourseCard({ course, saved, onSave, onOpen }: {
  course: Course; saved: boolean; onSave: (id: string) => void; onOpen: (course: Course) => void;
}) {
  return (
    <article className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d1018] transition-all duration-200 hover:-translate-y-1 hover:border-blue-400/30 hover:shadow-[0_18px_50px_rgba(0,0,0,0.24)]">
      <div className="relative">
        <CourseArtwork course={course} />
        <button
          type="button"
          aria-label={saved ? `Remove ${course.title} from saved courses` : `Save ${course.title}`}
          onClick={() => onSave(course.id)}
          className={`absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl border backdrop-blur-md transition-colors ${saved ? "border-blue-400/40 bg-blue-500/20 text-blue-200" : "border-white/15 bg-black/20 text-white/75 hover:bg-white/10 hover:text-white"}`}
        ><Bookmark className="h-4 w-4" fill={saved ? "currentColor" : "none"} /></button>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium text-blue-300">{course.category}</span>
          <span className={`rounded-md border px-2 py-1 text-[10px] font-semibold ${course.price === "Free" ? "border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-300" : "border-amber-400/20 bg-amber-400/[0.07] text-amber-200"}`}>{course.price === "Free" ? "FREE" : "ENQUEbet PRO"}</span>
        </div>
        <h3 className="text-[17px] font-semibold leading-snug tracking-tight text-white group-hover:text-blue-100">{course.title}</h3>
        <p className="mt-2 line-clamp-3 text-[13px] leading-6 text-slate-400">{course.subtitle}</p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {course.skills.map((skill) => <span key={skill} className="rounded-md border border-white/[0.07] bg-white/[0.025] px-2 py-1 text-[10px] text-slate-300">{skill}</span>)}
        </div>
        <div className="mt-5 flex items-center gap-3 border-t border-white/[0.07] pt-4 text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5"><PlayCircle className="h-3.5 w-3.5" />{course.lessons} lessons</span>
          <span className="flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" />{course.duration}</span>
          <span className="ml-auto rounded-full bg-white/[0.05] px-2 py-1 text-slate-300">{course.level}</span>
        </div>
        <button onClick={() => onOpen(course)} className="mt-4 flex w-full items-center justify-between rounded-xl border border-white/[0.09] bg-white/[0.025] px-3.5 py-3 text-sm font-semibold text-white transition-colors hover:border-blue-400/30 hover:bg-blue-500/[0.07]">
          Explore curriculum <ArrowUpRight className="h-4 w-4 text-slate-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </button>
      </div>
    </article>
  );
}

export default function CoursesPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All paths");
  const [level, setLevel] = useState("All levels");
  const [sort, setSort] = useState("Recommended");
  const [savedOnly, setSavedOnly] = useState(false);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("enquebet-saved-courses");
      if (stored) setSavedIds(JSON.parse(stored));
    } catch { /* Ignore invalid local preference data. */ }
  }, []);

  const toggleSave = (id: string) => {
    setSavedIds((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      try { window.localStorage.setItem("enquebet-saved-courses", JSON.stringify(next)); } catch { /* Storage may be unavailable. */ }
      toast.success(next.includes(id) ? "Saved to your learning list" : "Removed from your learning list");
      return next;
    });
  };

  const filteredCourses = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = COURSES.filter((course) => {
      const matchesQuery = !q || [course.title, course.subtitle, course.category, ...course.skills].some((value) => value.toLowerCase().includes(q));
      const matchesCategory = category === "All paths" || course.category === category;
      const matchesLevel = level === "All levels" || course.level === level;
      const matchesSaved = !savedOnly || savedIds.includes(course.id);
      return matchesQuery && matchesCategory && matchesLevel && matchesSaved;
    });
    if (sort === "Shortest first") return [...list].sort((a, b) => a.lessons - b.lessons);
    if (sort === "Advanced first") return [...list].sort((a, b) => ["Beginner", "Intermediate", "Advanced"].indexOf(b.level) - ["Beginner", "Intermediate", "Advanced"].indexOf(a.level));
    return list;
  }, [query, category, level, sort, savedOnly, savedIds]);

  const featured = COURSES.find((course) => course.featured)!;

  return (
    <main className="min-h-screen bg-[#090a0f] text-slate-100">
      <div className="pointer-events-none fixed inset-0 -z-0 bg-[radial-gradient(ellipse_at_50%_-15%,rgba(24,100,255,0.13),transparent_50%)]" />
      <div className="relative mx-auto max-w-[1500px] px-4 pb-16 pt-7 sm:px-6 lg:px-10 lg:pt-10">
        <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.17em] text-slate-500">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-blue-400/20 bg-blue-500/10 text-blue-300"><GraduationCap className="h-4 w-4" /></span>
            ENQUEbet Academy <span className="text-slate-700">/</span> Learn to build
          </div>
          <div className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.025] px-3 py-1.5 text-[11px] text-slate-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Learning paths preview
          </div>
        </div>

        <section className="relative overflow-hidden rounded-[28px] border border-white/[0.09] bg-[#0c101a]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_35%,rgba(24,100,255,0.18),transparent_28%),radial-gradient(circle_at_58%_100%,rgba(124,58,237,0.10),transparent_38%)]" />
          <div className="absolute right-[-3rem] top-[-6rem] hidden h-[28rem] w-[28rem] rounded-full border border-blue-300/[0.08] lg:block" />
          <div className="absolute right-[-1rem] top-[-4rem] hidden h-[24rem] w-[24rem] rounded-full border border-blue-300/[0.09] lg:block" />
          <div className="relative grid gap-8 p-6 sm:p-9 lg:grid-cols-[1.2fr_0.8fr] lg:items-center lg:px-12 lg:py-12">
            <div className="max-w-2xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-400/[0.07] px-3 py-1.5 text-[11px] font-semibold tracking-wide text-blue-200">
                <Sparkles className="h-3.5 w-3.5" /> LEARN WITH PURPOSE. BUILD WITH PROOF.
              </div>
              <h1 className="max-w-xl text-4xl font-semibold leading-[1.08] tracking-[-0.045em] text-white sm:text-5xl lg:text-[58px]">
                Don&apos;t just learn it.<br /><span className="bg-gradient-to-r from-blue-300 via-sky-200 to-violet-300 bg-clip-text text-transparent">Build something real.</span>
              </h1>
              <p className="mt-5 max-w-xl text-sm leading-7 text-slate-400 sm:text-base">
                Practical courses for people who make things. Learn a skill, apply it in a project, collaborate with builders, and turn your work into proof you can show.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <button onClick={() => document.getElementById("course-catalog")?.scrollIntoView({ behavior: "smooth" })} className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-blue-50">
                  Explore learning paths <ArrowRight className="h-4 w-4" />
                </button>
                <button onClick={() => { setCategory("All paths"); setLevel("All levels"); setSavedOnly(false); setQuery(""); document.getElementById("course-catalog")?.scrollIntoView({ behavior: "smooth" }); }} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.07]">
                  <Compass className="h-4 w-4" /> Find your path
                </button>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-slate-500">
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Free core paths</span>
                <span className="flex items-center gap-1.5"><MonitorPlay className="h-3.5 w-3.5 text-blue-300" /> Lessons + practical tasks</span>
                <span className="flex items-center gap-1.5"><Trophy className="h-3.5 w-3.5 text-violet-300" /> Project-first learning</span>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-md lg:ml-auto">
              <div className="absolute -inset-5 rounded-[30px] bg-blue-500/[0.08] blur-2xl" />
              <div className="relative overflow-hidden rounded-2xl border border-white/[0.12] bg-[#101522]/90 shadow-2xl shadow-black/30">
                <CourseArtwork course={featured} large />
                <div className="p-5 sm:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-300">Start here · Featured path</span>
                    <span className="rounded-md border border-emerald-400/20 bg-emerald-400/[0.08] px-2 py-1 text-[10px] font-bold text-emerald-300">FREE</span>
                  </div>
                  <h2 className="mt-3 text-xl font-semibold tracking-tight text-white">{featured.title}</h2>
                  <p className="mt-2 text-xs leading-6 text-slate-400">{featured.subtitle}</p>
                  <div className="mt-4 flex items-center gap-4 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5" /> {featured.lessons} lessons</span>
                    <span className="flex items-center gap-1.5"><BriefcaseBusiness className="h-3.5 w-3.5" /> {featured.projects} projects</span>
                    <span className="flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" /> {featured.duration}</span>
                  </div>
                  <button onClick={() => setSelectedCourse(featured)} className="mt-5 flex w-full items-center justify-between rounded-xl border border-blue-400/20 bg-blue-500/[0.09] px-4 py-3 text-sm font-semibold text-blue-100 transition hover:bg-blue-500/[0.15]">
                    Preview this path <ArrowUpRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="absolute -bottom-4 -left-4 hidden items-center gap-3 rounded-xl border border-white/10 bg-[#141925] px-4 py-3 shadow-xl sm:flex">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-300"><Target className="h-4 w-4" /></div>
                <div><p className="text-xs font-semibold text-white">Outcome-focused</p><p className="mt-0.5 text-[10px] text-slate-500">Every path ends in something built</p></div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { icon: PlayCircle, title: "Learn", copy: "Short lessons that focus on useful skills.", number: "01" },
            { icon: Code2, title: "Practice & build", copy: "Apply concepts through tasks and real projects.", number: "02" },
            { icon: Trophy, title: "Prove your work", copy: "Prepare evidence to share with your builder profile.", number: "03" },
          ].map((step) => (
            <div key={step.title} className="flex items-start gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.018] p-4 sm:p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-400/15 bg-blue-500/[0.08] text-blue-300"><step.icon className="h-4.5 w-4.5" /></div>
              <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h3 className="text-sm font-semibold text-slate-100">{step.title}</h3><span className="text-[10px] font-mono text-slate-600">{step.number}</span></div><p className="mt-1 text-xs leading-5 text-slate-500">{step.copy}</p></div>
            </div>
          ))}
        </section>

        <section id="course-catalog" className="scroll-mt-8 pt-12">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-300"><Layers3 className="h-3.5 w-3.5" /> The learning library</div>
              <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Choose what you want to build next.</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Browse practical pathways across software, AI, electronics, product design, and the skills that make teams stronger.</p>
            </div>
            <div className="flex shrink-0 items-center gap-2 text-xs text-slate-500"><BookOpen className="h-4 w-4" /><span>{filteredCourses.length} paths to explore</span></div>
          </div>

          <div className="mt-6 rounded-2xl border border-white/[0.08] bg-[#0d1017] p-3 sm:p-4">
            <div className="flex flex-col gap-3 lg:flex-row">
              <label className="relative min-w-0 flex-1">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search skills, topics, or learning paths..." className="h-11 w-full rounded-xl border border-white/[0.08] bg-[#090b11] pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-400/40 focus:ring-2 focus:ring-blue-500/10" />
              </label>
              <div className="flex flex-wrap gap-2">
                <label className="relative">
                  <span className="sr-only">Filter by level</span>
                  <select value={level} onChange={(event) => setLevel(event.target.value)} className="h-11 appearance-none rounded-xl border border-white/[0.08] bg-[#090b11] py-2 pl-3 pr-9 text-xs text-slate-300 outline-none focus:border-blue-400/40">
                    <option>All levels</option><option>Beginner</option><option>Intermediate</option><option>Advanced</option>
                  </select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                </label>
                <label className="relative">
                  <span className="sr-only">Sort courses</span>
                  <select value={sort} onChange={(event) => setSort(event.target.value)} className="h-11 appearance-none rounded-xl border border-white/[0.08] bg-[#090b11] py-2 pl-3 pr-9 text-xs text-slate-300 outline-none focus:border-blue-400/40">
                    <option>Recommended</option><option>Shortest first</option><option>Advanced first</option>
                  </select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                </label>
                <button onClick={() => setSavedOnly((current) => !current)} className={`inline-flex h-11 items-center gap-2 rounded-xl border px-3 text-xs font-medium transition ${savedOnly ? "border-blue-400/30 bg-blue-500/10 text-blue-200" : "border-white/[0.08] bg-[#090b11] text-slate-400 hover:text-white"}`}><Bookmark className="h-3.5 w-3.5" fill={savedOnly ? "currentColor" : "none"} /> Saved</button>
              </div>
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {CATEGORIES.map((item) => <button key={item} onClick={() => setCategory(item)} className={`shrink-0 rounded-lg border px-3 py-2 text-[11px] font-medium transition ${category === item ? "border-blue-400/25 bg-blue-500/10 text-blue-200" : "border-transparent text-slate-500 hover:border-white/[0.07] hover:bg-white/[0.025] hover:text-slate-200"}`}>{item}</button>)}
            </div>
          </div>

          {filteredCourses.length ? (
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredCourses.map((course) => <CourseCard key={course.id} course={course} saved={savedIds.includes(course.id)} onSave={toggleSave} onOpen={setSelectedCourse} />)}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-white/10 bg-white/[0.015] px-6 py-14 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-slate-400"><Search className="h-5 w-5" /></div>
              <h3 className="mt-4 text-base font-semibold text-white">No paths found</h3>
              <p className="mt-1 text-sm text-slate-500">Try another search or clear a filter to see more learning paths.</p>
              <button onClick={() => { setQuery(""); setCategory("All paths"); setLevel("All levels"); setSavedOnly(false); }} className="mt-4 rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-white/[0.05]">Clear filters</button>
            </div>
          )}
        </section>

        <section className="mt-12 overflow-hidden rounded-2xl border border-blue-400/15 bg-gradient-to-r from-blue-500/[0.09] via-[#101421] to-violet-500/[0.07] p-6 sm:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-300/20 bg-blue-400/10 text-blue-200"><Users className="h-5 w-5" /></div>
              <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-300">Learning is only the beginning</p><h2 className="mt-2 text-xl font-semibold tracking-tight text-white sm:text-2xl">Your next step should be something you build.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">ENQUEbet is built around turning skills into collaboration, shipped projects, and evidence of your contribution.</p></div>
            </div>
            <button onClick={() => toast("Project-linked learning is planned for the next Academy phase.")} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.09]">How learning connects to projects <ArrowRight className="h-4 w-4" /></button>
          </div>
        </section>
        <p className="mt-6 text-center text-[10px] text-slate-600">Academy preview · Course discovery and saved paths are interactive. Enrollment, lesson playback, submissions, and verified proof will be connected in the next implementation phases.</p>
      </div>

      {selectedCourse && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedCourse(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="course-dialog-title" className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-white/10 bg-[#0d111b] shadow-2xl sm:rounded-3xl">
            <div className="relative"><CourseArtwork course={selectedCourse} large /><button onClick={() => setSelectedCourse(null)} aria-label="Close course details" className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-black/30 text-white hover:bg-black/50"><X className="h-4 w-4" /></button></div>
            <div className="p-5 sm:p-7">
              <div className="flex flex-wrap items-center gap-2 text-[11px]"><span className="text-blue-300">{selectedCourse.category}</span><span className="text-slate-700">•</span><span className="text-slate-400">{selectedCourse.level}</span><span className="text-slate-700">•</span><span className="text-slate-400">{selectedCourse.duration}</span></div>
              <h2 id="course-dialog-title" className="mt-3 text-2xl font-semibold tracking-tight text-white">{selectedCourse.title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-400">{selectedCourse.subtitle}</p>
              <div className="mt-5 rounded-xl border border-emerald-400/15 bg-emerald-400/[0.045] p-4"><p className="flex items-center gap-2 text-xs font-semibold text-emerald-300"><Target className="h-4 w-4" /> What you&apos;ll build toward</p><p className="mt-2 text-sm leading-6 text-slate-300">{selectedCourse.outcome}</p></div>
              <div className="mt-6"><h3 className="text-sm font-semibold text-white">Curriculum preview</h3><div className="mt-3 space-y-2">{selectedCourse.curriculum.map((item, index) => <div key={item} className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-[10px] font-semibold text-slate-400">{String(index + 1).padStart(2, "0")}</span><span className="pt-0.5 text-sm text-slate-300">{item}</span><CheckCircle2 className="ml-auto mt-1 h-4 w-4 shrink-0 text-slate-700" /></div>)}</div></div>
              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button onClick={() => { toggleSave(selectedCourse.id); }} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-white/[0.04]"><Bookmark className="h-4 w-4" /> Save path</button><button onClick={() => toast("Enrollment will be enabled when the learning API is connected.")} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-950 hover:bg-blue-50">Join this path <ArrowRight className="h-4 w-4" /></button></div>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
