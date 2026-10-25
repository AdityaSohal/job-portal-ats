const ALIASES = new Map(
  Object.entries({
    node: "node.js", nodejs: "node.js", "node js": "node.js", "node.js": "node.js",
    react: "react", reactjs: "react", "react.js": "react", "react js": "react",
    reactnative: "react native", "react native": "react native",
    express: "express", expressjs: "express", "express.js": "express", "express js": "express",
    mongo: "mongodb", "mongo db": "mongodb", mongodb: "mongodb",
    js: "javascript", javascript: "javascript", es6: "javascript", ecmascript: "javascript",
    ts: "typescript", typescript: "typescript",
    postgres: "postgresql", postgre: "postgresql", postgresql: "postgresql",
    k8s: "kubernetes", kubernetes: "kubernetes",
    vue: "vue", vuejs: "vue", "vue.js": "vue",
    next: "next.js", nextjs: "next.js", "next.js": "next.js",
    tailwind: "tailwind css", tailwindcss: "tailwind css", "tailwind css": "tailwind css",
    html5: "html", html: "html", css3: "css", css: "css",
    py: "python", python: "python",
    golang: "go", go: "go",
    ml: "machine learning", "machine learning": "machine learning",
    "amazon web services": "aws", aws: "aws",
    gcp: "google cloud", "google cloud": "google cloud",
    csharp: "c#", "c sharp": "c#", "c#": "c#",
    cpp: "c++", "c++": "c++",
    springboot: "spring boot", "spring boot": "spring boot",
  })
);

export const normalizeSkill = (raw) => {
  const key = String(raw).trim().toLowerCase().replace(/\s+/g, " ");
  return ALIASES.get(key) ?? key;
};

export const normalizeSkills = (list = [], max = 30) =>
  [...new Set(list.map(normalizeSkill).filter(Boolean))].slice(0, max);