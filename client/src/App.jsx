import { useEffect, useState } from "react";
import axios from "axios";

export default function App() {
  const [health, setHealth] = useState("checking...");

  useEffect(() => {
    axios
      .get("/api/health")
      .then(({ data }) => setHealth(`API ${data.status}, database ${data.db}`))
      .catch(() => setHealth("API not reachable"));
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="rounded-2xl bg-white p-8 text-center shadow-lg">
        <h1 className="text-2xl font-bold text-indigo-600">Job Portal</h1>
        <p className="mt-2 text-slate-600">{health}</p>
      </div>
    </div>
  );
}