export default function Home() {
  return (
    <main style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <h1>01Bank API Server</h1>
      <p>法人融資診断LP用のAPIサーバーです。</p>
      <p>POST /api/diagnosis - 診断データをNotionに保存</p>
    </main>
  );
}
