import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function PriceChart({ history }) {
  const data = history.map(h => ({
    time: new Date(h.scraped_at).toLocaleString('en-IN', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    }),
    price: Number(h.price),
    stock: h.stock,
  }));

  return (
    <div style={{ width: '100%', height: 350 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="time" fontSize={11} tick={{ fill: '#94a3b8' }} />
          <YAxis yAxisId="price" fontSize={11} tick={{ fill: '#94a3b8' }} />
          <YAxis yAxisId="stock" orientation="right" fontSize={11} tick={{ fill: '#94a3b8' }} />
          <Tooltip />
          <Legend />
          <Line yAxisId="price" type="monotone" dataKey="price" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="Price (₹)" />
          <Line yAxisId="stock" type="stepAfter" dataKey="stock" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="Stock" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
