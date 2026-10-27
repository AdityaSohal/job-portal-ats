import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const label = (date) =>
  new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

// Applications per day, one bar per day
export default function TimelineChart({ data }) {
  return (
    <div className="h-56 w-full" role="img" aria-label="Applications received per day">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#d8d2c4" />
          <XAxis
            dataKey="date"
            tickFormatter={label}
            tick={{ fontSize: 11, fill: "#1b1b1b" }}
            axisLine={{ stroke: "#1b1b1b" }}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={28}
          />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#1b1b1b" }} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: "rgba(15,118,110,0.12)" }}
            labelFormatter={label}
            contentStyle={{ border: "2px solid #1b1b1b", borderRadius: 12, fontSize: 13, fontWeight: 600 }}
          />
          <Bar dataKey="count" name="Applications" fill="#0f766e" stroke="#1b1b1b" strokeWidth={1.5} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}